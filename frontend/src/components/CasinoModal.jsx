import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices } from 'lucide-react';

const DiceIcon = ({ value, size = 24, className }) => {
    switch (value) {
        case 1: return <Dice1 size={size} className={className} />;
        case 2: return <Dice2 size={size} className={className} />;
        case 3: return <Dice3 size={size} className={className} />;
        case 4: return <Dice4 size={size} className={className} />;
        case 5: return <Dice5 size={size} className={className} />;
        case 6: return <Dice6 size={size} className={className} />;
        default: return <Dice1 size={size} className={className} />;
    }
};

const CasinoModal = ({ onClose, onBet }) => {
    const [selectedNumbers, setSelectedNumbers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleNumber = (num) => {
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else {
            if (selectedNumbers.length >= 3) return;
            setSelectedNumbers([...selectedNumbers, num]);
        }
    };

    const handleBet = async () => {
        if (selectedNumbers.length === 0) return;
        setIsSubmitting(true);
        onBet(selectedNumbers);
        // Don't close immediately, wait for server result or parent to close
    };

    const calculatePotentialWin = () => {
        const count = selectedNumbers.length;
        if (count === 1) return 3000;
        if (count === 2) return 1500;
        if (count === 3) return 1000;
        return 0;
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#1a1b26] border border-yellow-500/30 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-900/20 p-6 text-center border-b border-white/10">
                        <Dices className="mx-auto text-yellow-400 mb-2" size={48} />
                        <h2 className="text-3xl font-black text-white font-display uppercase tracking-widest">
                            КАЗИНО
                        </h2>
                        <div className="text-yellow-400 font-bold text-sm mt-1">
                            Испытай удачу или потеряй все!
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="text-gray-300 text-center mb-6 text-sm">
                            Выберите от 1 до 3 чисел. Если выпадет ваше число — вы выиграли!
                            <br />
                            <span className="text-red-400 font-bold block mt-2">
                                ОСТОРОЖНО: Проигрыш означает РЕВОЛЮЦИЮ (конец игры).
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[1, 2, 3, 4, 5, 6].map(num => (
                                <button
                                    key={num}
                                    onClick={() => toggleNumber(num)}
                                    className={`relative h-16 rounded-xl flex items-center justify-center transition-all ${selectedNumbers.includes(num)
                                        ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-105'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    <DiceIcon value={num} size={32} />
                                    {selectedNumbers.includes(num) && (
                                        <motion.div
                                            layoutId="check"
                                            className="absolute -top-2 -right-2 bg-white text-black rounded-full p-0.5"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </motion.div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-gray-400">Вероятность:</span>
                                <span className="text-white font-mono">
                                    {selectedNumbers.length > 0
                                        ? `${Math.round((selectedNumbers.length / 6) * 100)}%`
                                        : '0%'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-gray-400">Выигрыш:</span>
                                <span className="text-yellow-400 font-bold font-mono text-lg">
                                    ${calculatePotentialWin()}
                                </span>
                            </div>

                            <button
                                onClick={handleBet}
                                disabled={selectedNumbers.length === 0 || isSubmitting}
                                className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all mb-3 ${selectedNumbers.length > 0
                                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? 'Ставки сделаны...' : 'СДЕЛАТЬ СТАВКУ'}
                            </button>

                            <button
                                onClick={() => onBet([])}
                                disabled={isSubmitting}
                                className="w-full py-2 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Отказаться от игры (Штраф $50)
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CasinoModal;
