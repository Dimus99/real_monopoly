import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const getRotation = (val) => {
    let base = { x: 0, y: 0 };
    switch (val) {
        case 1: base = { x: 0, y: 0 }; break;
        case 6: base = { x: 0, y: 180 }; break;
        case 2: base = { x: 0, y: -90 }; break;
        case 5: base = { x: 0, y: 90 }; break;
        case 3: base = { x: -90, y: 0 }; break;
        case 4: base = { x: 90, y: 0 }; break;
        default: break;
    }
    // Always land with a 3D perspective tilt
    return {
        x: base.x - 25,
        y: base.y + 30
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

    const getFaceStyle = (n) => {
        const s = 49.5;
        let transform = "";
        switch (n) {
            case 1: transform = `rotateY(0deg) translateZ(${s}px)`; break;
            case 6: transform = `rotateY(180deg) translateZ(${s}px)`; break;
            case 2: transform = `rotateY(90deg) translateZ(${s}px)`; break;
            case 5: transform = `rotateY(-90deg) translateZ(${s}px)`; break;
            case 3: transform = `rotateX(90deg) translateZ(${s}px)`; break;
            case 4: transform = `rotateX(-90deg) translateZ(${s}px)`; break;
            default: break;
        }

        return {
            transform,
            backfaceVisibility: 'hidden',
            background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f0f0f0 100%)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.2)',
            transformStyle: 'preserve-3d'
        };
    };

    return (
        <div
            className="absolute w-full h-full bg-white rounded-[1.25rem] border-2 border-gray-100 flex items-center justify-center p-3 select-none"
            style={getFaceStyle(n)}
        >
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                        {dots(n).includes(i) && (
                            <div
                                className="w-4 h-4 rounded-full bg-black shadow-lg"
                                style={{
                                    background: 'radial-gradient(circle at 35% 35%, #444 0%, #000 100%)',
                                    transform: 'translateZ(3px)'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 rounded-[1.25rem] border-[6px] border-black/5 pointer-events-none shadow-inner" />
        </div>
    );
};

const Cube = ({ value, isRolling, index, show }) => {
    const controls = useAnimation();

    useEffect(() => {
        if (show && isRolling) {
            const target = getRotation(value);
            controls.start({
                x: [index === 0 ? -300 : 300, 0],
                y: [400, 0],
                z: [-400, 0],
                rotateX: [0, (360 * 4) + target.x],
                rotateY: [0, (360 * 5) + target.y],
                rotateZ: [0, 360 + (index * 90)],
                scale: [0.5, 1.1, 1],
                transition: {
                    duration: 2.2,
                    ease: "easeOut",
                }
            });
        }
    }, [show, isRolling, value, index, controls]);

    return (
        <div className="relative w-[100px] h-[100px]" style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
            <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
                animate={controls}
                initial={{ opacity: 0, scale: 0.5, rotateX: -25, rotateY: 30 }}
            >
                {[1, 2, 3, 4, 5, 6].map(n => <DiceFace key={n} n={n} />)}
            </motion.div>

            <motion.div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/50 blur-2xl rounded-full -z-50"
                style={{ scaleY: 0.5 }}
                animate={isRolling ? {
                    scale: [0.6, 1.2, 1],
                    opacity: [0, 0.6, 0.4],
                    filter: "blur(24px)",
                    transition: { duration: 2.2, ease: "easeOut" }
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
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none bg-black/70 backdrop-blur-xl"
                >
                    <div className="flex gap-32 relative" style={{ transformStyle: 'preserve-3d', perspective: '1500px' }}>
                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -40 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-48 left-1/2 -translate-x-1/2 text-center w-full min-w-[400px]"
                            >
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.8em] block mb-3 opacity-60">Активный Ход</span>
                                <h1 className="text-7xl font-black text-white uppercase tracking-tighter drop-shadow-2xl">
                                    {playerName}
                                </h1>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} show={show} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} show={show} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="mt-40 flex flex-col items-center"
                        >
                            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 px-12 py-8 rounded-[3.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center group">
                                <span className="text-[10px] text-blue-200 uppercase font-bold tracking-[0.4em] mb-4 opacity-70">Результат</span>
                                <span className="text-[10rem] font-black text-white leading-none drop-shadow-lg italic font-mono">
                                    {displayValues[0] + displayValues[1]}
                                </span>
                            </div>

                            {displayValues[0] === displayValues[1] && (
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        boxShadow: [
                                            "0 0 20px rgba(234,179,8,0.2)",
                                            "0 0 40px rgba(234,179,8,0.5)",
                                            "0 0 20px rgba(234,179,8,0.2)"
                                        ]
                                    }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="mt-10 px-10 py-3 bg-yellow-500 text-black font-black text-2xl rounded-full uppercase tracking-widest shadow-xl"
                                >
                                    ✨ ДУБЛЬ ✨
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
