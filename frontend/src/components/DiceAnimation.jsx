import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow, playerName }) => {
    // Local state to track displayed values to avoid jumping
    const [displayValues, setDisplayValues] = useState([1, 1]);

    useEffect(() => {
        if (values) {
            setDisplayValues(values);
        }
    }, [values]);

    const getRotation = (val) => {
        switch (val) {
            case 1: return { x: 0, y: 0 };
            case 2: return { x: 0, y: -90 };
            case 3: return { x: -90, y: 0 };
            case 4: return { x: 90, y: 0 };
            case 5: return { x: 0, y: 90 };
            case 6: return { x: 0, y: 180 };
            default: return { x: 0, y: 0 };
        }
    };

    const Cube = ({ value, isRolling, index }) => {
        const controls = useAnimation();
        const prevValue = useRef(value);

        // Sequence animation logic
        useEffect(() => {
            if (show && isRolling) {
                const target = getRotation(value);
                const randomX = (Math.random() - 0.5) * 400;
                const randomY = -200 - Math.random() * 200;

                // Throwing sequence
                controls.start({
                    x: [randomX, 0],
                    y: [randomY, 0],
                    z: [300, 0],
                    rotateX: [0, 1080 + target.x],
                    rotateY: [0, 1440 + target.y],
                    rotateZ: [0, 360 + (index * 180)],
                    scale: [0.4, 1.1, 1],
                    opacity: [0, 1],
                    filter: ["blur(4px)", "blur(0px)"],
                    transition: {
                        duration: 2.0,
                        ease: [0.16, 1, 0.3, 1], // Power4 easeOut
                    }
                });
            }
        }, [show]); // Only trigger when the overlay appears

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
                {/* Glossy overlay for face */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/20 pointer-events-none" />
            </div>
        );

        return (
            <div className="dice-container relative">
                <motion.div
                    className="cube"
                    animate={controls}
                    initial={{ opacity: 0, scale: 0.2 }}
                >
                    <Face n={1} />
                    <Face n={2} />
                    <Face n={3} />
                    <Face n={4} />
                    <Face n={5} />
                    <Face n={6} />
                </motion.div>

                {/* Shadow */}
                <motion.div
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-5 bg-black/60 blur-2xl rounded-full -z-10"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={show ? {
                        scale: [0.5, 1.2, 1],
                        opacity: [0.2, 0.6, 0.5],
                        transition: { duration: 2, ease: "easeOut" }
                    } : {}}
                />
            </div>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm"
                >
                    <div className="flex gap-10 md:gap-32 relative p-20">
                        {/* Player Name Label */}
                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -60, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", delay: 0.1 }}
                                className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.5em] mb-1">
                                        Ход Игрока
                                    </span>
                                    <span className="text-5xl font-black text-white uppercase tracking-tighter font-display drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                        {playerName}
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="mt-4 flex flex-col items-center gap-1"
                        >
                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl px-16 py-6 rounded-[2.5rem] border border-white/20 shadow-2xl flex flex-col items-center relative overflow-hidden group">
                                {/* Inner animated glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse" />

                                <span className="text-xs text-blue-300 uppercase font-black tracking-[0.3em] mb-2 z-10">Сумма Броска</span>
                                <span className="text-8xl font-black text-white font-game drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] leading-none z-10 italic">
                                    {displayValues[0] + displayValues[1]}
                                </span>
                            </div>

                            {displayValues[0] === displayValues[1] && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="text-yellow-400 font-black text-2xl uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] mt-4"
                                >
                                    🚀 Двойной Шанс! 🚀
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
