import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Clock, TrendingUp, AlertCircle } from 'lucide-react';

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

    // Status message
    let statusMessage = "";
    let statusColor = "text-gray-400";

    if (isMyTurn) {
        statusMessage = "Ваш ход! Поднимите ставку или спасуйте.";
        statusColor = "text-yellow-400";
    } else {
        statusMessage = `Ход игрока ${activePlayerName}...`;
        statusColor = "text-blue-400";
    }

    return (
        <AnimatePresence>
            {isOpen && property && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="glass-card max-w-md w-full p-6 relative overflow-hidden"
                    >
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 pointer-events-none" />

                        {/* Header */}
                        <div className="relative flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                    <Gavel className="text-yellow-500" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">Аукцион</h2>
                                    <p className={`text-xs font-bold ${statusColor}`}>{statusMessage}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isMyTurn ? 'bg-red-500/20 border-red-500/40 animate-pulse' : 'bg-gray-700/50 border-white/10'}`}>
                                <Clock size={20} className={isMyTurn ? "text-red-400" : "text-gray-400"} />
                                <span className={`font-mono font-bold text-xl ${isMyTurn ? "text-red-400" : "text-gray-400"}`}>{timeLeft}s</span>
                            </div>
                        </div>

                        {/* Property Info */}
                        <div className="relative bg-white/5 border border-white/10 p-4 rounded-xl mb-6">
                            <div className="text-sm text-gray-400 mb-1">Лот</div>
                            <div className="text-2xl font-bold text-white mb-2">{property.name}</div>

                            <div className="flex items-center justify-between mt-4 p-3 bg-black/40 rounded-lg border border-white/5">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase font-bold">Текущая ставка</div>
                                    <div className="text-3xl font-mono font-black text-yellow-400">${currentBid}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Лидер</div>
                                    <div className={`font-bold truncate max-w-[120px] ${isWinning ? 'text-green-400' : 'text-white'}`}>
                                        {winningPlayerName} {isWinning && '(Вы)'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3 relative">
                            {/* Pass Button */}
                            <button
                                onClick={onPass}
                                disabled={!isMyTurn}
                                className={`py-4 rounded-xl font-bold text-lg transition-all ${isMyTurn
                                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                Пас
                            </button>

                            {/* Raise Button */}
                            <button
                                onClick={onRaise}
                                disabled={!isMyTurn}
                                className={`py-4 rounded-xl font-black text-lg transition-all flex flex-col items-center justify-center leading-tight ${isMyTurn
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:scale-105 hover:shadow-xl'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                <span>Поднять +$10</span>
                                <span className="text-xs opacity-70 font-mono">${currentBid + 10}</span>
                            </button>
                        </div>

                        {!isMyTurn && (
                            <div className="mt-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                Ожидание хода игрока {activePlayerName}...
                            </div>
                        )}

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AuctionModal;
