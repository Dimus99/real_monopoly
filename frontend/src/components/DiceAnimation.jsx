import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow }) => {
    const Dot = ({ position }) => (
        <div
            className="absolute w-[20%] h-[20%] bg-[#121212] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.4)]"
            style={{
                top: position[0],
                left: position[1],
                transform: 'translate(-50%, -50%)'
            }}
        />
    );

    const Face = ({ value, transform }) => {
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
            <div
                className="absolute w-full h-full bg-[#f8f8f8] border-[3px] border-gray-400/40 rounded-[1.4rem] flex items-center justify-center backface-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.1)]"
                style={{
                    transform: transform,
                    backfaceVisibility: 'hidden',
                    background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #d0d0d0 100%)'
                }}
            >
                {dots.map((pos, i) => <Dot key={i} position={pos} />)}
            </div>
        );
    };

    const Cube = ({ value, isRolling, isGlow }) => {
        const halfSize = "3.25rem";

        // Face configuration for standard dice mapping
        const faces = [
            { v: 1, t: `rotateY(0deg) translateZ(${halfSize})` },
            { v: 6, t: `rotateY(180deg) translateZ(${halfSize})` },
            { v: 3, t: `rotateY(90deg) translateZ(${halfSize})` },
            { v: 4, t: `rotateY(-90deg) translateZ(${halfSize})` },
            { v: 2, t: `rotateX(90deg) translateZ(${halfSize})` },
            { v: 5, t: `rotateX(-90deg) translateZ(${halfSize})` },
        ];

        const targetRotation = useMemo(() => {
            switch (value) {
                case 1: return { x: 0, y: 0 };
                case 2: return { x: -90, y: 0 };
                case 3: return { x: 0, y: -90 };
                case 4: return { x: 0, y: 90 };
                case 5: return { x: 90, y: 0 };
                case 6: return { x: 0, y: 180 };
                default: return { x: 0, y: 0 };
            }
        }, [value]);

        return (
            <motion.div
                className="w-26 h-26 relative"
                style={{ perspective: '1200px' }}
                animate={isRolling ? {
                    y: [0, -100, 0, -50, 0],
                    x: [0, 20, -20, 10, 0],
                    rotate: [0, 10, -10, 5, 0],
                    scale: [1, 1.2, 1, 1.1, 1]
                } : {
                    y: 0, x: 0, rotate: 0, scale: 1
                }}
                transition={isRolling ? {
                    duration: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut"
                } : {
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    mass: 1
                }}
            >
                <motion.div
                    className={`w-full h-full relative preserve-3d rounded-[1.4rem] ${isGlow ? 'shadow-[0_0_60px_rgba(255,215,0,0.8)]' : 'shadow-2xl'}`}
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={isRolling ? {
                        rotateX: [0, 360],
                        rotateY: [0, 720],
                        rotateZ: [0, 180]
                    } : {
                        rotateX: targetRotation.x,
                        rotateY: targetRotation.y,
                        rotateZ: 0
                    }}
                    transition={isRolling ? {
                        duration: 0.4,
                        repeat: Infinity,
                        ease: "linear"
                    } : {
                        type: "spring",
                        stiffness: 120,
                        damping: 15,
                        mass: 2
                    }}
                >
                    {faces.map((f, i) => <Face key={i} value={f.v} transform={f.t} />)}
                </motion.div>
            </motion.div>
        );
    };

    if (!show) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, scale: 1.1, backdropFilter: 'blur(0px)' }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/40"
        >
            <div className="flex gap-12 mb-12 relative">
                {/* Background glow when doubles */}
                {glow && !rolling && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 0.4, scale: 1.5 }}
                        className="absolute inset-0 bg-yellow-500 rounded-full blur-[80px] -z-10"
                    />
                )}

                <Cube value={values?.[0] || 1} isRolling={rolling} isGlow={glow && !rolling} />
                <Cube value={values?.[1] || 1} isRolling={rolling} isGlow={glow && !rolling} />
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`bg-black/80 backdrop-blur-xl px-10 py-4 rounded-3xl border-2 transition-colors duration-500 ${glow && !rolling ? 'border-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.3)]' : 'border-white/10'}`}
            >
                <div className="flex flex-col items-center">
                    <span className={`text-4xl font-black font-display tracking-tighter ${glow && !rolling ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                        {rolling ? "БРОСАЕМ..." : ((values?.[0] || 0) + (values?.[1] || 0))}
                    </span>
                    {!rolling && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mt-1">
                            Результат броска
                        </span>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default DiceAnimation;
