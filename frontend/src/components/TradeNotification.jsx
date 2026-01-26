import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Check, X } from 'lucide-react';

const TradeNotification = ({ trade, fromPlayer, onRespond, board }) => {
    if (!trade || !fromPlayer) return null;

    const getPropName = (id) => board?.find(t => t.id === id)?.name || `#${id}`;

    return (
        <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed top-24 right-6 w-96 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]"
        >
            <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-500 rounded-lg text-black">
                    <ArrowLeftRight size={20} />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">ВХОДЯЩИЙ ОБМЕН</h3>
                    <div className="text-xs text-yellow-500">От {fromPlayer.name}</div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* They Offer */}
                <div>
                    <div className="text-xs text-gray-400 font-bold uppercase mb-2">Предлагают:</div>
                    <div className="bg-black/20 rounded-lg p-3 space-y-2">
                        {trade.offer_money > 0 && (
                            <div className="text-green-400 font-mono font-bold">+ ${trade.offer_money}</div>
                        )}
                        {trade.offer_properties.length > 0 ? (
                            <div className="space-y-1">
                                {trade.offer_properties.map(pid => (
                                    <div key={pid} className="text-sm text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        {getPropName(pid)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            trade.offer_money === 0 && <span className="text-gray-600 text-xs italic">Ничего</span>
                        )}
                    </div>
                </div>

                {/* They Want */}
                <div>
                    <div className="text-xs text-gray-400 font-bold uppercase mb-2">Хотят получить:</div>
                    <div className="bg-black/20 rounded-lg p-3 space-y-2">
                        {trade.request_money > 0 && (
                            <div className="text-red-400 font-mono font-bold">- ${trade.request_money}</div>
                        )}
                        {trade.request_properties.length > 0 ? (
                            <div className="space-y-1">
                                {trade.request_properties.map(pid => (
                                    <div key={pid} className="text-sm text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        {getPropName(pid)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            trade.request_money === 0 && <span className="text-gray-600 text-xs italic">Ничего</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                        onClick={() => onRespond(trade.id, 'reject')}
                        className="btn btn-danger btn-sm"
                    >
                        Отклонить
                    </button>
                    <button
                        onClick={() => onRespond(trade.id, 'accept')}
                        className="btn btn-success btn-sm"
                    >
                        Принять
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default TradeNotification;
