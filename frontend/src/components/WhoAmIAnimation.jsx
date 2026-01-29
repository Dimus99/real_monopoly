import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Star, Sun, Cloud, Coffee } from 'lucide-react';

const WhoAmIAnimation = ({ isVisible, onClose }) => {
    const compliments = [
        "Ты — душа компании! ✨",
        "Твоя стратегия безупречна! 🏆",
        "Сегодня твой день! 🌟",
        "Ты прирожденный магнат! 💰",
        "Твоя улыбка освещает сервер! ☀️",
        "Ты — лучший игрок в этой комнате! 👑",
        "Гений, миллиардер, филантроп! 💎",
        "У тебя потрясающий вкус! 🎨"
    ];

    const icons = [Sparkles, Heart, Star, Sun, Cloud, Coffee];
    const [currentCompliment, setCurrentCompliment] = useState(compliments[0]);
    const [currentIcon, setCurrentIcon] = useState(0);

    useEffect(() => {
        if (isVisible) {
            const randomIdx = Math.floor(Math.random() * compliments.length);
            setCurrentCompliment(compliments[randomIdx]);
            setCurrentIcon(Math.floor(Math.random() * icons.length));
        }
    }, [isVisible]);

    const IconComponent = icons[currentIcon];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-indigo-950/90 backdrop-blur-xl cursor-pointer overflow-hidden"
                >
                    {/* Floating Background Particles */}
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                x: Math.random() * 2000 - 1000,
                                y: Math.random() * 2000 - 1000,
                                opacity: 0
                            }}
                            animate={{
                                x: Math.random() * 2000 - 1000,
                                y: Math.random() * 2000 - 1000,
                                opacity: [0, 0.3, 0],
                                scale: [0, 1, 0]
                            }}
                            transition={{
                                duration: Math.random() * 5 + 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="absolute w-2 h-2 bg-yellow-400 rounded-full blur-sm"
                        />
                    ))}

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        className="bg-white/10 p-12 rounded-[40px] border border-white/20 shadow-2xl backdrop-blur-md flex flex-col items-center gap-8 text-center max-w-lg mx-4"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-3xl shadow-lg"
                        >
                            <IconComponent size={64} className="text-white" />
                        </motion.div>

                        <div className="space-y-4">
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-white/60 uppercase tracking-[0.2em] text-sm font-bold"
                            >
                                Твой статус сегодня:
                            </motion.h2>
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-[length:200%_auto] animate-shimmer"
                            >
                                {currentCompliment}
                            </motion.h1>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="absolute bottom-10 text-white/40 text-sm font-medium tracking-widest uppercase flex items-center gap-2"
                    >
                        <span>Нажми везде, чтобы вернуться к игре</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WhoAmIAnimation;
