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
            }, 80);
        } else if (values && values.length === 2) {
            setDisplayValues(values);
        }
        return () => clearInterval(interval);
    }, [show, rolling, values]);

    // 3D Dice Face with dots
    const DiceFace = ({ value, isRolling }) => {
        const dotPositions = {
            1: [[50, 50]],
            2: [[30, 30], [70, 70]],
            3: [[30, 30], [50, 50], [70, 70]],
            4: [[30, 30], [70, 30], [30, 70], [70, 70]],
            5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
            6: [[30, 30], [70, 30], [30, 50], [70, 50], [30, 70], [70, 70]]
        };

        const dots = dotPositions[value] || dotPositions[1];

        return (
            <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-white via-gray-100 to-gray-200 shadow-inner overflow-hidden">
                {/* Shine effect */}
                <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-white/60 to-transparent rounded-tl-xl" />

                {dots.map((pos, i) => (
                    <motion.div
                        key={i}
                        initial={isRolling ? { scale: 0.8 } : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: isRolling ? 0 : i * 0.05 }}
                        className="absolute w-[18%] h-[18%] bg-gradient-to-br from-gray-900 to-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                            left: `${pos[0]}%`,
                            top: `${pos[1]}%`,
                            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)'
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, y: -50 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="flex flex-col items-center justify-center pointer-events-none z-[200]"
                >
                    {/* Dark backdrop blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl"
                        style={{ margin: '-50px' }}
                    />

                    {/* Title */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="relative mb-6 px-6 py-2 bg-black/80 border border-yellow-500/50 rounded-full shadow-xl"
                    >
                        <span className="text-yellow-400 font-black text-sm uppercase tracking-[0.3em]">
                            {rolling ? "🎲 Rolling..." : `Result: ${displayValues[0] + displayValues[1]}`}
                        </span>
                    </motion.div>

                    <div className="relative flex gap-8 md:gap-12">
                        {/* Left Die */}
                        <motion.div
                            initial={{ x: -100, rotate: -180, opacity: 0 }}
                            animate={{ x: 0, rotate: 0, opacity: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                            className="w-20 h-20 md:w-28 md:h-28 relative"
                        >
                            <motion.div
                                animate={rolling ? {
                                    rotateX: [0, 360],
                                    rotateY: [0, 360],
                                    y: [0, -30, 0],
                                } : {
                                    rotateX: 0,
                                    rotateY: 0,
                                    y: 0,
                                }}
                                transition={rolling ? {
                                    duration: 0.4,
                                    repeat: Infinity,
                                    ease: 'easeInOut'
                                } : {
                                    type: 'spring',
                                    damping: 10,
                                    stiffness: 100
                                }}
                                className="w-full h-full rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/90 overflow-hidden"
                                style={{
                                    transformStyle: 'preserve-3d',
                                    perspective: '1000px'
                                }}
                            >
                                <DiceFace value={displayValues[0]} isRolling={rolling} />
                            </motion.div>

                            {/* Shadow */}
                            <motion.div
                                animate={rolling ? {
                                    scale: [1, 0.6, 1],
                                    opacity: [0.3, 0.1, 0.3]
                                } : {
                                    scale: 1,
                                    opacity: 0.3
                                }}
                                transition={rolling ? { duration: 0.4, repeat: Infinity } : {}}
                                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/50 blur-xl rounded-full"
                            />
                        </motion.div>

                        {/* Plus sign */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center justify-center text-yellow-400 font-black text-3xl drop-shadow-lg"
                        >
                            +
                        </motion.div>

                        {/* Right Die */}
                        <motion.div
                            initial={{ x: 100, rotate: 180, opacity: 0 }}
                            animate={{ x: 0, rotate: 0, opacity: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
                            className="w-20 h-20 md:w-28 md:h-28 relative"
                        >
                            <motion.div
                                animate={rolling ? {
                                    rotateX: [0, -360],
                                    rotateY: [0, -360],
                                    y: [0, -30, 0],
                                } : {
                                    rotateX: 0,
                                    rotateY: 0,
                                    y: 0,
                                }}
                                transition={rolling ? {
                                    duration: 0.4,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                    delay: 0.05
                                } : {
                                    type: 'spring',
                                    damping: 10,
                                    stiffness: 100
                                }}
                                className="w-full h-full rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white/90 overflow-hidden"
                                style={{
                                    transformStyle: 'preserve-3d',
                                    perspective: '1000px'
                                }}
                            >
                                <DiceFace value={displayValues[1]} isRolling={rolling} />
                            </motion.div>

                            {/* Shadow */}
                            <motion.div
                                animate={rolling ? {
                                    scale: [1, 0.6, 1],
                                    opacity: [0.3, 0.1, 0.3]
                                } : {
                                    scale: 1,
                                    opacity: 0.3
                                }}
                                transition={rolling ? { duration: 0.4, repeat: Infinity, delay: 0.05 } : {}}
                                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/50 blur-xl rounded-full"
                            />
                        </motion.div>
                    </div>

                    {/* Total display when not rolling */}
                    {!rolling && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: 'spring' }}
                            className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl shadow-xl"
                        >
                            <span className="font-mono font-black text-2xl text-white drop-shadow-md">
                                = {displayValues[0] + displayValues[1]}
                            </span>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
