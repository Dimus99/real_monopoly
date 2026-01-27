import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, DollarSign, Check } from 'lucide-react';

const TradeModal = ({ isOpen, onClose, fromPlayer, toPlayer, gameState, onSendOffer }) => {
    const [offerMoney, setOfferMoney] = useState(0);
    const [requestMoney, setRequestMoney] = useState(0);
    const [selectedOfferProps, setSelectedOfferProps] = useState([]);
    const [selectedRequestProps, setSelectedRequestProps] = useState([]);

    if (!isOpen) return null;

    const fromProps = gameState.board.filter(t => t.owner_id === fromPlayer.id);
    const toProps = gameState.board.filter(t => t.owner_id === toPlayer.id);

    // Calculate total values for offer and request
    const offerPropsValue = selectedOfferProps.reduce((sum, propId) => {
        const prop = gameState.board.find(t => t.id === propId);
        return sum + (prop?.price || 0);
    }, 0);
    const offerTotal = (parseInt(offerMoney) || 0) + offerPropsValue;

    const requestPropsValue = selectedRequestProps.reduce((sum, propId) => {
        const prop = gameState.board.find(t => t.id === propId);
        return sum + (prop?.price || 0);
    }, 0);
    const requestTotal = (parseInt(requestMoney) || 0) + requestPropsValue;

    const toggleProp = (id, list, setList) => {
        if (list.includes(id)) {
            setList(list.filter(item => item !== id));
        } else {
            setList([...list, id]);
        }
    };

    const handleSend = () => {
        onSendOffer({
            to_player_id: toPlayer.id,
            offer_money: parseInt(offerMoney) || 0,
            offer_properties: selectedOfferProps,
            request_money: parseInt(requestMoney) || 0,
            request_properties: selectedRequestProps
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
                <div className="bg-[#1a1b26] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                        <h2 className="text-2xl font-bold text-white font-display tracking-wider">ПРЕДЛОЖЕНИЕ ОБМЕНА</h2>
                        <button onClick={onClose} className="btn-ghost">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                        {/* LEFT: YOUR OFFER */}
                        <div className="p-6 flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <img src={fromPlayer.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" />
                                    <div>
                                        <div className="text-sm text-gray-400 font-bold uppercase">Вы предлагаете</div>
                                        <div className="text-white font-bold">{fromPlayer.name}</div>
                                    </div>
                                </div>
                                {offerTotal > 0 && (
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 uppercase">Итого</div>
                                        <div className="text-lg font-bold text-yellow-400">${offerTotal.toLocaleString()}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {/* Money */}
                                <div className="mb-6">
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Деньги ($)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            value={offerMoney}
                                            onChange={e => setOfferMoney(e.target.value)}
                                            max={fromPlayer.money}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                        />
                                        <div className="text-xs text-gray-500 mt-1 text-right">Макс: ${fromPlayer.money}</div>
                                    </div>
                                </div>

                                {/* Properties */}
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Недвижимость</label>
                                    <div className="space-y-2">
                                        {fromProps.length === 0 ? (
                                            <div className="text-gray-600 text-sm italic">Нет недвижимости для обмена</div>
                                        ) : (
                                            fromProps.map(prop => (
                                                <div
                                                    key={prop.id}
                                                    onClick={() => toggleProp(prop.id, selectedOfferProps, setSelectedOfferProps)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${selectedOfferProps.includes(prop.id)
                                                        ? 'bg-green-500/20 border-green-500/50'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full bg-${prop.group === 'Special' ? 'gray' : prop.group.toLowerCase()}-500`} />
                                                        <div>
                                                            <div className="text-white font-medium">{prop.name}</div>
                                                            <div className="text-xs text-gray-400 opacity-60">${prop.price}</div>
                                                        </div>
                                                    </div>
                                                    {selectedOfferProps.includes(prop.id) && <Check size={16} className="text-green-400" />}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: THEIR OFFER */}
                        <div className="p-6 flex flex-col overflow-hidden bg-black/20">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <img src={toPlayer.avatar} className="w-10 h-10 rounded-full border-2 border-white/20" />
                                    <div>
                                        <div className="text-sm text-gray-400 font-bold uppercase">Вы получаете</div>
                                        <div className="text-white font-bold">{toPlayer.name}</div>
                                    </div>
                                </div>
                                {requestTotal > 0 && (
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 uppercase">Итого</div>
                                        <div className="text-lg font-bold text-green-400">${requestTotal.toLocaleString()}</div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                {/* Money */}
                                <div className="mb-6">
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Деньги ($)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            value={requestMoney}
                                            onChange={e => setRequestMoney(e.target.value)}
                                            max={toPlayer.money}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-white focus:outline-none focus:border-yellow-500 transition-colors"
                                        />
                                        <div className="text-xs text-gray-500 mt-1 text-right">Макс: ${toPlayer.money}</div>
                                    </div>
                                </div>

                                {/* Properties */}
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Недвижимость</label>
                                    <div className="space-y-2">
                                        {toProps.length === 0 ? (
                                            <div className="text-gray-600 text-sm italic">Нет доступной недвижимости</div>
                                        ) : (
                                            toProps.map(prop => (
                                                <div
                                                    key={prop.id}
                                                    onClick={() => toggleProp(prop.id, selectedRequestProps, setSelectedRequestProps)}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${selectedRequestProps.includes(prop.id)
                                                        ? 'bg-blue-500/20 border-blue-500/50'
                                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-3 h-3 rounded-full bg-${prop.group === 'Special' ? 'gray' : prop.group.toLowerCase()}-500`} />
                                                        <div>
                                                            <div className="text-white font-medium">{prop.name}</div>
                                                            <div className="text-xs text-gray-400 opacity-60">${prop.price}</div>
                                                        </div>
                                                    </div>
                                                    {selectedRequestProps.includes(prop.id) && <Check size={16} className="text-blue-400" />}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Отмена
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={
                                (offerMoney <= 0 && selectedOfferProps.length === 0 && requestMoney <= 0 && selectedRequestProps.length === 0) ||
                                offerMoney > fromPlayer.money ||
                                requestMoney > toPlayer.money
                            }
                            className="btn btn-primary px-8"
                        >
                            Отправить <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TradeModal;
