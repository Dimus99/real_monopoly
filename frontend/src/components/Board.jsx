import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Tile from './Tile';
import ToastNotification from './ToastNotification';

const getTileStyle = (index) => {
    let row, col;

    // Top Row (0 -> 10): GO is at position 0, Top-Left
    if (index >= 0 && index <= 10) {
        row = 1;
        col = 1 + index; // 0=>1, 10=>11
    }
    // Right Col (11 -> 20): Moves Down
    else if (index >= 11 && index <= 19) {
        col = 11;
        row = 1 + (index - 10); // 11=>2, 19=>10
    }
    // Bottom Row (20 -> 30): Moves Left
    else if (index >= 20 && index <= 30) {
        row = 11;
        col = 11 - (index - 20); // 20=>11, 30=>1
    }
    // Left Col (31 -> 39): Moves Up
    else if (index >= 31 && index <= 39) {
        col = 1;
        row = 11 - (index - 30); // 31=>10, 39=>2
    }

    return {
        gridRowStart: row,
        gridRowEnd: row + 1,
        gridColumnStart: col,
        gridColumnEnd: col + 1,
    };
};

// Tile images mapping
const TILE_IMAGES = {
    'Moscow': '/tiles/moscow.png',
    'Washington': '/tiles/washington.png',
    'Kyiv': '/tiles/kyiv.png',
    'Beijing': '/tiles/beijing.png',
    'Greenland': '/tiles/greenland.png'
};

// Character colors for player tokens
const PLAYER_COLORS = {
    Putin: '#C41E3A',
    Trump: '#FF6B35',
    Zelensky: '#0057B8',
    Kim: '#8B0000',
    Biden: '#3C3B6E',
    Xi: '#DE2910'
};

// Character data for avatars
const CHARACTERS = {
    Putin: { avatar: '/avatars/putin.png', color: '#C41E3A' },
    Trump: { avatar: '/avatars/trump.png', color: '#FF6B35' },
    Zelensky: { avatar: '/avatars/zelensky.png', color: '#0057B8' },
    Kim: { avatar: '/avatars/kim.png', color: '#8B0000' },
    Biden: { avatar: '/avatars/biden.png', color: '#3C3B6E' },
    Xi: { avatar: '/avatars/xi.png', color: '#DE2910' }
};

// Get absolute pixel coordinates for a tile position
const getTileCoordinates = (tileId, boardRef) => {
    if (!boardRef?.current) return { x: 0, y: 0 };

    const boardElement = boardRef.current;
    const boardRect = boardElement.getBoundingClientRect();
    const gridStyle = getTileStyle(tileId);
    const GRID_GAP = 2; // Must match CSS

    // Grid configuration must match CSS: 1.4fr - 1fr * 9 - 1.4fr
    const totalUnits = 1.4 + 9 + 1.4; // 11.8

    // Calculate unit size (subtracting gaps)
    // 11 columns means 10 gaps
    const availableWidth = boardRect.width - (10 * GRID_GAP);
    const availableHeight = boardRect.height - (10 * GRID_GAP);

    const unitX = availableWidth / totalUnits;
    const unitY = availableHeight / totalUnits;

    const getCoordinate = (index, unitSize) => {
        // index is 1-based grid index
        let pos = 0;

        // Add width of preceding columns/rows + gaps
        for (let i = 1; i < index; i++) {
            if (i === 1 || i === 11) pos += 1.4 * unitSize;
            else pos += 1 * unitSize;

            // Add gap after every column/row
            pos += GRID_GAP;
        }

        // Add half of current column/row
        const currentSize = (index === 1 || index === 11) ? 1.4 : 1;
        pos += (currentSize * unitSize) / 2;

        return pos;
    };

    const x = getCoordinate(gridStyle.gridColumnStart, unitX);
    const y = getCoordinate(gridStyle.gridRowStart, unitY);

    return { x, y };
};

import PropertyDetailView from './PropertyModal';

