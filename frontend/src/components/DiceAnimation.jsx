import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values }) => {
    const [displayValues, setDisplayValues] = useState([1, 1]);

    // Handle random rolling effect
    useEffect(() => {
        let interval;
        if (show && rolling) {
            interval = setInterval(() => {
                setDisplayValues([
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ]);
            }, 60); // Faster shuffle for more energy
        } else if (values) {
            setDisplayValues(values);
        }
        return () => clearInterval(interval);
    }, [show, rolling, values]);

    // Dice dot patterns
    const DiceFace = ({ value }) => {
        const dotPositions = {
            1: [[50, 50]],
            2: [[25, 25], [75, 75]],
            3: [[25, 25], [50, 50], [75, 75]],
            4: [[25, 25], [75, 25], [25, 75], [75, 75]],
            5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
            6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
        };

        const dots = dotPositions[value] || dotPositions[1];

        return (
            <div className="relative w-full h-full bg-white rounded-[inherit] shadow-inner overflow-hidden">
                {/* Subtle texture/gradient on the face */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-200 opacity-50" />
                {dots.map((pos, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute w-[20%] h-[20%] bg-zinc-900 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"
                        style={{ left: `${pos[0]}%`, top: `${pos[1]}%`, zIndex: 5 }}
                    />
                ))}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 1.5, rotate: 15 }}
                    className="flex flex-col items-center justify-center p-12 pointer-events-none z-[200]"
                >
                    {/* Background Glow */}
                    <div className="absolute inset-0 bg-yellow-500/20 blur-[100px] rounded-full animate-pulse" />

                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="mb-8 px-6 py-2 bg-black/80 backdrop-blur-xl border border-yellow-500/40 rounded-full shadow-2xl"
                    >
                        <span className="text-yellow-400 font-black text-sm uppercase tracking-[0.4em] animate-pulse">
                            {rolling ? "Rolling Fortune..." : "The Result"}
                        </span>
                    </motion.div>

                    <div className="flex gap-16 md:gap-24 relative">
                        {/* Left Die */}
                        <motion.div
                            initial={{ x: -150, rotate: -90, opacity: 0 }}
                            animate={{ x: 0, rotate: 0, opacity: 1 }}
                            className="w-28 h-28 md:w-40 md:h-40 relative group"
                        >
                            <motion.div
                                animate={rolling ? {
                                    rotateX: [0, 360, 720, 1080],
                                    rotateY: [0, 180, 360, 540],
                                    y: [0, -60, 0, -30, 0],
                                    scale: [1, 1.25, 1, 1.15, 1]
                                } : {
                                    rotateX: 0,
                                    rotateY: 0,
                                    y: 0,
                                    scale: 1.1,
                                    boxShadow: "0 0 30px rgba(255,215,0,0.3)"
                                }}
                                transition={rolling ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" } : { type: 'spring', damping: 8, stiffness: 100 }}
                                className="dice w-full h-full rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] bg-white border-2 border-white/80 overflow-hidden"
                            >
                                <DiceFace value={displayValues[0]} />
                            </motion.div>
                            <motion.div
                                animate={rolling ? { scale: [1, 0.5, 1], opacity: [0.4, 0.1, 0.4] } : { scale: 1, opacity: 0.3 }}
                                className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-28 h-6 bg-black/50 blur-2xl rounded-full z-[-1]"
                            />
                        </motion.div>

                        {/* Right Die */}
                        <motion.div
                            initial={{ x: 150, rotate: 90, opacity: 0 }}
                            animate={{ x: 0, rotate: 0, opacity: 1 }}
                            className="w-28 h-28 md:w-40 md:h-40 relative group"
                        >
                            <motion.div
                                animate={rolling ? {
                                    rotateX: [0, -360, -720, -1080],
                                    rotateY: [0, -180, -360, -540],
                                    y: [0, -60, 0, -30, 0],
                                    scale: [1, 1.25, 1, 1.15, 1]
                                } : {
                                    rotateX: 0,
                                    rotateY: 0,
                                    y: 0,
                                    scale: 1.1,
                                    boxShadow: "0 0 30px rgba(255,215,0,0.3)"
                                }}
                                transition={rolling ? { duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.05 } : { type: 'spring', damping: 8, stiffness: 100 }}
                                className="dice w-full h-full rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] bg-white border-2 border-white/80 overflow-hidden"
                            >
                                <DiceFace value={displayValues[1]} />
                            </motion.div>
                            <motion.div
                                animate={rolling ? { scale: [1, 0.5, 1], opacity: [0.4, 0.1, 0.4] } : { scale: 1, opacity: 0.3 }}
                                className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-28 h-6 bg-black/50 blur-2xl rounded-full z-[-1]"
                            />
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
