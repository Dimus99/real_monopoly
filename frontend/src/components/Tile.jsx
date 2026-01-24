import React from 'react';
import { motion } from 'framer-motion';

// Color gradient mappings for property groups
const GROUP_STYLES = {
    Brown: { gradient: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)', textColor: '#fff' },
    LightBlue: { gradient: 'linear-gradient(135deg, #87CEEB 0%, #5DADE2 100%)', textColor: '#1a1a2e' },
    Pink: { gradient: 'linear-gradient(135deg, #FF69B4 0%, #FF1493 100%)', textColor: '#fff' },
    Orange: { gradient: 'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)', textColor: '#fff' },
    Red: { gradient: 'linear-gradient(135deg, #DC143C 0%, #B22222 100%)', textColor: '#fff' },
    Yellow: { gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', textColor: '#1a1a2e' },
    Green: { gradient: 'linear-gradient(135deg, #228B22 0%, #006400 100%)', textColor: '#fff' },
    DarkBlue: { gradient: 'linear-gradient(135deg, #191970 0%, #00008B 100%)', textColor: '#fff' },
    Blue: { gradient: 'linear-gradient(135deg, #4169E1 0%, #2c4fa6 100%)', textColor: '#fff' },
    Station: { gradient: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', textColor: '#fff', icon: '✈️' },
    Railroad: { gradient: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)', textColor: '#fff', icon: '🚂' },
    Utility: { gradient: 'linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%)', textColor: '#fff', icon: '⚡' },
    Special: { gradient: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.1) 100%)', textColor: '#FFD700' },
    Jail: { gradient: 'linear-gradient(135deg, #654321 0%, #3d2817 100%)', textColor: '#fff', icon: '🏝️' },
    GoToJail: { gradient: 'linear-gradient(135deg, #8B0000 0%, #5c0000 100%)', textColor: '#fff', icon: '✈️' },
    FreeParking: { gradient: 'linear-gradient(135deg, #2E8B57 0%, #1a5235 100%)', textColor: '#fff', icon: '🏛️' },
    Chance: { gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)', textColor: '#fff', icon: '❓' },
    Tax: { gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', textColor: '#fff', icon: '💰' },
    Cyan: { gradient: 'linear-gradient(135deg, #00FFFF 0%, #00CED1 100%)', textColor: '#1a1a2e' }
};

// Character to country flag mapping
const CHARACTER_FLAGS = {
    'Putin': '🇷🇺',
    'Trump': '🇺🇸',
    'Zelensky': '🇺🇦',
    'Kim': '🇰🇵',
    'Biden': '🇺🇸',
    'Xi': '🇨🇳'
};

// Country colors for owned property backgrounds
const CHARACTER_COLORS = {
    'Putin': { bg: 'linear-gradient(180deg, #fff 0%, #fff 33%, #0039A6 33%, #0039A6 66%, #D52B1E 66%, #D52B1E 100%)', border: '#D52B1E' },
    'Trump': { bg: 'linear-gradient(180deg, #B31942 0%, #B31942 30%, #fff 30%, #fff 50%, #0A3161 50%, #0A3161 100%)', border: '#B31942' },
    'Zelensky': { bg: 'linear-gradient(180deg, #0057B8 0%, #0057B8 50%, #FFD700 50%, #FFD700 100%)', border: '#0057B8' },
    'Kim': { bg: 'linear-gradient(180deg, #024FA2 0%, #024FA2 20%, #fff 20%, #fff 30%, #ED1C27 30%, #ED1C27 70%, #fff 70%, #fff 80%, #024FA2 80%)', border: '#ED1C27' },
    'Biden': { bg: 'linear-gradient(180deg, #B31942 0%, #B31942 30%, #fff 30%, #fff 50%, #0A3161 50%, #0A3161 100%)', border: '#0A3161' },
    'Xi': { bg: 'linear-gradient(135deg, #DE2910 0%, #DE2910 100%)', border: '#DE2910' }
};

// Special tile icons
const SPECIAL_ICONS = {
    'СТАРТ': '🚀',
    'ТЮРЬМА': '🏝️',
    'В ТЮРЬМУ': '✈️',
    'БЕСПЛАТНАЯ ПАРКОВКА': '🏛️',
    'Шанс': '📰',
    'Подоходный налог': '💸',
    'Налог на роскошь': '💎',
    'Газпром': '⛽',
    'Роснефть': '🛢️',
    'JACKPOT': '💰',
    'SUPER JACKPOT': '🏆',
    'POLICE': '👮',
    'PRISON': '⛓️'
};

// Determine tile orientation (which side of the board)
const getTileOrientation = (tileId) => {
    // Rotated Layout (Free Parking at Bottom Right)
    if (tileId >= 1 && tileId <= 9) return 'top-row';
    if (tileId >= 11 && tileId <= 19) return 'right-col';
    if (tileId >= 21 && tileId <= 29) return 'bottom-row';
    if (tileId >= 31 && tileId <= 39) return 'left-col';
    return 'special';
};

// Get color bar position based on orientation (inner side)
const getColorBarStyle = (tileId) => {
    const orientation = getTileOrientation(tileId);
    const isCorner = [0, 10, 20, 30].includes(tileId);
    if (isCorner) return null;

    const barSize = '8px'; // Visible stripe

    switch (orientation) {
        case 'bottom-row': return { top: 0, left: 0, right: 0, height: barSize }; // Bar at Top
        case 'left-col': return { top: 0, bottom: 0, right: 0, width: barSize }; // Bar at Right
        case 'top-row': return { bottom: 0, left: 0, right: 0, height: barSize }; // Bar at Bottom
        case 'right-col': return { top: 0, bottom: 0, left: 0, width: barSize }; // Bar at Left
        default: return null;
    }
};

const Tile = ({ property, onClick, playersHere, style, image, isCorner, currentPlayerId, allPlayers }) => {
    const groupStyle = GROUP_STYLES[property.group] || GROUP_STYLES.Special;
    const specialIcon = SPECIAL_ICONS[property.name];
    const isPropertyTile = !['Special', 'Chance', 'Tax', 'Jail', 'GoToJail', 'FreeParking'].includes(property.group) && !isCorner;
    const hasOwner = property.owner_id !== null;
    const colorBarStyle = getColorBarStyle(property.id);
    const orientation = getTileOrientation(property.id);

    // Find owner's character for flag display
    let ownerCharacter = null;
    let ownerFlag = null;
    let ownerColors = null;

    if (hasOwner && allPlayers) {
        const owner = Object.values(allPlayers).find(p => p.id === property.owner_id);
        if (owner) {
            ownerCharacter = owner.character;
            ownerFlag = CHARACTER_FLAGS[ownerCharacter];
            ownerColors = CHARACTER_COLORS[ownerCharacter];
        }
    }

    const currentPlayerHere = playersHere?.some(p => p.id === currentPlayerId);

    // Dynamic padding for content to avoid overlap with color bar
    let contentPaddingClass = 'p-1';
    if (isPropertyTile) {
        if (orientation === 'bottom-row') contentPaddingClass = 'pt-3 pb-1 px-1';
        if (orientation === 'top-row') contentPaddingClass = 'pb-3 pt-1 px-1';
        if (orientation === 'left-col') contentPaddingClass = 'pr-3 pl-1 py-1';
        if (orientation === 'right-col') contentPaddingClass = 'pl-3 pr-1 py-1';
    }

    return (
        <div
            onMouseEnter={() => onClick(property.id, 'hover')}
            onMouseLeave={() => onClick(null, 'leave')}
            onClick={() => onClick(property.id, 'click')}
            data-tile-id={property.id}
            className={`tile relative w-full h-full border ${property.is_destroyed ? 'tile-destroyed' : ''} ${currentPlayerHere ? 'ring-2 ring-yellow-400 z-20' : ''}`}
            style={{
                ...style,
                background: isCorner ? groupStyle.gradient : '#1a1a2e', // Dark background always (except corners)
                borderColor: hasOwner && ownerColors
                    ? ownerColors.border
                    : 'rgba(255,255,255,0.1)',
                borderWidth: hasOwner ? '2px' : '1px',
                boxShadow: hasOwner && !property.is_destroyed
                    ? `inset 0 0 15px ${ownerColors?.border}40`
                    : 'inset 0 0 20px rgba(0,0,0,0.3)',
            }}
        >
            {/* Owner flag overlay - Top Right corner */}
            {hasOwner && ownerFlag && !property.is_destroyed && (
                <div className="absolute top-0.5 right-0.5 z-30 filter drop-shadow-md transform hover:scale-125 transition-transform" title={`Owned by ${ownerCharacter}`}>
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center bg-black/50 border border-white/20">
                        <span className="text-sm md:text-base">{ownerFlag}</span>
                    </div>
                </div>
            )}

            {/* Color Bar for purchasable properties - on inner side - ALWAYS VISIBLE */}
            {isPropertyTile && colorBarStyle && (
                <div
                    className="absolute z-10"
                    style={{
                        ...colorBarStyle,
                        background: groupStyle.gradient,
                        boxShadow: '0 0 8px rgba(0,0,0,0.5)'
                    }}
                />
            )}

            {/* Tile Content */}
            <div className={`flex-1 flex flex-col items-center justify-center relative h-full ${contentPaddingClass}`}>
                {/* Special tile icon */}
                {(specialIcon || groupStyle.icon) && (
                    <div className="text-xl md:text-2xl mb-0.5 drop-shadow-md">
                        {specialIcon || groupStyle.icon}
                    </div>
                )}

                {/* Tile Name */}
                <div
                    className="tile-name leading-tight text-center px-0.5"
                    style={{
                        color: hasOwner ? '#fff' : (isCorner ? groupStyle.textColor : '#e0e0e0'),
                        fontSize: isCorner ? '10px' : '8px',
                        lineHeight: '1.1',
                        fontWeight: isCorner ? '700' : '600',
                        textShadow: hasOwner ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                >
                    {property.name}
                </div>

                {/* Price */}
                {property.price > 0 && !hasOwner && (
                    <div
                        className="font-bold mt-0.5 text-yellow-400"
                        style={{ fontSize: '9px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                    >
                        ${property.price}
                    </div>
                )}

                {/* Houses indicator */}
                {property.houses > 0 && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5">
                        {property.houses < 5 && Array(property.houses).fill(0).map((_, i) => (
                            <div key={i} className="w-2 h-2.5 bg-green-500 rounded-sm border border-white/50 shadow-md" />
                        ))}
                        {property.houses === 5 && (
                            <div className="text-sm">🏨</div>
                        )}
                    </div>
                )}
            </div>

            {/* Destroyed overlay */}
            {property.is_destroyed && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-[25] backdrop-blur-[2px]"
                >
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="text-3xl mb-1 filter drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                    >
                        💥
                    </motion.div>
                    <span className="text-[8px] font-black text-red-500 tracking-wider uppercase">DESTROYED</span>
                </motion.div>
            )}

            {/* Hover glow effect */}
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent" />
            </div>
        </div>
    );
};

export default Tile;
