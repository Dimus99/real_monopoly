import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tile from './Tile';
import ToastNotification from './ToastNotification';
import { CHARACTERS as BOARD_CHARACTERS } from '../constants/characters';
import PropertyModal from './PropertyModal';

const getTileStyle = (index) => {
    // 40 tiles total (11x11 grid)
    // Corners: 0, 10, 20, 30
    // Sides: 1-9, 11-19, 21-29, 31-39

    // Top Row (0 to 10): Row 1, Col 1 -> 11
    if (index >= 0 && index <= 10) {
        return { gridRowStart: 1, gridColumnStart: 1 + index };
    }

    // Right Column (11 to 20): Col 11, Row 2 -> 11
    if (index >= 11 && index <= 20) {
        return { gridRowStart: 1 + (index - 10), gridColumnStart: 11 };
    }

    // Bottom Row (21 to 30): Row 11, Col 10 -> 1
    if (index >= 21 && index <= 30) {
        return { gridRowStart: 11, gridColumnStart: 11 - (index - 20) };
    }

    // Left Column (31 to 39): Col 1, Row 10 -> 2
    if (index >= 31 && index <= 39) {
        return { gridRowStart: 11 - (index - 30), gridColumnStart: 1 };
    }

    return { gridRowStart: 1, gridColumnStart: 1 };
};

// Tile images mapping
const TILE_IMAGES = {
    'Moscow': '/tiles/moscow.png',
    'Washington': '/tiles/washington.png',
    'Kyiv': '/tiles/kyiv.png',
    'Beijing': '/tiles/beijing.png',
    'Greenland': '/tiles/greenland.png'
};

// Get absolute pixel coordinates for a tile position
const getTileCoordinates = (tileId, boardRef) => {
    if (!boardRef?.current) return { x: 0, y: 0 };

    const board = boardRef.current;
    // clientWidth/Height are in local coordinate space, which matches Framer Motion's x/y transforms
    const w = board.clientWidth;
    const h = board.clientHeight;

    if (w === 0 || h === 0) return { x: 0, y: 0 };

    const gridStyle = getTileStyle(tileId);
    const GRID_GAP = 2; // Matches index.css gap

    // Grid configuration: Corners 1.5fr, others 1fr
    // 1st col (index 1) and 11th col (index 11) are 1.5fr
    // Cols 2-10 are 1fr
    // Total units = 1.5 + 9 + 1.5 = 12
    const totalUnits = 12;

    // Calculate unit size after subtracting gaps
    // 11 cells have 10 gaps (10 * 2px = 20px)
    const availableWidth = w - (10 * GRID_GAP);
    const availableHeight = h - (10 * GRID_GAP);

    const unitX = availableWidth / totalUnits;
    const unitY = availableHeight / totalUnits;

    const getCoordinate = (index, unitSize) => {
        let pos = 0;
        for (let i = 1; i < index; i++) {
            if (i === 1 || i === 11) pos += 1.5 * unitSize;
            else pos += 1 * unitSize;
            pos += GRID_GAP;
        }
        const currentSize = (index === 1 || index === 11) ? 1.5 : 1;
        pos += (currentSize * unitSize) / 2;
        return pos;
    };

    const checkGroupMonopoly = (group) => {
        if (['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax', 'Utility', 'Station'].includes(group)) return false;
        const groupTiles = tiles.filter(t => t.group === group);
        if (groupTiles.length === 0) return false;
        const firstOwner = groupTiles[0].owner_id;
        if (!firstOwner) return false;
        return groupTiles.every(t => t.owner_id === firstOwner);
    };

    const x = getCoordinate(gridStyle.gridColumnStart, unitX);
    const y = getCoordinate(gridStyle.gridRowStart, unitY);

    return { x, y, checkGroupMonopoly };
};



