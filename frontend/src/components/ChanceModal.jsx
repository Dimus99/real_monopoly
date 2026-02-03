import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, AlertCircle, Info, X } from 'lucide-react';

const ChanceModal = React.memo(({ show, data, onClose }) => {
    if (!data) return null;

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                    {/* Darker background with subtle blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                    />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        className="relative w-full max-w-[320px] bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-200"
                    >
                        {/* Header Snippet */}
                        <div className="bg-orange-500 p-2 text-center">
                            <div className="text-[10px] font-black tracking-widest uppercase text-white/90">
                                Chance / Шанс
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4">
                                <Newspaper size={24} />
                            </div>

                            <div className="text-xl font-bold text-slate-800 leading-tight mb-4 px-2">
                                {data.chance_card || 'Срочное сообщение!'}
                            </div>

                            <div className="w-12 h-1 bg-slate-100 mb-4 rounded-full" />

                            <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                События на геополитической арене меняют ход игры. Будьте готовы к последствиям.
                            </p>

                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-slate-200"
                            >
                                Понятно
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});

ChanceModal.displayName = 'ChanceModal';

export default ChanceModal;

