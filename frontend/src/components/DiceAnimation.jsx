import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow }) => {
    // Local state to show rapid transforms during rolling
    const [displayValues, setDisplayValues] = useState([1, 1]);

    useEffect(() => {
        if (!rolling && values) {
            setDisplayValues(values);
        }
    }, [rolling, values]);

    const getRotation = (val) => {
        switch (val) {
            case 1: return { rotateY: 0, rotateX: 0 };
            case 2: return { rotateY: -90, rotateX: 0 };
            case 3: return { rotateY: 0, rotateX: -90 };
            case 4: return { rotateY: 0, rotateX: 90 };
            case 5: return { rotateY: 90, rotateX: 0 };
            case 6: return { rotateY: 180, rotateX: 0 };
            default: return { rotateY: 0, rotateX: 0 };
        }
    };

    const Cube = ({ value, isRolling, isGlow }) => {
        const dots = (face) => {
            switch (face) {
                case 1: return [4];
                case 2: return [0, 8];
                case 3: return [0, 4, 8];
                case 4: return [0, 2, 6, 8];
                case 5: return [0, 2, 4, 6, 8];
                case 6: return [0, 2, 3, 5, 6, 8];
                default: return [];
            }
        };

        const Face = ({ n, className }) => (
            <div className={`cube-face face-${n} ${className}`}>
                <div className="dot-container">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className={dots(n).includes(i) ? 'dice-dot' : ''} />
                    ))}
                </div>
            </div>
        );

        return (
            <div className="dice-container">
                <motion.div
                    className="cube"
                    animate={isRolling ? {
                        rotateX: [0, 1800],
                        rotateY: [0, 1800],
                        rotateZ: [0, 720],
                        y: [0, -200, 0, -50, 0], // Double bounce
                        scale: [1, 1.5, 1]
                    } : {
                        ...getRotation(value),
                        y: 0,
                        scale: 1,
                        rotateZ: 0
                    }}
                    transition={isRolling ? {
                        duration: 2.0, // Matches the wait time
                        ease: "circOut", // Slows down naturally
                        repeat: 0
                    } : {
                        duration: 0.5,
                        ease: "easeOut"
                    }}
                >
                    <Face n={1} />
                    <Face n={2} />
                    <Face n={3} />
                    <Face n={4} />
                    <Face n={5} />
                    <Face n={6} />
                </motion.div>
                {isGlow && !isRolling && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        className="absolute inset-0 rounded-full bg-yellow-400/20 blur-2xl -z-10"
                    />
                )}
            </div>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    <div className="flex gap-4 md:gap-12 relative p-12">
                        <Cube value={displayValues[0]} isRolling={rolling} isGlow={glow} />
                        <Cube value={displayValues[1]} isRolling={rolling} isGlow={glow} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 bg-white/10 backdrop-blur-xl px-10 py-3 rounded-2xl border border-white/20 shadow-2xl"
                        >
                            <span className="text-4xl font-black text-white font-game">
                                {displayValues[0] + displayValues[1]}
                            </span>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
