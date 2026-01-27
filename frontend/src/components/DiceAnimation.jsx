import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// Standard Dice Layout (Opposite sides sum to 7)
// We add a permanent tilt to the target rotations so the cube always looks 3D
const getRotation = (val) => {
    // baseRotation aligns the requested face to the front (Z+ axis)
    let baseRotation = { x: 0, y: 0 };
    switch (val) {
        case 1: baseRotation = { x: 0, y: 0 }; break;
        case 6: baseRotation = { x: 0, y: 180 }; break;
        case 2: baseRotation = { x: 0, y: -90 }; break;
        case 5: baseRotation = { x: 0, y: 90 }; break;
        case 3: baseRotation = { x: -90, y: 0 }; break;
        case 4: baseRotation = { x: 90, y: 0 }; break;
        default: baseRotation = { x: 0, y: 0 }; break;
    }

    // Add a 3D tilt (15 degrees) so we see Top and Right/Left faces
    return {
        x: baseRotation.x - 20,
        y: baseRotation.y + 25
    };
};

const DiceFace = ({ n }) => {
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

    const getFaceTransform = (n) => {
        const size = 49.5; // Slightly less than 50 to hide seams with a thick border
        switch (n) {
            case 1: return `translate3d(0, 0, ${size}px)`;
            case 6: return `rotateY(180deg) translate3d(0, 0, ${size}px)`;
            case 2: return `rotateY(90deg) translate3d(0, 0, ${size}px)`;
            case 5: return `rotateY(-90deg) translate3d(0, 0, ${size}px)`;
            case 3: return `rotateX(90deg) translate3d(0, 0, ${size}px)`;
            case 4: return `rotateX(-90deg) translate3d(0, 0, ${size}px)`;
            default: return `translate3d(0, 0, ${size}px)`;
        }
    };

    return (
        <div
            className="absolute w-[100px] h-[100px] bg-white rounded-2xl border-[3px] border-gray-100 flex items-center justify-center p-3 select-none"
            style={{
                transform: getFaceTransform(n),
                backfaceVisibility: 'hidden',
                boxShadow: 'inset 0 0 25px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.05)',
                background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 100%)',
            }}
        >
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                        {dots(n).includes(i) && (
                            <div
                                className="w-4 h-4 rounded-full bg-black shadow-inner"
                                style={{
                                    background: 'radial-gradient(circle at 35% 35%, #555 0%, #000 100%)',
                                    boxShadow: 'inset -2px -2px 4px rgba(255,255,255,0.2), 2px 2px 4px rgba(0,0,0,0.5)'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
            {/* Edge Bevel Overlay - Helps with the 3D look */}
            <div className="absolute inset-0 rounded-2xl border-[8px] border-black/5 pointer-events-none" />
        </div>
    );
};

const Cube = ({ value, isRolling, index, show }) => {
    const controls = useAnimation();

    useEffect(() => {
        if (show && isRolling) {
            const target = getRotation(value);

            // Randomize physics slightly
            const randomForceX = (Math.random() - 0.5) * 10;
            const randomForceY = (Math.random() - 0.5) * 10;

            controls.start({
                x: [index === 0 ? -400 : 400, index === 0 ? -100 : 100, 0],
                y: [400, -200, 0],
                z: [400, 100, 0],
                rotateX: [0, 720 * 2, (720 * 3) + target.x + randomForceX],
                rotateY: [0, 1080 * 2, (1080 * 3) + target.y + randomForceY],
                rotateZ: [0, 360, index * 90 + randomForceX],
                scale: [0.3, 1.2, 1],
                opacity: [0, 1, 1],
                transition: {
                    duration: 1.8,
                    times: [0, 0.5, 1],
                    ease: ["easeOut", "circOut"]
                }
            });
        }
    }, [show, isRolling, value, index, controls]);

    return (
        <div className="relative w-[100px] h-[100px]" style={{ perspective: '1200px' }}>
            <motion.div
                className="w-full h-full relative"
                style={{
                    transformStyle: 'preserve-3d',
                }}
                animate={controls}
                initial={{ opacity: 0, scale: 0.5, rotateX: -20, rotateY: 25 }}
            >
                {[1, 2, 3, 4, 5, 6].map(n => <DiceFace key={n} n={n} />)}
            </motion.div>

            {/* Premium Dynamic Shadow */}
            <motion.div
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/40 blur-2xl rounded-full -z-10"
                animate={isRolling ? {
                    scale: [0.5, 1.4, 1],
                    opacity: [0, 0.7, 0.5],
                    filter: ["blur(20px)", "blur(10px)", "blur(20px)"],
                    transition: { duration: 1.8, ease: "easeOut" }
                } : { scale: 1, opacity: 0.4 }}
            />
        </div>
    );
};

const DiceAnimation = ({ show, rolling, values, playerName }) => {
    const [displayValues, setDisplayValues] = useState([1, 1]);

    useEffect(() => {
        if (values && values.length === 2) {
            setDisplayValues(values);
        }
    }, [values]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none bg-black/60 backdrop-blur-md"
                >
                    <div className="flex gap-24 relative perspective-[1500px]">
                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -80 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-40 left-1/2 -translate-x-1/2 text-center w-full"
                            >
                                <span className="text-xs font-black text-blue-400 uppercase tracking-[1em] block mb-2">Текущий Ход</span>
                                <h2 className="text-6xl font-black text-white uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]">
                                    {playerName}
                                </h2>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} show={show} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} show={show} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="mt-32 flex flex-col items-center"
                        >
                            <div className="bg-white/5 backdrop-blur-2xl border border-white/20 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="text-[10px] text-blue-300 uppercase font-black tracking-[0.5em] mb-3 relative z-10">Результат Броска</span>
                                <span className="text-9xl font-black text-white leading-none relative z-10 font-mono italic">
                                    {displayValues[0] + displayValues[1]}
                                </span>
                            </div>

                            {displayValues[0] === displayValues[1] && (
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="mt-6 px-6 py-2 bg-yellow-500 text-black font-black text-xl rounded-full uppercase tracking-widest shadow-[0_0_30px_rgba(234,179,8,0.5)]"
                                >
                                    🚀 Дубль! 🚀
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

