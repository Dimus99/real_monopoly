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
        const s = 49; // half of 100 - slight gap reduction
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
            background: 'white',
            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.1)',
            transformStyle: 'preserve-3d'
        };
    };

    return (
        <div
            className="absolute w-full h-full bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center p-2 select-none"
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
                controls.start({
                    x: [index === 0 ? -200 : 200, 0],
                    y: [200, 0],
                    rotateX: [0, 720, (360 * 3) + target.x],
                    rotateY: [0, 720, (360 * 3) + target.y],
                    scale: [0.5, 1],
                    opacity: 1,
                    transition: { duration: 1.5, ease: "easeOut" }
                });
            } else {
                // If shown but NOT rolling (e.g. final state), just snap to target
                const target = getRotation(value);
                controls.set({
                    x: 0,
                    y: 0,
                    rotateX: target.x,
                    rotateY: target.y,
                    scale: 1,
                    opacity: 1
                });
            }
        }
    }, [show, isRolling, value, index, controls]);

    return (
        <div className="relative w-[100px] h-[100px]" style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
            <motion.div
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
                animate={controls}
                initial={{ opacity: 0, scale: 0.5 }}
            >
                {[1, 2, 3, 4, 5, 6].map(n => <DiceFace key={n} n={n} />)}
            </motion.div>
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
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none"
                >
                    {/* Background Overlay without Blur */}
                    <div className="absolute inset-0 bg-black/30" />

                    <div className="flex gap-20 relative" style={{ transformStyle: 'preserve-3d' }}>
                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute -top-32 left-1/2 -translate-x-1/2 text-center w-full"
                            >
                                <h1 className="text-5xl font-black text-white uppercase tracking-tighter drop-shadow-lg">
                                    {playerName}
                                </h1>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} show={show} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} show={show} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-20 flex flex-col items-center"
                        >
                            <div className="bg-black/40 px-10 py-5 rounded-3xl border border-white/10 flex flex-col items-center backdrop-blur-sm">
                                <span className="text-[10rem] font-black text-white leading-none drop-shadow-2xl font-mono">
                                    {displayValues[0] + displayValues[1]}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DiceAnimation;