const Board = ({ tiles, players, onTileClick, mapType, currentPlayerId, logs, onSendMessage }) => {
    const [hoveredTileId, setHoveredTileId] = React.useState(null);
    const boardRef = useRef(null);
    const [playerPositions, setPlayerPositions] = useState({});
    const prevPositionsRef = useRef({});
    const lastPositionsRef = useRef({});
    const [animatedPaths, setAnimatedPaths] = useState({});

    // Calculate full path for animation along board edges
    const calculatePath = (start, end) => {
        if (start === end) return [end];
        const path = [];
        let current = start;
        // Max 40 steps to avoid infinite loop
        let safety = 0;
        while (current !== end && safety < 40) {
            current = (current + 1) % 40;
            path.push(current);
            safety++;
        }
        return path;
    };

    // Handler for tile interactions
    const handleTileInteraction = (id, type) => {
        if (type === 'hover') {
            setHoveredTileId(id);
        } else if (type === 'leave') {
            setHoveredTileId(null);
        } else if (type === 'click') {
            onTileClick(id); // Pass actual clicks up
        }
    };

    // Track player position changes for animation
    useEffect(() => {
        if (!players || !boardRef.current) return;

        const updatePositions = () => {
            if (!boardRef.current) return;

            const newPositions = {};
            const newPaths = {};

            Object.values(players).forEach(p => {
                const position = p.position !== undefined ? p.position : 0;
                const prevP = lastPositionsRef.current[p.id];
                const prevPosition = prevP?.position ?? position;

                // Calculate path if moved
                if (prevPosition !== position) {
                    const path = calculatePath(prevPosition, position);
                    newPaths[p.id] = path.map(pos => getTileCoordinates(pos, boardRef));
                }

                const coords = getTileCoordinates(position, boardRef);
                if (coords.x > 0 || coords.y > 0 || position === 0) {
                    newPositions[p.id] = {
                        ...coords,
                        position: position,
                        character: p.character,
                        name: p.name
                    };
                }
            });

            prevPositionsRef.current = { ...lastPositionsRef.current };
            lastPositionsRef.current = newPositions;
            setPlayerPositions(newPositions);
            setAnimatedPaths(newPaths);
        };

        // Wait for next frame to ensure board is rendered
        const timeoutId = setTimeout(updatePositions, 100);

        return () => clearTimeout(timeoutId);
    }, [players]);

    // Update positions on window resize
    useEffect(() => {
        if (!players || !boardRef.current) return;

        const handleResize = () => {
            const newPositions = {};
            Object.values(players).forEach(p => {
                const coords = getTileCoordinates(p.position, boardRef);
                newPositions[p.id] = {
                    ...coords,
                    position: p.position,
                    character: p.character,
                    name: p.name
                };
            });
            setPlayerPositions(newPositions);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [players]);

    // Group players by tile position (for static display)
    const playersByTile = {};
    if (players) {
        Object.values(players).forEach(p => {
            if (!playersByTile[p.position]) playersByTile[p.position] = [];
            playersByTile[p.position].push({
                ...p,
                displayColor: PLAYER_COLORS[p.character] || p.color
            });
        });
    }

    return (
        <div ref={boardRef} className="board-grid relative">
            {/* Animated Player Avatars */}
            {Object.entries(playerPositions).map(([playerId, pos]) => {
                const player = players?.[playerId];
                if (!player || pos.x === undefined || pos.y === undefined || (pos.x === 0 && pos.y === 0)) {
                    if (player && player.position !== undefined) return null;
                    return null;
                }

                const char = CHARACTERS[player.character] || {};
                const prevPos = prevPositionsRef.current[playerId];
                const isMoving = prevPos && prevPos.position !== undefined && (prevPos.position !== pos.position);

                // Calculate offset if multiple players are on the same tile
                const playersOnTile = playersByTile[pos.position] || [];
                const indexOnTile = playersOnTile.findIndex(p => p.id === playerId);
                const totalOnTile = playersOnTile.length;

                let offsetX = 0;
                let offsetY = 0;

                if (totalOnTile > 1) {
                    const radius = 22; // Increased radius for larger icons
                    const angle = (2 * Math.PI * indexOnTile) / totalOnTile;
                    offsetX = Math.cos(angle) * radius;
                    offsetY = Math.sin(angle) * radius;
                }

                const pathCoords = animatedPaths[playerId];
                const hasPath = pathCoords && pathCoords.length > 0;

                return (
                    <motion.div
                        key={playerId}
                        initial={isMoving && prevPos ? {
                            x: prevPos.x + offsetX,
                            y: prevPos.y + offsetY
                        } : {
                            x: pos.x + offsetX,
                            y: pos.y + offsetY
                        }}
                        animate={hasPath ? {
                            x: pathCoords.map(c => c.x + offsetX),
                            y: pathCoords.map(c => c.y + offsetY)
                        } : {
                            x: pos.x + offsetX,
                            y: pos.y + offsetY
                        }}
                        transition={hasPath ? {
                            duration: pathCoords.length * 0.15,
                            ease: "linear",
                            times: pathCoords.map((_, i) => (i + 1) / pathCoords.length)
                        } : {
                            type: "spring",
                            stiffness: 120,
                            damping: 15
                        }}
                        className="absolute pointer-events-none flex items-center justify-center"
                        style={{
                            left: 0,
                            top: 0,
                            width: '44px',
                            height: '44px',
                            zIndex: 50 + indexOnTile,
                            transform: 'translate(-50%, -50%)',
                            maxWidth: '44px',
                            maxHeight: '44px'
                        }}
                    >
                        {/* Shadow/Glow effect */}
                        <div
                            className="absolute rounded-full blur-[3px]"
                            style={{
                                width: '36px',
                                height: '36px',
                                background: playerId === currentPlayerId ? (char.color || '#FFD700') : 'rgba(0,0,0,0.5)',
                                opacity: 0.6,
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)'
                            }}
                        />

                        {/* Avatar Image */}
                        <motion.img
                            src={char.avatar || '/avatars/putin.png'}
                            alt={player.name}
                            style={{
                                width: '40px',
                                height: '40px',
                                minWidth: '40px',
                                maxWidth: '40px',
                                minHeight: '40px',
                                maxHeight: '40px',
                                borderRadius: '50%',
                                border: `2px solid ${char.color || '#fff'}`,
                                position: 'relative',
                                zIndex: 2,
                                objectFit: 'cover',
                                display: 'block',
                                backgroundColor: '#1a1a2e',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                            animate={isMoving ? {
                                scale: [1, 1.2, 1],
                                y: [0, -5, 0]
                            } : {
                                scale: playerId === currentPlayerId ? [1, 1.1, 1] : 1
                            }}
                            transition={isMoving ? {
                                duration: 0.5,
                                times: [0, 0.5, 1]
                            } : {
                                duration: 2,
                                repeat: Infinity,
                                repeatType: "reverse"
                            }}
                        />
                    </motion.div>
                );
            })}
            {/* Center Map Area */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
                className="board-center flex items-center justify-center p-4 relative"
            >
                <div className={`relative z-10 text-center transition-opacity duration-300 ${hoveredTileId ? 'opacity-0' : 'opacity-100'}`}>
                    <motion.h1
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="font-display text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg"
                    >
                        {mapType === 'Ukraine' ? 'UKRAINE' : 'WORLD'}
                    </motion.h1>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-xl md:text-2xl font-display text-yellow-400 mt-2"
                    >
                        MONOPOLY
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="text-sm text-gray-400 mt-4"
                    >
                        Satire Edition
                    </motion.div>

                    {/* Animated globe or map icon */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                        className="absolute -z-10 inset-0 flex items-center justify-center opacity-10"
                    >
                        <div className="text-[200px]">🌍</div>
                    </motion.div>
                </div>

                {/* Center Content: Either Property Details or Chat/Logs */}
                <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                    {hoveredTileId ? (
                        <div className="w-full h-full pointer-events-none p-4">
                            <PropertyDetailView
                                property={tiles.find(t => t.id === hoveredTileId)}
                                players={players}
                                canBuy={false} // Hover view is just for info
                            />
                        </div>
                    ) : null}
                </div>

                {/* Log Panel / Chat - Positioned at the very bottom edge of inner area */}
                {!hoveredTileId && (
                    <div className="absolute bottom-0 left-0 right-0 z-30 w-full flex flex-col justify-end pointer-events-none p-2">
                        <div className="pointer-events-auto w-full max-w-[800px] mx-auto">
                            <ToastNotification logs={logs} onSendMessage={onSendMessage} />
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Render all tiles */}
            {tiles.map((tile, index) => (
                <motion.div
                    key={tile.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                >
                    <Tile
                        property={tile}
                        style={getTileStyle(tile.id)}
                        playersHere={playersByTile[tile.id]}
                        onClick={handleTileInteraction}
                        image={TILE_IMAGES[tile.name]}
                        isCorner={[0, 10, 20, 30].includes(tile.id)}
                        currentPlayerId={currentPlayerId}
                    />
                </motion.div>
            ))}
        </div>
    );
};

export default Board;
