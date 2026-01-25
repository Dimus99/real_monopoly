import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow }) => {
    // Local state to show rapid number changes during rolling
    const [displayValues, setDisplayValues] = useState([1, 1]);

    useEffect(() => {
        let interval;
        if (rolling) {
            // Slower interval for better perception
            interval = setInterval(() => {
                setDisplayValues([
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ]);
            }, 50);
        } else if (values) {
            // When rolling stops, set to final values immediately
            setDisplayValues(values);
        }
        return () => clearInterval(interval);
    }, [rolling, values]);

    const Dot = ({ position }) => (
        <div
            className="absolute w-[18%] h-[18%] bg-[#1a1a1a] rounded-full"
            style={{
                top: position[0],
                left: position[1],
                transform: 'translate(-50%, -50%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)'
            }}
        />
    );

    const DiceFace = ({ value, isRolling, isGlow }) => {
        const dots = useMemo(() => {
            const pad = '25%';
            const mid = '50%';
            const end = '75%';
            switch (value) {
                case 1: return [[mid, mid]];
                case 2: return [[pad, pad], [end, end]];
                case 3: return [[pad, pad], [mid, mid], [end, end]];
                case 4: return [[pad, pad], [pad, end], [end, pad], [end, end]];
                case 5: return [[pad, pad], [pad, end], [mid, mid], [end, pad], [end, end]];
                case 6: return [[pad, pad], [pad, end], [mid, pad], [mid, end], [end, pad], [end, end]];
                default: return [];
            }
        }, [value]);

        return (
            <motion.div
                animate={isRolling ? {
                    x: [0, -4, 4, -4, 0],
                    y: [0, 4, -4, 4, 0],
                    rotate: [0, -2, 2, -2, 0],
                    scale: 0.95,
                } : {
                    scale: [0.8, 1.15, 1], // Impact "pop" when stopping
                    rotate: 0,
                    x: 0,
                    y: 0
                }}
                transition={isRolling ? {
                    duration: 0.15,
                    repeat: Infinity,
                } : {
                    duration: 0.4,
                    type: "spring",
                    stiffness: 400,
                    damping: 15
                }}
                className={`
                    relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl md:rounded-[2rem] shadow-2xl border-b-[6px] border-gray-300
                    flex items-center justify-center
                    ${isGlow && !isRolling ? 'ring-4 ring-yellow-400 shadow-[0_0_50px_rgba(255,215,0,0.8)]' : ''}
                `}
                style={{
                    background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #eeeeee 100%)'
                }}
            >
                {dots.map((pos, i) => <Dot key={i} position={pos} />)}
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md"
                >
                    <div className="flex gap-8 md:gap-16 mb-16 relative">
                        <DiceFace value={displayValues[0]} isRolling={rolling} isGlow={glow} />
                        <DiceFace value={displayValues[1]} isRolling={rolling} isGlow={glow} />
                    </div>

                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className={`bg-gray-900/90 backdrop-blur-xl px-12 py-5 rounded-3xl border-2 border-white/10 shadow-3xl text-center`}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <span className={`text-5xl font-black font-display tracking-tighter transition-colors duration-300 ${glow && !rolling ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'text-white'}`}>
                                {rolling ? "БРОСАЕМ..." : (displayValues[0] + displayValues[1])}
                            </span>
                            {!rolling && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-[11px] font-black uppercase tracking-[0.3em] text-yellow-500/70"
                                >
                                    Результат броска
                                </motion.span>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
