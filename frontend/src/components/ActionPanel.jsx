import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Zap, DollarSign } from 'lucide-react';

const ActionPanel = ({
    isMyTurn,
    isRolling,
    onRoll,
    canBuy,
    onBuy,
    character,
    onAbility,
    currentTilePrice,
    gameMode = 'abilities'
}) => {

    // Ability configurations
    const ABILITIES = {
        'Putin': { name: 'Use ORESHNIK', icon: '🚀', color: 'bg-red-600', desc: 'Destroy City' },
        'Trump': { name: 'Hostile Buyout', icon: '💰', color: 'bg-orange-500', desc: 'Take Property' },
        'Zelensky': { name: 'Collect Aid', icon: '🤝', color: 'bg-blue-600', desc: 'Get Money' },
        'Kim': { name: 'Nuke Threat', icon: '☢️', color: 'bg-red-800', desc: 'Extort Money' },
        'Biden': { name: 'Sanctions', icon: '🚫', color: 'bg-blue-800', desc: 'Freeze Assets' },
        'Xi': { name: 'Debt Trap', icon: '🧧', color: 'bg-red-500', desc: 'Collect Interest' }
    };

    let ability = null;
    if (gameMode === 'oreshnik_all') {
        ability = ABILITIES['Putin'];
    } else if (gameMode === 'abilities') {
        ability = ABILITIES[character];
    }

    if (!isMyTurn) return null;

    return (
        <div className="w-full flex flex-col items-center gap-4 pointer-events-none">

            {/* Main Command Center */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="flex items-center gap-6 p-4 bg-gray-900/90 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.6)] pointer-events-auto"
            >
                {/* Roll Button - The Hero Action */}
                <motion.button
                    whileHover={{ scale: 1.05, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRoll}
                    disabled={isRolling}
                    className={`
                        relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 font-black text-white transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)]
                        ${isRolling
                            ? 'bg-slate-800 cursor-wait opacity-50'
                            : 'bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#FF8C00] hover:shadow-[0_25px_50px_rgba(255,165,0,0.5)] shadow-xl'
                        }
                    `}
                >
                    {isRolling ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="text-5xl"
                        >
                            🎲
                        </motion.div>
                    ) : (
                        <>
                            <span className="text-5xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] animate-bounce-slow">🎲</span>
                            <span className="font-display tracking-[0.25em] text-[10px] font-black text-black/90 uppercase">ROLL</span>
                        </>
                    )}

                    {/* Ring Pulse Effect */}
                    {!isRolling && (
                        <span className="absolute inset-0 rounded-3xl border-2 border-white/40 animate-ping opacity-20" />
                    )}
                </motion.button>

                {/* Contextual Actions Container */}
                <div className="flex flex-col gap-3 min-w-[200px]">

                    {/* Buy Button - Appears when landing on property */}
                    <AnimatePresence>
                        {canBuy && (
                            <motion.button
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 20, opacity: 0 }}
                                whileHover={{ scale: 1.02, x: 5 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onBuy}
                                className="h-[64px] px-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-full font-black flex items-center gap-4 whitespace-nowrap overflow-hidden shadow-lg shadow-emerald-900/30 border border-white/20"
                            >
                                <div className="p-2 bg-white/20 rounded-full shadow-inner">
                                    <ShoppingCart size={26} className="text-white" />
                                </div>
                                <div className="flex flex-col items-start leading-tight">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Purchase</span>
                                    <span className="text-xl font-mono">${currentTilePrice?.toLocaleString()}</span>
                                </div>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Ability Button */}
                    {ability && (
                        <motion.button
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onAbility}
                            className={`h-[64px] px-8 ${ability.color} bg-gradient-to-br from-white/20 to-transparent hover:brightness-110 text-white rounded-full font-black flex items-center gap-4 shadow-lg border border-white/20`}
                        >
                            <span className="text-3xl filter drop-shadow-md">{ability.icon}</span>
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{ability.name}</span>
                                <span className="text-[10px] font-bold opacity-90 truncate max-w-[140px]">{ability.desc}</span>
                            </div>
                        </motion.button>
                    )}
                </div>
            </motion.div>

        </div>
    );
};

export default ActionPanel;
