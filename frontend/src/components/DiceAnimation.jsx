import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values }) => {
    // Simplified Face Component
    const SimpleFace = ({ n, transform }) => (
        <div
            className="absolute w-full h-full bg-white border border-gray-200 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] flex items-center justify-center backface-hidden"
            style={{
                transform: transform,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                boxShadow: 'inset 0 0 15px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.1)'
            }}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-200/50 to-transparent pointer-events-none rounded-xl" />
            {getDots(n)}
        </div>
    );

    const getDots = (n) => {
        const dotClass = "absolute w-[22%] h-[22%] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_1px_1px_rgba(0,0,0,0.5)]";
        const positions = {
            1: [[50, 50]],
            2: [[25, 25], [75, 75]],
            3: [[25, 25], [50, 50], [75, 75]],
            4: [[25, 25], [25, 75], [75, 25], [75, 75]],
            5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
            6: [[25, 25], [25, 75], [50, 25], [50, 75], [75, 25], [75, 75]]
        };
        return positions[n].map((pos, i) => (
            <div key={i} className={dotClass} style={{ top: `${pos[0]}%`, left: `${pos[1]}%`, transform: 'translate(-50%, -50%)' }} />
        ));
    };

    const Cube = ({ value, isRolling, glow }) => {
        const halfSize = "3.5rem"; // 7rem / 2 -> w-28

        // Define Faces based on standard properties
        // 1: Front, 2: Top, 3: Right, 4: Left, 5: Bottom, 6: Back
        const faces = [
            { n: 1, transform: `translateZ(${halfSize})` },
            { n: 6, transform: `rotateX(180deg) translateZ(${halfSize})` },
            { n: 2, transform: `rotateX(90deg) translateZ(${halfSize})` },
            { n: 5, transform: `rotateX(-90deg) translateZ(${halfSize})` },
            { n: 3, transform: `rotateY(90deg) translateZ(${halfSize})` },
            { n: 4, transform: `rotateY(-90deg) translateZ(${halfSize})` },
        ];

        const getTarget = (v) => {
            switch (v) {
                case 1: return { x: -360, y: -360, z: 0 };
                case 2: return { x: -450, y: -360, z: 0 };
                case 3: return { x: -360, y: -450, z: 0 };
                case 4: return { x: -360, y: -270, z: 0 };
                case 5: return { x: -270, y: -360, z: 0 };
                case 6: return { x: -540, y: -360, z: 0 };
                default: return { x: 0, y: 0, z: 0 };
            }
        };

        const target = getTarget(value);

        return (
            <motion.div
                className={`w-28 h-28 relative perspective-[1000px] ${glow ? 'z-50' : 'z-10'}`}
                animate={isRolling ? {
                    y: [0, -100, 0],
                    x: [0, (Math.random() - 0.5) * 50, 0],
                    scale: [1, 1.2, 1],
                    rotate: [0, (Math.random() - 0.5) * 180, 0]
                } : {
                    y: 0,
                    x: 0,
                    scale: 1,
                    rotate: 0
                }}
                transition={isRolling ? {
                    duration: 0.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : {
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                }}
            >
                <motion.div
                    className={`w-full h-full relative preserve-3d ${glow ? 'drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]' : 'drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]'}`}
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={isRolling ? {
                        rotateX: [0, 360, 720],
                        rotateY: [0, 720, 1440],
                        rotateZ: [0, 360]
                    } : {
                        rotateX: target.x,
                        rotateY: target.y,
                        rotateZ: target.z
                    }}
                    transition={isRolling ? {
                        duration: 0.4,
                        repeat: Infinity,
                        ease: "linear"
                    } : {
                        type: "spring",
                        stiffness: 100,
                        damping: 15,
                        mass: 1
                    }}
                >
                    {faces.map((f, i) => (
                        <SimpleFace
                            key={i}
                            n={f.n}
                            transform={f.transform}
                        />
                    ))}
                </motion.div>
            </motion.div>
        );
    };

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        >
            <div className="flex gap-8 mb-8">
                <Cube value={values ? values[0] : 1} isRolling={rolling} glow={show && !rolling && (values?.[0] === values?.[1])} />
                <Cube value={values ? values[1] : 1} isRolling={rolling} glow={show && !rolling && (values?.[0] === values?.[1])} />
            </div>

            <div className="bg-black/80 px-6 py-2 rounded-full border border-yellow-500/30">
                <span className="text-2xl font-black text-yellow-400 font-mono">
                    {rolling ? "ROLLING..." : `TOTAL: ${(values?.[0] || 0) + (values?.[1] || 0)}`}
                </span>
            </div>
        </motion.div>
    );
};

export default DiceAnimation;
