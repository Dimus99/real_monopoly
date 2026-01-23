import React from 'react';
import { motion } from 'framer-motion';

// Color gradient mappings for property groups
const GROUP_STYLES = {
    Brown: {
        gradient: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)',
        textColor: '#fff'
    },
    LightBlue: {
        gradient: 'linear-gradient(135deg, #87CEEB 0%, #5DADE2 100%)',
        textColor: '#1a1a2e'
    },
    Pink: {
        gradient: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)',
        textColor: '#fff'
    },
    Orange: {
        gradient: 'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)',
        textColor: '#fff'
    },
    Red: {
        gradient: 'linear-gradient(135deg, #DC143C 0%, #B22222 100%)',
        textColor: '#fff'
    },
    Yellow: {
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
        textColor: '#1a1a2e'
    },
    Green: {
        gradient: 'linear-gradient(135deg, #228B22 0%, #006400 100%)',
        textColor: '#fff'
    },
    DarkBlue: {
        gradient: 'linear-gradient(135deg, #191970 0%, #00008B 100%)',
        textColor: '#fff'
    },
    Station: {
        gradient: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
        textColor: '#fff',
        icon: '✈️'
    },
    Railroad: {
        gradient: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
        textColor: '#fff',
        icon: '🚂'
    },
    Utility: {
        gradient: 'linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%)',
        textColor: '#fff',
        icon: '⚡'
    },
    Special: {
        gradient: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.1) 100%)',
        textColor: '#FFD700'
    },
    Jail: {
        gradient: 'linear-gradient(135deg, #654321 0%, #3d2817 100%)',
        textColor: '#fff',
        icon: '🏝️'
    },
    GoToJail: {
        gradient: 'linear-gradient(135deg, #8B0000 0%, #5c0000 100%)',
        textColor: '#fff',
        icon: '✈️'
    },
    FreeParking: {
        gradient: 'linear-gradient(135deg, #2E8B57 0%, #1a5235 100%)',
        textColor: '#fff',
        icon: '🏛️'
    },
    Chance: {
        gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
        textColor: '#fff',
        icon: '❓'
    },
    Tax: {
        gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
        textColor: '#fff',
        icon: '💰'
    },
    Cyan: {
        gradient: 'linear-gradient(135deg, #00FFFF 0%, #00CED1 100%)',
        textColor: '#1a1a2e'
    },
    Blue: {
        gradient: 'linear-gradient(135deg, #4169E1 0%, #2c4fa6 100%)',
        textColor: '#fff'
    }
};

// Special tile icons
const SPECIAL_ICONS = {
    'GO': '🚀',
    'Epstein Island': '🏝️',
    'Go to Epstein Island': '✈️',
    'UN Summit': '🏛️',
    'Breaking News': '📰',
    'Corruption Tax': '💸',
    'Luxury Tax': '💎',
    'Gazprom': '⛽',
    'OPEC Oil': '🛢️',
    'JACKPOT': '🎰',
    'SUPER JACKPOT': '💰',
    'PRISON': '⛓️',
    'POLICE': '👮'
};

// Determine tile orientation (which side of the board)
const getTileOrientation = (tileId) => {
    if (tileId >= 0 && tileId <= 10) return 'top';      // Top row
    if (tileId >= 11 && tileId <= 19) return 'right';   // Right column
    if (tileId >= 20 && tileId <= 30) return 'bottom';  // Bottom row
    if (tileId >= 31 && tileId <= 39) return 'left';    // Left column
    return 'top';
};

// Get color bar position class based on orientation (inner side)
const getColorBarStyle = (tileId) => {
    const orientation = getTileOrientation(tileId);
    const isCorner = [0, 10, 20, 30].includes(tileId);
    if (isCorner) return null;

    switch (orientation) {
        case 'top':
            return { bottom: 0, left: 0, right: 0, height: '6px' };
        case 'bottom':
            return { top: 0, left: 0, right: 0, height: '6px' };
        case 'left':
            return { top: 0, bottom: 0, right: 0, width: '6px' };
        case 'right':
            return { top: 0, bottom: 0, left: 0, width: '6px' };
        default:
            return { bottom: 0, left: 0, right: 0, height: '6px' };
    }
};

