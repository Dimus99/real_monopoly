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
        x: base.x - 20,
        y: base.y + 25
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
        const s = 49.6; // Slightly more than half to minimize corner gaps
        let transform = "";
        let background = "white";

        switch (n) {
            case 1:
                transform = `rotateY(0deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)';
                break;
            case 6:
                transform = `rotateY(180deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)';
                break;
            case 2:
                transform = `rotateY(90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)';
                break;
            case 5:
                transform = `rotateY(-90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)';
                break;
            case 3:
                transform = `rotateX(90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)';
                break;
            case 4:
                transform = `rotateX(-90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ececec 0%, #dfdfdf 100%)';
                break;
            default: break;
        }

        return {
            transform,
            backfaceVisibility: 'visible', // Always visible to prevent disappearing in 3D space
            background,
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.05)',
            transformStyle: 'preserve-3d'
        };
    };

    return (
        <div
            className="absolute w-full h-full bg-white rounded-lg border border-gray-300/50 flex items-center justify-center p-2 select-none"
            style={getFaceStyle(n)}
        >
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 pointer-events-none">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                        {dots(n).includes(i) && (
                            <div
                                className="w-4 h-4 rounded-full bg-black shadow-inner"
                                style={{ background: 'radial-gradient(circle at 30% 30%, #444, #000)' }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const Cube = ({ value, isRolling, index, show }) => {
    const controls = useAnimation();

    useEffect(() => {
        if (show) {
            if (isRolling) {
                const target = getRotation(value);
                // More complex multi-axis rotation for "tumbling" look
                controls.start({
                    x: [index === 0 ? -300 : 300, 0],
                    y: [150, 0],
                    z: [0, 0],
                    rotateX: [0, index === 0 ? 1080 : -1080, (360 * 4) + target.x],
                    rotateY: [0, index === 0 ? -1080 : 1080, (360 * 4) + target.y],
                    rotateZ: [0, index === 0 ? 180 : -180, 0],
                    scale: [0.6, 1.1, 1],
                    opacity: 1,
                    transition: { duration: 2.0, ease: "easeOut" }
                });
            } else {
                const target = getRotation(value);
                controls.set({
                    x: 0,
                    y: 0,
                    rotateX: target.x,
                    rotateY: target.y,
                    rotateZ: 0,
                    scale: 1,
                    opacity: 1
                });
            }
        }
    }, [show, isRolling, value, index, controls]);

    return (
        <div className="relative w-[100px] h-[100px]" style={{ transformStyle: 'preserve-3d' }}>
            <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                animate={controls}
                initial={{ opacity: 0, scale: 0.5 }}
            >
                {[1, 2, 3, 4, 5, 6].map(n => <DiceFace key={n} n={n} />)}
            </motion.div>
        </div>
    );
};

const DiceAnimation = ({ show, rolling, values, playerName, glow }) => {
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
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
                    style={{ perspective: '1200px' }}
                >
                    {/* Background Overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

                    <div className="flex gap-24 relative" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Glow effect for doubles */}
                        {glow && !rolling && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 -inset-x-20 bg-yellow-500/20 blur-[100px] rounded-full"
                            />
                        )}

                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -40 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-40 left-1/2 -translate-x-1/2 text-center w-full"
                            >
                                <h1 className={`text-6xl font-black uppercase tracking-tighter drop-shadow-2xl ${glow && !rolling ? 'text-yellow-400' : 'text-white'}`}>
                                    {playerName}
                                </h1>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} show={show} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} show={show} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 50 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className="mt-24 flex flex-col items-center"
                        >
                            <div className={`backdrop-blur-xl px-12 py-6 rounded-3xl border shadow-2xl flex flex-col items-center ${glow ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-white/10 border-white/20'}`}>
                                <span className={`text-[12rem] font-black leading-none drop-shadow-2xl font-mono tracking-tighter ${glow ? 'text-yellow-400' : 'text-white'}`}>
                                    {displayValues[0] + displayValues[1]}
                                </span>
                                {glow && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-yellow-400 font-black text-2xl uppercase tracking-[0.3em] mt-2"
                                    >
                                        Дубль!
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;

