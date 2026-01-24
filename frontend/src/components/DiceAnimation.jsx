import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow }) => {
    // Local state to show rapid number changes during rolling
    const [displayValues, setDisplayValues] = useState([1, 1]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
        } else if (!rolling && values) {
            // If rolling just ended, keep visible for 3 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000); // 3 seconds
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [show, rolling, values]);

    useEffect(() => {
        let interval;
        if (rolling) {
            interval = setInterval(() => {
                setDisplayValues([
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ]);
            }, 80);
        } else if (values) {
            // When rolling stops, set to final values
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
                    x: [0, -2, 2, -2, 0],
                    y: [0, 2, -2, 2, 0],
                    rotate: [0, -1, 1, -1, 0],
                } : {
                    scale: [0.9, 1.05, 1],
                }}
                transition={isRolling ? {
                    duration: 0.1,
                    repeat: Infinity,
                } : {
                    duration: 0.3,
                    type: "spring",
                    stiffness: 300
                }}
                className={`
                    relative w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl md:rounded-[2rem] shadow-xl border-b-4 border-gray-300
                    flex items-center justify-center
                    ${isGlow && !isRolling ? 'ring-4 ring-yellow-400 shadow-[0_0_40px_rgba(255,215,0,0.6)]' : ''}
                `}
                style={{
                    background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e8e8e8 100%)'
                }}
            >
                {dots.map((pos, i) => <Dot key={i} position={pos} />)}
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/40"
                >
                    <div className="flex gap-8 md:gap-12 mb-12 relative">
                        <DiceFace value={displayValues[0]} isRolling={rolling} isGlow={glow} />
                        <DiceFace value={displayValues[1]} isRolling={rolling} isGlow={glow} />
                    </div>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`bg-black/80 backdrop-blur-xl px-10 py-4 rounded-3xl border-2 border-white/10 shadow-2xl`}
                    >
                        <div className="flex flex-col items-center">
                            <span className={`text-4xl font-black font-display tracking-tighter ${glow && !rolling ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                                {rolling ? "БРОСАЕМ..." : (displayValues[0] + displayValues[1])}
                            </span>
                            {!rolling && (
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                                    Результат броска
                                </span>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
