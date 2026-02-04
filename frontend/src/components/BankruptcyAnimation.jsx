import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BankruptcyAnimation = ({ isVisible, playerName, onComplete }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                if (onComplete) onComplete();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[1000] pointer-events-none overflow-hidden"
                >
                    {/* Darkening Overlay */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

                    {/* Cracks Overlay (SVG) */}
                    <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            d="M 50 50 L 20 10 M 50 50 L 80 20 M 50 50 L 90 60 M 50 50 L 40 90 M 50 50 L 10 70 M 50 50 L 5 40"
                            stroke="white"
                            strokeWidth="0.5"
                            fill="none"
                        />
                        <motion.path
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                            d="M 20 10 L 0 5 M 80 20 L 100 15 M 90 60 L 100 70 M 40 90 L 30 100 M 10 70 L 0 85"
                            stroke="white"
                            strokeWidth="0.3"
                            fill="none"
                        />
                    </svg>

                    {/* Main Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                            transition={{ duration: 0.6, type: "spring" }}
                            className="bg-red-600 px-8 py-4 rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.5)] border-4 border-white mb-8"
                        >
                            <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase">
                                БАНКРОТ!
                            </h2>
                        </motion.div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="text-2xl md:text-4xl text-gray-300 font-bold mb-2">
                                {playerName}
                            </div>
                            <div className="text-red-400 text-lg uppercase tracking-widest font-black">
                                ПОЛНОЕ ФИНАНСОВОЕ ФИАСКО
                            </div>
                        </motion.div>

                        {/* Falling Symbols */}
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    x: `${Math.random() * 100}vw`,
                                    y: -50,
                                    rotate: Math.random() * 360,
                                    opacity: 1
                                }}
                                animate={{
                                    y: '110vh',
                                    rotate: Math.random() * 720,
                                    opacity: [1, 1, 0]
                                }}
                                transition={{
                                    duration: 2 + Math.random() * 3,
                                    delay: Math.random() * 2,
                                    repeat: Infinity
                                }}
                                className="absolute text-2xl"
                            >
                                {['📉', '💸', '💔', '💩', '🏚️'][Math.floor(Math.random() * 5)]}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BankruptcyAnimation;
