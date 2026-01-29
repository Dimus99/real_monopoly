import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const getRotation = (val) => {
    let base = { x: 0, y: 0 };
    switch (val) {
        case 1: base = { x: 0, y: 0 }; break;
        case 6: base = { x: 0, y: 180 }; break;
        case 2: base = { x: 0, y: 90 }; break;
        case 5: base = { x: 0, y: -90 }; break;
        case 3: base = { x: -90, y: 0 }; break;
        case 4: base = { x: 90, y: 0 }; break;
        default: break;
    }
    // Final rotation: perfectly flat towards player for readability
    return {
        x: base.x,
        y: base.y
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
                background = 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)';
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
                background = 'linear-gradient(135deg, #fdfdfd 0%, #eeeeee 100%)';
                break;
            case 3:
                transform = `rotateX(90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #ffffff 0%, #f2f2f2 100%)';
                break;
            case 4:
                transform = `rotateX(-90deg) translateZ(${s}px)`;
                background = 'linear-gradient(135deg, #e8e8e8 0%, #d8d8d8 100%)';
                break;
            default: break;
        }

        return {
            transform,
            backfaceVisibility: 'visible',
            background,
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.05), inset 0 0 2px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.2)',
            transformStyle: 'preserve-3d',
            position: 'absolute',
            width: '100px',
            height: '100px',
            top: 0,
            left: 0,
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: '12px'
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

const Cube = ({ value, isRolling, index, show, isMine }) => {
    const controls = useAnimation();

    useEffect(() => {
        if (!show) return;

        if (isRolling) {
            const target = getRotation(value);
            const startY = isMine ? 600 : -800;

            controls.start({
                x: 0,
                y: [startY, 0],
                z: [600, 0],
                rotateX: (360 * 5 * (isMine ? 1 : -1)) + target.x,
                rotateY: (360 * 3 * (isMine ? 1 : -1)) + target.y,
                rotateZ: (360 * 1.5) + 20,
                transition: {
                    duration: 4.2,
                    ease: [0.16, 1, 0.3, 1], // easeOutExpo for ultra-smooth deceleration
                    y: { duration: 2.2, ease: "circOut" },
                    z: { duration: 2.2, ease: "circOut" }
                }
            });
        }
    }, [show, isRolling, value, index, controls, isMine]);

    return (
        <div className="relative w-[100px] h-[100px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={show ? { opacity: 1, scale: isRolling ? [0.6, 1.1, 1] : 1 } : {}}
                transition={{ duration: 0.5 }}
                className="w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div className="w-full h-full" style={{ perspective: '800px', transformStyle: 'preserve-3d' }}>
                    <motion.div
                        className="w-full h-full relative"
                        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
                        animate={controls}
                        initial={{ rotateX: 20, rotateY: 20 }}
                    >
                        {[1, 2, 3, 4, 5, 6].map(n => <DiceFace key={n} n={n} />)}
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

const DiceAnimation = ({ show, rolling, values, playerName, glow, isMine = true }) => {
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
                >
                    <div className="flex gap-32 relative mb-20" style={{ transformStyle: 'preserve-3d' }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 blur-[180px] rounded-full -z-10" />

                        {glow && !rolling && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0.3, 0.5, 0.3], scale: [0.8, 1.1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 -inset-x-60 bg-yellow-500/20 blur-[140px] rounded-full -z-10"
                            />
                        )}

                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -60 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-48 left-1/2 -translate-x-1/2 text-center w-full"
                            >
                                <h1 className={`text-7xl font-black uppercase tracking-tighter drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] ${glow && !rolling ? 'text-yellow-400' : 'text-white'}`}>
                                    {playerName}
                                </h1>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} show={show} isMine={isMine} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} show={show} isMine={isMine} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
