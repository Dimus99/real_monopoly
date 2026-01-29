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
    // Final settling tilt for 3D depth perception
    return {
        x: base.x - 25,
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
        const s = 50; // Perfect half of 100px
        let transform = "";
        let background = "white";

        switch (n) {
            case 1:
                transform = `rotateY(0deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)';
                break;
            case 6:
                transform = `rotateY(180deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #e5e5e5 0%, #d1d1d1 100%)';
                break;
            case 2:
                transform = `rotateY(90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #f9f9f9 0%, #e9e9e9 100%)';
                break;
            case 5:
                transform = `rotateY(-90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)';
                break;
            case 3:
                transform = `rotateX(90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ffffff 0%, #f2f2f2 100%)';
                break;
            case 4:
                transform = `rotateX(-90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #dfdfdf 0%, #cccccc 100%)';
                break;
            default: break;
        }

        return {
            transform,
            backfaceVisibility: 'visible',
            background,
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.2)',
            transformStyle: 'preserve-3d',
            position: 'absolute',
            width: '100px',
            height: '100px',
            top: 0,
            left: 0
        };
    };

    return (
        <div
            className="rounded-xl border border-gray-300/30 flex items-center justify-center p-2 select-none"
            style={getFaceStyle(n)}
        >
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 pointer-events-none">
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex items-center justify-center">
                        {dots(n).includes(i) && (
                            <div
                                className="w-4 h-4 rounded-full bg-black shadow-inner"
                                style={{ background: 'radial-gradient(circle at 30% 30%, #444, #000)', boxShadow: 'inset -2px -2px 4px rgba(255,255,255,0.2), 1px 1px 2px rgba(0,0,0,0.4)' }}
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
        if (!show) return;

        if (isRolling) {
            const target = getRotation(value);
            // Dynamic "thrown" animation with explicit 3D perspective to avoid flatness
            controls.start({
                x: [index === 0 ? -400 : 400, index === 0 ? -150 : 150, 0],
                y: [300, -100, 0],
                z: [0, 100, 0],
                rotateX: [15, index === 0 ? 735 : -705, (360 * 4) + target.x],
                rotateY: [15, index === 0 ? -1065 : 1095, (360 * 5) + target.y],
                rotateZ: [0, index === 0 ? 180 : -180, 0],
                scale: [0.4, 1.2, 1],
                opacity: [0, 1, 1],
                transition: {
                    duration: 2.2,
                    ease: "easeOut",
                    times: [0, 0.4, 1]
                }
            });
        } else {
            const target = getRotation(value);
            controls.set({
                x: 0,
                y: 0,
                z: 0,
                rotateX: target.x,
                rotateY: target.y,
                rotateZ: 0,
                scale: 1,
                opacity: 1
            });
        }
    }, [show, isRolling, value, index, controls]);

    return (
        <div className="relative w-[100px] h-[100px]" style={{ transformStyle: 'preserve-3d', perspective: '1500px' }}>
            {/* Dynamic Shadow */}
            <motion.div
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/40 blur-xl rounded-full"
                animate={isRolling ? {
                    scale: [0.5, 1.5, 1],
                    opacity: [0, 0.6, 0.4],
                    y: [0, 10, 0]
                } : {
                    scale: 1,
                    opacity: 0.4,
                    y: 0
                }}
                transition={{ duration: 2.2, ease: "easeOut" }}
            />

            <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                animate={controls}
                initial={{ opacity: 0, scale: 0.5, rotateX: 15, rotateY: 15 }}
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
                    className="fixed inset-0 z-[250] flex flex-col items-center justify-center pointer-events-none"
                    style={{ perspective: '1500px' }}
                >
                    {/* Darker localized background for better volume contrast */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[4px]" />

                    <div className="flex gap-32 relative mb-20" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Dramatic Stage Light/Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full -z-10" />

                        {glow && !rolling && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 -inset-x-40 bg-yellow-500/20 blur-[120px] rounded-full -z-10"
                            />
                        )}

                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -60 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-48 left-1/2 -translate-x-1/2 text-center w-full"
                            >
                                <h1 className={`text-7xl font-black uppercase tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${glow && !rolling ? 'text-yellow-400' : 'text-white'}`}>
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
                            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                            className="flex flex-col items-center z-10"
                        >
                            <div className={`backdrop-blur-2xl px-14 py-8 rounded-[40px] border-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[200px] ${glow ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
                                <span className={`text-[12rem] font-black leading-none drop-shadow-2xl font-mono tracking-tighter ${glow ? 'text-yellow-400' : 'text-white'}`}>
                                    {displayValues[0] + displayValues[1]}
                                </span>
                                {glow && (
                                    <motion.div
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-yellow-400 font-black text-3xl uppercase tracking-[0.4em] mt-4 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"
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
