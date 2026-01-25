import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow }) => {
    // Local state to show rapid number changes during rolling
    const [displayValues, setDisplayValues] = useState([1, 1]);

    useEffect(() => {
        let timeoutId;
        let currentDelay = 50;

        const animateRoll = () => {
            if (rolling) {
                setDisplayValues([
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1
                ]);

                // Slow down gradually
                currentDelay = Math.min(currentDelay * 1.1, 400);
                timeoutId = setTimeout(animateRoll, currentDelay);
            }
        };

        if (rolling) {
            currentDelay = 50; // Reset speed on start
            animateRoll();
        } else if (values) {
            // Stop and show final values
            clearTimeout(timeoutId);
            setDisplayValues(values);
        }

        return () => clearTimeout(timeoutId);
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
                    x: [0, -8, 8, -8, 0],
                    y: [0, 8, -8, 8, 0],
                    rotate: [0, 180, 360], /* Full rotation */
                    scale: [1, 0.9, 0.95, 1],
                } : {
                    scale: [0.8, 1.15, 1], // Impact "pop" when stopping
                    rotate: 0,
                    x: 0,
                    y: 0
                }}
                transition={isRolling ? {
                    duration: 0.4,
                    repeat: Infinity,
                    ease: "linear"
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm"
                >
                    <div className="flex gap-8 md:gap-12 relative p-12">
                        {/* Glow effect background */}
                        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full" />

                        <DiceFace value={displayValues[0]} isRolling={rolling} isGlow={glow} />
                        <DiceFace value={displayValues[1]} isRolling={rolling} isGlow={glow} />
                    </div>

                    {/* Result Sum Indicator - Shows ONLY after rolling stops */}
                    <AnimatePresence>
                        {!rolling && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="mt-8 bg-black/80 text-white px-8 py-2 rounded-full border border-white/10 shadow-2xl backdrop-blur-md"
                            >
                                <span className="text-3xl font-black font-mono tracking-widest">
                                    {displayValues[0] + displayValues[1]}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
