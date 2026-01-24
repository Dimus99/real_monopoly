import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, AlertCircle, Info } from 'lucide-react';

const ChanceModal = ({ show, data, onClose }) => {
    if (!data) return null;

    return (
        <AnimatePresence>
            {show && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
                        className="relative w-full max-w-[340px] bg-[#f4f1ea] rounded-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-4 border-[#2c2c2c]"
                    >
                        {/* Newspaper Header */}
                        <div className="bg-[#2c2c2c] text-[#f4f1ea] p-4 flex flex-col items-center">
                            <div className="text-3xl font-black tracking-tighter uppercase font-display border-b-2 border-[#f4f1ea]/30 w-full text-center pb-1">
                                Political Daily
                            </div>
                            <div className="flex justify-between w-full text-[10px] uppercase tracking-widest pt-1 px-1 font-bold">
                                <span>Breaking News</span>
                                <span>Extra Edition</span>
                                <span>Washington-Moscow-Beijing</span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#2c2c2c] text-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                                <Newspaper size={40} />
                            </div>

                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl font-black text-[#1a1a1a] leading-tight mb-6 font-display italic"
                            >
                                "{data.chance_card || 'Breaking News!'}"
                            </motion.h2>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="w-full h-px bg-[#2c2c2c]/10 mb-6"
                            />

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="text-[#444] font-medium leading-relaxed mb-8"
                            >
                                Sources close to the administration confirm this sudden shift in geopolitical landscape. Citizens are advised to react accordingly.
                            </motion.p>

                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                onClick={onClose}
                                className="w-full py-4 bg-[#2c2c2c] hover:bg-[#1a1a1a] text-[#f4f1ea] rounded-lg font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                            >
                                Accept Fate
                            </motion.button>
                        </div>

                        {/* Bottom Decoration */}
                        <div className="h-2 bg-gradient-to-r from-red-600 via-white to-blue-600 w-full" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ChanceModal;
