import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Clock, TrendingUp } from 'lucide-react';

const AuctionModal = ({
    isOpen,
    property,
    minBid,
    currentBids = {},
    timeLeft,
    onBid,
    onClose,
    currentPlayerId,
    players = {}
}) => {
    const [bidAmount, setBidAmount] = useState(minBid);

    // Calculate highest bid
    const highestBid = Object.keys(currentBids).length > 0
        ? Math.max(...Object.values(currentBids))
        : 0;

    const highestBidder = Object.entries(currentBids)
        .find(([_, amount]) => amount === highestBid)?.[0];

    const highestBidderName = highestBidder ? players[highestBidder]?.name : null;

    // Update bid amount when min bid changes
    useEffect(() => {
        const newMinBid = Math.max(minBid, highestBid + 10);
        if (bidAmount < newMinBid) {
            setBidAmount(newMinBid);
        }
    }, [minBid, highestBid]);

    const handleBid = () => {
        const requiredBid = Math.max(minBid, highestBid + 10);
        if (bidAmount >= requiredBid) {
            onBid(bidAmount);
        }
    };

    const isWinning = highestBidder === currentPlayerId;
    const requiredBid = Math.max(minBid, highestBid + 10);

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
                                    <p className="text-xs text-gray-400">Делайте ставки!</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-2 rounded-xl border border-orange-500/30">
                                <Clock size={20} className="text-orange-400" />
                                <span className="font-mono font-bold text-xl text-orange-400">{timeLeft}s</span>
                            </div>
                        </div>

                        {/* Property Info */}
                        <div className="relative bg-white/5 border border-white/10 p-4 rounded-xl mb-4">
                            <div className="text-sm text-gray-400 mb-1">Недвижимость</div>
                            <div className="text-xl font-bold text-white mb-2">{property.name}</div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Базовая цена:</span>
                                <span className="font-mono font-bold text-yellow-400">${property.price}</span>
                            </div>
                        </div>

                        {/* Current Highest Bid */}
                        {highestBid > 0 && (
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className={`p-4 rounded-xl mb-4 border ${isWinning
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-red-500/10 border-red-500/30'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={`text-sm font-bold ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
                                            {isWinning ? '🎉 Вы лидируете!' : '⚠️ Вас перебили!'}
                                        </div>
                                        {highestBidderName && (
                                            <div className="text-xs text-gray-400 mt-1">
                                                Лидер: {highestBidderName}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`text-2xl font-black ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
                                        ${highestBid}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Bid Input */}
                        <div className="relative mb-4">
                            <label className="text-sm text-gray-400 mb-2 block font-bold">Ваша ставка</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={bidAmount}
                                    onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                                    min={requiredBid}
                                    step={10}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-mono font-bold text-white focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                                    <button
                                        onClick={() => setBidAmount(Math.max(requiredBid, bidAmount - 10))}
                                        className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors"
                                    >
                                        −
                                    </button>
                                    <button
                                        onClick={() => setBidAmount(bidAmount + 10)}
                                        className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <TrendingUp size={12} />
                                Минимальная ставка: ${requiredBid}
                            </div>
                        </div>

                        {/* Bid Button */}
                        <button
                            onClick={handleBid}
                            disabled={bidAmount < requiredBid}
                            className={`w-full py-4 rounded-xl font-black text-lg transition-all transform ${bidAmount >= requiredBid
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black shadow-lg hover:scale-105 hover:shadow-xl'
                                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {bidAmount >= requiredBid
                                ? `💰 Поставить $${bidAmount}`
                                : `Минимум $${requiredBid}`
                            }
                        </button>

                        {/* Bid History */}
                        {Object.keys(currentBids).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="text-xs text-gray-400 mb-2 font-bold">История ставок</div>
                                <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                    {Object.entries(currentBids)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([playerId, amount]) => (
                                            <div
                                                key={playerId}
                                                className={`flex items-center justify-between text-xs p-2 rounded-lg ${playerId === currentPlayerId
                                                        ? 'bg-blue-500/10 text-blue-400'
                                                        : 'bg-white/5 text-gray-400'
                                                    }`}
                                            >
                                                <span className="font-medium">
                                                    {players[playerId]?.name || 'Игрок'}
                                                    {playerId === currentPlayerId && ' (Вы)'}
                                                </span>
                                                <span className="font-mono font-bold">${amount}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AuctionModal;
