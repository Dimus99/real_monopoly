import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShoppingCart, Check, Users } from 'lucide-react';
import { ABILITIES } from '../constants/characters';

const ActionPanel = ({
    isMyTurn,
    isRolling,
    hasRolled,
    onRoll,
    canBuy,
    onBuy,
    onDecline,
    onEndTurn,
    character,
    onAbility,
    currentTilePrice,
    currentTileName,
    gameMode = 'abilities',
    isChatOpen = false,

    isDoubles = false,
    isJailed = false,
    abilityCooldown = 0,
    abilityUsed = false,
    onSurrender,
    isChanceOpen = false,
    rentDetails = null,
    onPayRent = null,
    onPayBail = null,
    onToggleSidebar
}) => {

    let ability = null;
    if (gameMode === 'oreshnik_all') {
        ability = ABILITIES['Putin'];
    } else if (gameMode === 'abilities') {
        const charKey = Object.keys(ABILITIES).find(k => k.toLowerCase() === character?.toLowerCase()) || character;
        ability = ABILITIES[charKey];
    }

    if (!isMyTurn || isChatOpen) return null;

    // Logic: ROLL button is always shown, but disabled if rolled && !doubles
    // BUY button is shown if canBuy
    // END button is shown if hasRolled && !doubles && !rentDetails && !canBuy

    const showRoll = true; // Always show roll button in dashboard
    // Disable roll if: rolling animation OR (already rolled AND not doubles) OR jailed without bail option OR payment required
    const disableRoll = isRolling || (hasRolled && !isDoubles) || rentDetails;
    // Forbid pressing Done if can roll (User Request)
    // If hasRolled is false, we definitely cannot end turn (unless special case logic changes, but for now strict).
    // If isDoubles is true, we can roll again, so cannot end turn.
    // Also strictly hide End Turn if currently rolling to prevent premature clicks or if payment is due.
    // ADDED: If jailed and rolled (failed doubles or paid), or jailed and cannot roll again -> show End Turn
    // NOTE: Game engine blocks next roll if jailed+rolled. So we must allow 'End Turn'.
    // UPDATED: Hide End Turn when canBuy is true (player must Accept or Decline property)
    const showEndTurn = !isRolling && !rentDetails && !canBuy && (
        (hasRolled && !isDoubles) ||
        (isJailed && hasRolled) // Explicitly allow end turn if in jail and already tried to roll/pay
    );

    const isAbilityBlocked = abilityCooldown > 0;

    // For doubles: The "Roll" button stays active. The "End" button is hidden.
    // For normal end: The "Roll" button is disabled. The "End" button appears.

    return (
        <div className="w-full flex justify-center items-center pointer-events-none">

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-2 p-2 md:p-3 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.7)] pointer-events-auto"
            >
                {/* 0. Mobile Sidebar Toggle (Users) */}
                {onToggleSidebar && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onToggleSidebar}
                        className="h-[56px] w-[56px] bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-center border border-white/20 shadow-lg"
                    >
                        <Users size={24} />
                    </motion.button>
                )}

                {/* 1. Ability Button (Left) */}
                {ability && (
                    <div className="relative group">
                        <motion.button
                            whileHover={!isAbilityBlocked ? { scale: 1.05 } : {}}
                            whileTap={!isAbilityBlocked ? { scale: 0.95 } : {}}
                            onClick={() => !isAbilityBlocked && onAbility(ability.id)}
                            disabled={isAbilityBlocked}
                            className={`h-[56px] w-[56px] md:w-auto md:px-4 ${isAbilityBlocked ? 'bg-gray-600 grayscale cursor-not-allowed opacity-50' : ability.color} text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg border border-white/20 relative overflow-hidden transition-all`}
                        >
                            <span className="text-2xl filter drop-shadow-md">{ability.icon}</span>
                            <span className="hidden md:block text-[10px] uppercase font-bold max-w-[60px] leading-tight text-left">
                                {isAbilityBlocked ? 'ОЖИДАНИЕ' : (ability.name.split(' ')[0])}
                            </span>
                            {/* Cooldown Overlay */}
                            {isAbilityBlocked && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <span className="text-xl font-black text-white/90">
                                        {abilityCooldown}
                                    </span>
                                </div>
                            )}
                        </motion.button>

                        {/* Tooltip Description */}
                        <div className="absolute bottom-[120%] left-0 w-64 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none z-[100] origin-bottom-left">
                            <div className="text-xs font-black text-white/40 uppercase tracking-widest mb-1 pb-1 border-b border-white/5 flex justify-between">
                                <span>СПОСОБНОСТЬ: {ability.name}</span>
                                {abilityCooldown > 0 && <span className="text-orange-400">⏳ {abilityCooldown}</span>}
                            </div>
                            <p className="text-[11px] text-white/90 leading-normal font-medium">
                                {ability.desc}
                            </p>
                            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-gray-900 border-r border-b border-white/10 rotate-45" />
                        </div>
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

                {/* 3. Rent Button (Wait for Pay) */}
                <AnimatePresence>
                    {rentDetails && (
                        <motion.button
                            key="pay-rent"
                            initial={{ width: 0, opacity: 0, padding: 0 }}
                            animate={{ width: 'auto', opacity: 1, padding: '0 16px' }}
                            exit={{ width: 0, opacity: 0, padding: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onPayRent}
                            className="h-[64px] bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-black flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-400/50"
                        >
                            <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                                <Zap size={20} className="text-white fill-current" />
                            </div>
                            <div className="flex flex-col items-start leading-tight whitespace-nowrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">ОПЛАТИТЬ АРЕНДУ</span>
                                <div className="text-lg font-mono font-black">
                                    ${rentDetails.amount}
                                </div>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* 3.5. Bail/Buyout Button (For Jail) */}
                <AnimatePresence>
                    {isJailed && !hasRolled && (
                        <motion.button
                            key="pay-bail"
                            initial={{ width: 0, opacity: 0, padding: 0 }}
                            animate={{ width: 'auto', opacity: 1, padding: '0 16px' }}
                            exit={{ width: 0, opacity: 0, padding: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onPayBail}
                            className="h-[64px] bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl font-black flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50"
                        >
                            <div className="p-1.5 bg-white/20 rounded-lg shrink-0 text-xl">
                                ⚖️
                            </div>
                            <div className="flex flex-col items-start leading-tight whitespace-nowrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">ВЫКУП</span>
                                <div className="text-lg font-mono font-black">
                                    $50
                                </div>
                            </div>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* 4. Property Purchase Buttons (Accept/Decline) */}
                <AnimatePresence>
                    {canBuy && (
                        <motion.div
                            key="property-decision"
                            initial={{ width: 0, opacity: 0, padding: 0 }}
                            animate={{ width: 'auto', opacity: 1, padding: 0 }}
                            exit={{ width: 0, opacity: 0, padding: 0 }}
                            className="flex gap-2"
                        >
                            {/* Accept Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onBuy}
                                className="h-[64px] px-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-400/50"
                            >
                                <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                                    <Check size={20} className="text-white" />
                                </div>
                                <div className="flex flex-col items-start leading-tight whitespace-nowrap">
                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">КУПИТЬ</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-bold truncate max-w-[80px]">{currentTileName}</span>
                                        <span className="text-lg font-mono">${currentTilePrice}</span>
                                    </div>
                                </div>
                            </motion.button>

                            {/* Decline Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onDecline}
                                className="h-[64px] px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black flex flex-col items-center justify-center gap-0.5 shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-400/50"
                            >
                                <span className="text-2xl">❌</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider">АУКЦИОН</span>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 5. End Turn Button - Removed per user request */}

            </motion.div>
        </div>
    );
};

export default ActionPanel;
