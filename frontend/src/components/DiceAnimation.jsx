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
        const s = 49.8; // Slightly less than 50 to ensure faces overlap and seal the cube
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
            backfaceVisibility: 'hidden',
            background,
            boxShadow: 'inset 0 0 25px rgba(0,0,0,0.15)',
            transformStyle: 'preserve-3d',
            position: 'absolute',
            width: '101px', // 1px larger to prevent gaps
            height: '101px',
            top: '-0.5px', // Adjust for larger size
            left: '-0.5px',
            willChange: 'transform'
        };
    };

    return (
        <div
            className="rounded-xl border border-gray-300/30 flex items-center justify-center p-2 select-none"
            style={getFaceStyle(n)}
        >
            <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-1 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                {[...Array(9)].map((_, i) => (
                    <div key={i} className="flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
                        {dots(n).includes(i) && (
                            <div
                                className="w-4 h-4 rounded-full bg-black"
                                style={{
                                    background: 'radial-gradient(circle at 30% 30%, #444, #000)',
                                    boxShadow: 'inset -1px -1px 2px rgba(255,255,255,0.2), 1px 1px 2px rgba(0,0,0,0.4)',
                                    transform: 'translateZ(1px)' // Pop dots for volume
                                }}
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
            // Dynamic "thrown" animation with complex rotation
            controls.start({
                x: [index === 0 ? -500 : 500, index === 0 ? -200 : 200, 0],
                y: [500, -200, 0],
                z: [0, 200, 0],
                rotateX: [0, index === 0 ? 1440 : -1440, (360 * 6) + target.x],
                rotateY: [0, index === 0 ? -1800 : 1800, (360 * 7) + target.y],
                rotateZ: [0, index === 0 ? 360 : -360, 20], // Land with Z tilt too
                scale: [0.3, 1.4, 1],
                opacity: [0, 1, 1],
                transition: {
                    duration: 2.5,
                    ease: [0.19, 1, 0.22, 1],
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
                rotateZ: 20,
                scale: 1,
                opacity: 1
            });
        }
    }, [show, isRolling, value, index, controls]);

    return (
        <div className="relative w-[100px] h-[100px]" style={{ transformStyle: 'preserve-3d' }}>
            {/* Dynamic Shadow */}
            <motion.div
                className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-28 h-8 bg-black/50 blur-xl rounded-full"
                animate={isRolling ? {
                    scale: [0.4, 2, 1],
                    opacity: [0, 0.5, 0.3],
                    y: [0, 20, 0]
                } : {
                    scale: 1.3,
                    opacity: 0.3,
                    y: 0
                }}
                transition={{ duration: 2.5, ease: "easeOut" }}
                style={{ transformStyle: 'flat' }}
            />

            <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                animate={controls}
                initial={{ opacity: 0, scale: 0.5, translateZ: 1 }}
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
                    style={{ perspective: '2000px', transformStyle: 'preserve-3d' }}
                >
                    {/* Background darkening removed as requested */}

                    <div className="flex gap-40 relative mb-20" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Dramatic Stage Light/Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />

                        {glow && !rolling && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.1, 0.3, 0.1], scale: [0.9, 1.2, 0.9] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 -inset-x-60 bg-yellow-500/10 blur-[150px] rounded-full -z-10"
                            />
                        )}

                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -60 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-60 left-1/2 -translate-x-1/2 text-center w-full"
                            >
                                <h1 className={`text-8xl font-black uppercase tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${glow && !rolling ? 'text-yellow-400' : 'text-white'}`}>
                                    {playerName}
                                </h1>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} show={show} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} show={show} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            className="flex flex-col items-center z-10"
                        >
                            <div className={`backdrop-blur-3xl px-16 py-10 rounded-[50px] border-2 shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col items-center min-w-[240px] ${glow ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-white/5 border-white/10'}`}>
                                <span className={`text-[14rem] font-black leading-none drop-shadow-2xl font-mono tracking-tighter ${glow ? 'text-yellow-400' : 'text-white'}`}>
                                    {displayValues[0] + displayValues[1]}
                                </span>
                                {glow && (
                                    <motion.div
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-yellow-400 font-black text-4xl uppercase tracking-[0.5em] mt-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]"
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
