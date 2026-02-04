import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Clock, ArrowUpCircle, XCircle } from 'lucide-react'; // Updated icons

const AuctionModal = ({
    isOpen,
    property,
    currentBid,
    currentBidderId,
    activePlayerId,
    timeLeft,
    onRaise,
    onPass,
    currentPlayerId,
    players = {}
}) => {
    // Is it my turn to act?
    const isMyTurn = activePlayerId === currentPlayerId;

    // Who is currently winning?
    const winningPlayerName = currentBidderId ? players[currentBidderId]?.name : "Никто";
    const isWinning = currentBidderId === currentPlayerId;

    // Who is acting now?
    const activePlayerName = players[activePlayerId]?.name || "Игрок";

    return (
        <AnimatePresence>
            {isOpen && property && (
                <>
                    {/* Compact Mode (Small Plaque) - When NOT my turn */}
                    {!isMyTurn && (
                        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] pointer-events-none flex justify-center w-full">
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -50, opacity: 0 }}
                                className="bg-black/80 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 flex items-center gap-4 shadow-xl pointer-events-auto"
                            >
                                <div className="flex items-center gap-2">
                                    <Gavel size={16} className="text-yellow-500" />
                                    <span className="text-yellow-400 font-bold font-mono">${currentBid}</span>
                                </div>
                                <div className="h-4 w-px bg-white/20" />
                                <div className="text-sm text-gray-300 flex items-center gap-2">
                                    Ход: <span className="text-blue-400 font-bold">{activePlayerName}</span>
                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-lg border border-yellow-500/30 text-[11px] font-black font-mono shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                                        ${currentBid}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-mono text-gray-500 bg-black/40 px-2 py-0.5 rounded-md">
                                    <Clock size={12} /> {timeLeft}s
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Full Mode (Modal) - When IS my turn */}
                    {isMyTurn && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="glass-card max-w-sm w-full p-5 relative overflow-hidden border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.2)]"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-yellow-500/20 p-2 rounded-full">
                                            <Gavel className="text-yellow-500" size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h2 className="text-xl font-black text-white leading-none">ВАШ ХОД!</h2>
                                                <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-black font-mono shadow-lg">
                                                    ${currentBid}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider mt-1">Аукцион за {property.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
                                        <Clock size={14} className="text-red-400" />
                                        <span className="font-mono font-bold text-red-400">{timeLeft}s</span>
                                    </div>
                                </div>

                                {/* Current Bid Visualization */}
                                <div className="bg-black/40 rounded-xl p-4 mb-4 border border-white/5 text-center">
                                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Текущая ставка</div>
                                    <div className="text-4xl font-black text-white font-mono tracking-tighter shadow-yellow-500/10 drop-shadow-lg">
                                        ${currentBid}
                                    </div>
                                    {winningPlayerName && (
                                        <div className="text-xs mt-2 text-gray-500">
                                            Лидер: <span className={isWinning ? "text-green-400" : "text-white"}>{winningPlayerName}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={onPass}
                                        className="py-3 rounded-xl font-bold transition-all bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-white/5 flex items-center justify-center gap-2 group"
                                    >
                                        <XCircle size={18} className="group-hover:text-red-400 transition-colors" />
                                        ПАС
                                    </button>

                                    <button
                                        onClick={onRaise}
                                        className="py-3 rounded-xl font-bold transition-all bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-lg flex flex-col items-center justify-center leading-none border border-yellow-400/20"
                                    >
                                        <div className="flex items-center gap-1 text-sm">
                                            <span>ПОДНЯТЬ</span>
                                            <ArrowUpCircle size={14} />
                                        </div>
                                        <span className="text-[10px] opacity-80 mt-1 font-mono">+ $10</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </>
            )}
        </AnimatePresence>
    );
};

export default AuctionModal;

