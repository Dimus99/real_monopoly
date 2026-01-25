import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Check, Zap } from 'lucide-react';

const ActionPanel = ({
    isMyTurn,
    isRolling,
    hasRolled,
    onRoll,
    canBuy,
    onBuy,
    onEndTurn,
    character,
    onAbility,
    currentTilePrice,
    currentTileName,
    gameMode = 'abilities',
    isChatOpen = false,

    isDoubles = false,
    abilityCooldown = 0,
    onSurrender
}) => {

    // Ability configurations
    const ABILITIES = {
        'Putin': { id: 'ORESHNIK', name: 'Ебнуть орешником', icon: '🚀', color: 'bg-red-600', desc: 'Уничтожить город' },
        'Trump': { id: 'BUYOUT', name: 'Hostile Takeover', icon: '💰', color: 'bg-orange-500', desc: 'Захватить город' },
        'Zelensky': { id: 'AID', name: 'Ask for Aid', icon: '🤝', color: 'bg-blue-600', desc: 'Собрать помощь' },
        'Kim': { id: 'ISOLATION', name: 'Nuke Threat', icon: '☢️', color: 'bg-red-800', desc: 'Изоляция' },
        'Biden': { id: 'SANCTIONS', name: 'Economic Sanctions', icon: '🚫', color: 'bg-blue-800', desc: 'Санкции' },
        'Xi': { id: 'BELT_ROAD', name: 'Belt and Road', icon: '🧧', color: 'bg-red-500', desc: 'Инфраструктура' }
    };

    let ability = null;
    if (gameMode === 'oreshnik_all') {
        ability = ABILITIES['Putin'];
    } else if (gameMode === 'abilities') {
        const charKey = Object.keys(ABILITIES).find(k => k.toLowerCase() === character?.toLowerCase()) || character;
        ability = ABILITIES[charKey];
    }

    if (!isMyTurn || isChatOpen || isChanceOpen) return null;

    // Logic: ROLL button is always shown, but disabled if rolled && !doubles
    // BUY button is shown if canBuy
    // END button is shown if hasRolled && !doubles

    const showRoll = true; // Always show roll button in dashboard
    const disableRoll = isRolling || (hasRolled && !isDoubles);

    // For doubles: The "Roll" button stays active. The "End" button is hidden.
    // For normal end: The "Roll" button is disabled. The "End" button appears.

    return (
        <div className="w-full flex justify-center items-center pointer-events-none">

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-2 p-2 md:p-3 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.7)] pointer-events-auto"
            >
                {/* 1. Ability Button (Left) */}
                {ability && (
                    <div className="relative group">
                        <motion.button
                            whileHover={abilityCooldown === 0 ? { scale: 1.05 } : {}}
                            whileTap={abilityCooldown === 0 ? { scale: 0.95 } : {}}
                            onClick={() => abilityCooldown === 0 && onAbility(ability.id)}
                            disabled={abilityCooldown > 0}
                            className={`h-[56px] w-[56px] md:w-auto md:px-4 ${abilityCooldown > 0 ? 'bg-gray-600 grayscale cursor-not-allowed' : ability.color} text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg border border-white/20 relative overflow-hidden`}
                            title={ability.name}
                        >
                            <span className="text-2xl filter drop-shadow-md">{ability.icon}</span>
                            <span className="hidden md:block text-[10px] uppercase font-bold max-w-[60px] leading-tight truncat text-left">
                                {ability.name.split(' ')[0]}
                            </span>
                            {/* Cooldown Overlay */}
                            {abilityCooldown > 0 && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-xl font-bold text-white">{abilityCooldown}</span>
                                </div>
                            )}
                        </motion.button>
                    </div>
                )}

                {/* 2. Roll Button (Center-Left) */}
                <motion.button
                    whileHover={!disableRoll ? { scale: 1.05 } : {}}
                    whileTap={!disableRoll ? { scale: 0.95 } : {}}
                    onClick={onRoll}
                    disabled={disableRoll}
                    className={`
                        h-[64px] min-w-[80px] px-4 rounded-2xl flex flex-col items-center justify-center gap-0.5 border border-white/20 transition-all
                        ${disableRoll
                            ? 'bg-slate-800 text-gray-500 opacity-80 cursor-not-allowed'
                            : 'bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FF8C00] text-white shadow-[0_0_20px_rgba(255,165,0,0.4)]'
                        }
                    `}
                >
                    {isRolling ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            className="text-2xl"
                        >
                            🎲
                        </motion.div>
                    ) : (
                        <>
                            <span className={`text-2xl ${isDoubles ? 'animate-pulse' : ''}`}>
                                {isDoubles ? '⚡' : '🎲'}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider">
                                {isDoubles ? 'БРОСОК' : 'БРОСОК'}
                            </span>
                        </>
                    )}
                </motion.button>

                {/* 3. Buy Button (Center-Right) */}
                <AnimatePresence>
                    {canBuy && (
                        <motion.button
                            initial={{ width: 0, opacity: 0, padding: 0 }}
                            animate={{ width: 'auto', opacity: 1, padding: '0 16px' }}
                            exit={{ width: 0, opacity: 0, padding: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onBuy}
                            className="h-[64px] bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50"
                        >
                            <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                                <ShoppingCart size={20} className="text-white" />
                            </div>
                            <div className="flex flex-col items-start leading-tight whitespace-nowrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">КУПИТЬ</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xs font-bold truncate max-w-[80px]">{currentTileName}</span>
                                    <span className="text-lg font-mono">${currentTilePrice}</span>
                                </div>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* 4. End Turn Button (Right) */}
                <AnimatePresence>
                    {hasRolled && !isDoubles && (
                        <motion.button
                            initial={{ width: 0, opacity: 0, padding: 0, scale: 0.5 }}
                            animate={{ width: 'auto', opacity: 1, padding: '0 20px', scale: 1 }}
                            exit={{ width: 0, opacity: 0, padding: 0, scale: 0.5 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onEndTurn}
                            className="h-[64px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl font-black flex flex-col items-center justify-center gap-0.5 shadow-lg border border-white/20 whitespace-nowrap overflow-hidden"
                        >
                            <Check size={24} />
                            <span className="text-[10px] font-black uppercase tracking-wider">ГОТОВО</span>
                        </motion.button>
                    )}
                </AnimatePresence>



            </motion.div>
        </div>
    );
};

export default ActionPanel;
