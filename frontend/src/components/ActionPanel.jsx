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
    isChatOpen = false
}) => {

    // Ability configurations
    const ABILITIES = {
        'Putin': { name: 'Ебнуть орешником', icon: '🚀', color: 'bg-red-600', desc: 'Уничтожить город' },
        'Trump': { name: 'BUYOUT', icon: '💰', color: 'bg-orange-500', desc: 'Захватить' },
        'Zelensky': { name: 'AID', icon: '🤝', color: 'bg-blue-600', desc: 'Собрать помощь' },
        'Kim': { name: 'ISOLATION', icon: '☢️', color: 'bg-red-800', desc: 'Изоляция' },
        'Biden': { name: 'SANCTIONS', icon: '🚫', color: 'bg-blue-800', desc: 'Санкции' },
        'Xi': { name: 'BELT_ROAD', icon: '🧧', color: 'bg-red-500', desc: 'Инфраструктура' }
    };

    let ability = null;
    if (gameMode === 'oreshnik_all') {
        ability = ABILITIES['Putin'];
    } else if (gameMode === 'abilities') {
        const charKey = Object.keys(ABILITIES).find(k => k.toLowerCase() === character?.toLowerCase()) || character;
        ability = ABILITIES[charKey];
    }

    // Don't show panel if not my turn OR if chat is open
    // BUT we should show 'End Turn' even if chat is open? No, chat overlays.
    if (!isMyTurn || isChatOpen) return null;

    return (
        <div className="w-full flex flex-col items-center gap-3 pointer-events-none">

            <AnimatePresence mode="wait">
                {/* Before rolling - Show Roll button */}
                {!hasRolled && (
                    <motion.div
                        key="roll-panel"
                        initial={{ scale: 0.8, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -30 }}
                        className="flex items-center gap-4 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.7)] pointer-events-auto"
                    >
                        {/* Roll Button */}
                        <motion.button
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onRoll}
                            disabled={isRolling}
                            className={`
                                relative w-24 h-24 md:w-28 md:h-28 rounded-full flex flex-col items-center justify-center gap-1 font-black text-white transition-all
                                ${isRolling
                                    ? 'bg-slate-800 cursor-wait opacity-50'
                                    : 'bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FF8C00] hover:shadow-[0_15px_40px_rgba(255,165,0,0.5)] shadow-xl'
                                }
                            `}
                        >
                            {isRolling ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                    className="text-4xl md:text-5xl"
                                >
                                    🎲
                                </motion.div>
                            ) : (
                                <>
                                    <motion.span
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                        className="text-4xl md:text-5xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
                                    >
                                        🎲
                                    </motion.span>
                                    <span className="font-display tracking-[0.2em] text-[9px] md:text-[10px] font-black text-black/90 uppercase">ROLL</span>
                                </>
                            )}

                            {!isRolling && (
                                <span className="absolute inset-0 rounded-full border-2 border-yellow-300/50 animate-pulse" />
                            )}
                        </motion.button>

                        {/* Ability Button - available before rolling too */}
                        {ability && (
                            <motion.button
                                whileHover={{ scale: 1.02, x: 3 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onAbility}
                                className={`h-[52px] md:h-[56px] px-4 md:px-6 ${ability.color} hover:brightness-110 text-white rounded-2xl font-black flex items-center gap-3 shadow-lg border border-white/20`}
                            >
                                <span className="text-2xl filter drop-shadow-md">{ability.icon}</span>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">{ability.name}</span>
                                    <span className="text-[10px] font-medium opacity-80 truncate max-w-[100px]">{ability.desc}</span>
                                </div>
                            </motion.button>
                        )}
                    </motion.div>
                )}

                {/* After rolling - Show Buy/End Turn buttons */}
                {hasRolled && (
                    <motion.div
                        key="action-panel"
                        initial={{ scale: 0.8, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -30 }}
                        className="flex items-center gap-3 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.7)] pointer-events-auto"
                    >
                        {/* Buy Button - Only if can buy */}
                        {canBuy && (
                            <motion.button
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onBuy}
                                className="h-[56px] md:h-[64px] px-5 md:px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black flex items-center gap-3 whitespace-nowrap shadow-lg border border-white/20"
                            >
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <ShoppingCart size={22} className="text-white" />
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Купить</span>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold truncate max-w-[100px] leading-tight">{currentTileName || "Property"}</span>
                                        <span className="text-xl font-mono leading-none">${currentTilePrice?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </motion.button>
                        )}

                        {/* End Turn / OK Button */}
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onEndTurn}
                            className="h-[56px] md:h-[64px] px-6 md:px-8 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-2xl font-black flex items-center gap-3 shadow-lg border border-white/20"
                        >
                            <Check size={24} className="text-white" />
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Готово</span>
                                <span className="text-sm font-bold uppercase tracking-wider">Передать ход</span>
                            </div>
                        </motion.button>

                        {/* Ability Button - still available after rolling */}
                        {ability && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onAbility}
                                className={`h-[52px] md:h-[56px] px-4 ${ability.color} hover:brightness-110 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg border border-white/20`}
                            >
                                <span className="text-2xl">{ability.icon}</span>
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ActionPanel;