const Tile = ({ property, onClick, playersHere, style, image, isCorner, currentPlayerId }) => {
    const groupStyle = GROUP_STYLES[property.group] || GROUP_STYLES.Special;
    const specialIcon = SPECIAL_ICONS[property.name];
    const isPropertyTile = !['Special', 'Chance', 'Tax', 'Jail', 'GoToJail', 'FreeParking'].includes(property.group);
    const hasOwner = property.owner_id !== null;
    const colorBarStyle = getColorBarStyle(property.id);

    // Check if current player is on this tile
    const currentPlayerHere = playersHere?.some(p => p.id === currentPlayerId);

    return (
        <div
            onMouseEnter={() => onClick(property.id, 'hover')}
            onMouseLeave={() => onClick(null, 'leave')}
            onClick={() => onClick(property.id, 'click')}
            className={`tile relative w-full h-full border border-white/10 ${property.is_destroyed ? 'tile-destroyed' : ''} ${currentPlayerHere ? 'ring-2 ring-yellow-400 z-20' : ''}`}
            style={{
                ...style,
                background: isCorner ? groupStyle.gradient : '#12121a',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
            }}
        >
            {/* Color Bar for purchasable properties - on inner side */}
            {isPropertyTile && colorBarStyle && (
                <div
                    className="absolute z-10"
                    style={{
                        ...colorBarStyle,
                        background: groupStyle.gradient,
                        boxShadow: `0 0 8px ${groupStyle.gradient.includes('#') ? groupStyle.gradient.split('#')[1]?.slice(0, 6) : 'rgba(255,255,255,0.3)'}`
                    }}
                />
            )}

            {/* Tile Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-1 relative h-full">
                {/* Special tile icon */}
                {(specialIcon || groupStyle.icon) && (
                    <div className="text-lg md:text-xl mb-0.5 drop-shadow-md">
                        {specialIcon || groupStyle.icon}
                    </div>
                )}

                {/* Tile Name */}
                <div
                    className="tile-name leading-tight text-center px-0.5"
                    style={{
                        color: isCorner ? groupStyle.textColor : '#e0e0e0',
                        fontSize: isCorner ? '9px' : '8px',
                        lineHeight: '1.1',
                        fontWeight: isCorner ? '700' : '600',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                >
                    {property.name}
                </div>

                {/* Price */}
                {property.price > 0 && (
                    <div
                        className="font-bold mt-0.5 text-yellow-400"
                        style={{ fontSize: '9px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                        ${property.price}
                    </div>
                )}

                {/* Owner indicator */}
                {hasOwner && !property.is_destroyed && (
                    <div className="absolute top-1 right-1">
                        <div
                            className="w-2.5 h-2.5 rounded-full border border-white/50 shadow-lg"
                            title="Owned"
                            style={{
                                backgroundColor: playersHere?.find(p => p.id === property.owner_id)?.displayColor || '#fff',
                                boxShadow: '0 0 6px rgba(255,255,255,0.5)'
                            }}
                        />
                    </div>
                )}

                {/* Houses indicator */}
                {property.houses > 0 && (
                    <div className="absolute bottom-1 left-1 flex gap-0.5">
                        {property.houses < 5 && Array(property.houses).fill(0).map((_, i) => (
                            <div key={i} className="w-1.5 h-2 bg-green-500 rounded-sm border-[0.5px] border-white/50 shadow-sm" />
                        ))}
                        {property.houses === 5 && (
                            <div className="text-[10px]">🏨</div>
                        )}
                    </div>
                )}
            </div>

            {/* Destroyed overlay */}
            {property.is_destroyed && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-[25] backdrop-blur-[2px]"
                >
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="text-2xl mb-1 filter drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                    >
                        💥
                    </motion.div>
                    <span className="text-[7px] font-black text-red-500 tracking-wider uppercase">DESTROYED</span>
                </motion.div>
            )}

            {/* Hover glow effect */}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/15 to-transparent" />
            </div>
        </div>
    );
};

export default Tile;