const Board = ({ tiles, players, onTileClick, mapType, currentPlayerId, externalRef, onAvatarClick, winner, selectedTileId, onBuy, onBuild, onSellHouse, onMortgage, onUnmortgage, canBuild, isMyTurn }) => {
    // Character colors for player tokens (derived from BOARD_CHARACTERS)
    const PLAYER_COLORS = React.useMemo(() => Object.fromEntries(
        Object.entries(BOARD_CHARACTERS).map(([k, v]) => [k, v.color])
    ), []);

    const [hoveredTileId, setHoveredTileId] = useState(null);
    const internalRef = useRef(null);
    const boardRef = externalRef || internalRef;
    const [playerPositions, setPlayerPositions] = useState({});
    const prevPositionsRef = useRef({});
    const lastPositionsRef = useRef({});
    const [animatedPaths, setAnimatedPaths] = useState({});

    // Calculate full path for animation along board edges
    const calculatePath = (start, end) => {
        if (start === end) return [start];

        // Detect teleport (e.g. sent to Jail)
        // If it's more than 12 steps or specifically to tile 10 (Jail) from non-9 position
        const dist = (end - start + tiles.length) % tiles.length;
        if (end === 10 || dist > 12) {
            return [start, end]; // Instant teleport
        }

        const path = [start];
        let current = start;
        const totalTiles = tiles.length;
        let safety = 0;
        while (current !== end && safety < 60) {
            current = (current + 1) % totalTiles;
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
            lastPositionsRef.current = { ...newPositions };
            setPlayerPositions(newPositions);
            setAnimatedPaths(newPaths);
        };

        // Faster update
        const timeoutId = setTimeout(updatePositions, 30);

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

                const char = BOARD_CHARACTERS[player.character] || {};
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
                        className="absolute pointer-events-auto cursor-pointer flex items-center justify-center z-50 hover:scale-110"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAvatarClick) onAvatarClick(playerId);
                        }}
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
                        <motion.div
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
                                backgroundColor: '#1a1a2e',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
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
                        >
                            <img src={char.avatar} alt={player.name} className="w-full h-full object-cover" />
                        </motion.div>
                    </motion.div>
                );
            })}
            {/* Center Map Area */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
                className="board-center flex items-center justify-center p-4 relative z-0"
            >
                <div className={`relative z-10 text-center transition-opacity duration-300`}>
                    {winner ? (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                            className="flex flex-col items-center"
                        >
                            <h1 className="font-display text-5xl md:text-6xl font-black text-yellow-400 tracking-tight drop-shadow-[0_0_20px_rgba(255,215,0,0.5)] mb-4">
                                ИГРА ОКОНЧЕНА
                            </h1>
                            <div className="text-2xl text-white font-bold mb-2">ПОБЕДИТЕЛЬ</div>
                            <div className="relative">
                                <img
                                    src={BOARD_CHARACTERS[winner.character]?.avatar}
                                    className="w-32 h-32 rounded-full border-4 border-yellow-400 shadow-[0_0_50px_rgba(255,215,0,0.6)] object-cover"
                                />
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full font-black uppercase text-sm whitespace-nowrap">
                                    {winner.name}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            <motion.h1
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: 'spring' }}
                                className="font-display text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-lg"
                            >
                                {mapType === 'Ukraine' ? 'УКРАИНА' : 'МИР'}
                            </motion.h1>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 }}
                                className="text-xl md:text-2xl font-display text-yellow-400 mt-2"
                            >
                                МОНОПОЛИЯ
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.9 }}
                                className="text-sm text-gray-400 mt-4"
                            >
                                Сатирическое Издание
                            </motion.div>
                        </>
                    )}


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
                {/* Contextual Hover Info */}
                <AnimatePresence>
                    {hoveredTileId !== null && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            className="absolute z-50 pointer-events-none"
                            style={{
                                ...(() => {
                                    const coords = getTileCoordinates(hoveredTileId, boardRef);
                                    const id = hoveredTileId;
                                    // Offset the tooltip based on which side of the board we're on
                                    let top = coords.y;
                                    let left = coords.x;

                                    // Force tooltip to always point towards center
                                    // Tooltip is ~140px wide, ~100px high
                                    // Coordinates are center of tile.
                                    // Reduced offsets to keep it closer and within bounds
                                    const OFFSET_Y = 80; // Changed from 120/140
                                    const OFFSET_X = 100; // Changed from 160

                                    if (id <= 10) { // Top Row -> Push DOWN
                                        top += OFFSET_Y;
                                    } else if (id < 20) { // Right Col -> Push LEFT
                                        left -= OFFSET_X;
                                    } else if (id <= 30) { // Bottom Row -> Push UP
                                        top -= OFFSET_Y;
                                    } else { // Left Col -> Push RIGHT
                                        left += OFFSET_X;
                                    }

                                    return { top, left, transform: 'translate(-50%, -50%)' };
                                })()
                            }}
                        >
                            <div className="bg-[#1a1b26]/95 backdrop-blur-xl p-3 px-5 rounded-2xl border border-white/20 text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-1 min-w-[140px]">
                                <div className="text-[10px] font-black tracking-widest text-gray-400 uppercase">
                                    {tiles.find(t => t.id === hoveredTileId)?.group}
                                </div>
                                <div className="font-black text-sm uppercase tracking-tight">
                                    {tiles.find(t => t.id === hoveredTileId)?.name}
                                </div>
                                {tiles.find(t => t.id === hoveredTileId)?.price > 0 && (
                                    <div className="text-yellow-400 font-mono font-black text-lg">
                                        ${tiles.find(t => t.id === hoveredTileId)?.price}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center">
                    <AnimatePresence>
                        {(selectedTileId !== null && selectedTileId !== undefined) && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-40 pointer-events-auto bg-black/20 backdrop-blur-[2px]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTileClick(null);
                                    }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                                    animate={{ opacity: 1, scale: 0.9, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 30 }}
                                    className="pointer-events-auto z-50 relative"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <PropertyModal
                                        property={tiles.find(t => t.id === selectedTileId)}
                                        players={players}
                                        tiles={tiles}
                                        canBuy={isMyTurn && players[currentPlayerId]?.position === selectedTileId && !tiles.find(t => t.id === selectedTileId)?.owner_id}
                                        onBuy={onBuy}
                                        onClose={() => onTileClick(null)}
                                        onBuild={onBuild}
                                        onSellHouse={onSellHouse}
                                        onMortgage={onMortgage}
                                        onUnmortgage={onUnmortgage}
                                        currentPlayerId={currentPlayerId}
                                        canBuild={canBuild}
                                    />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>


            </motion.div>

            {/* Render all tiles */}
            {tiles.map((tile, index) => (
                <motion.div
                    key={tile.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.015 }}
                    style={getTileStyle(tile.id)}
                >
                    <Tile
                        property={tile}
                        playersHere={playersByTile[tile.id]}
                        onClick={handleTileInteraction}
                        image={TILE_IMAGES[tile.name]}
                        isCorner={[0, 10, 20, 30].includes(tile.id)}
                        currentPlayerId={currentPlayerId}
                        allPlayers={players}
                        isMonopoly={(() => {
                            if (['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax', 'Utility', 'Station'].includes(tile.group)) return false;
                            const groupTiles = tiles.filter(t => t.group === tile.group);
                            if (groupTiles.length === 0) return false;
                            const firstOwner = groupTiles[0].owner_id;
                            return firstOwner && groupTiles.every(t => t.owner_id === firstOwner);
                        })()}
                    />
                </motion.div>
            ))}
        </div>
    );
};

export default Board;
