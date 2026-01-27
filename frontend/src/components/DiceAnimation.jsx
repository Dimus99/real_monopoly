import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const DiceAnimation = ({ show, rolling, values, glow, playerName }) => {
    // Local state to track displayed values to avoid jumping
    const [displayValues, setDisplayValues] = useState([1, 1]);

    useEffect(() => {
        if (values && values.length === 2) {
            setDisplayValues(values);
        }
    }, [values]);

    // Standard Dice Layout:
    // 1: Front
    // 6: Back
    // 2: Right
    // 5: Left
    // 3: Top
    // 4: Bottom
    // SIZE: 100px (translateZ 50px)

    const getRotation = (val) => {
        switch (val) {
            case 1: return { x: 0, y: 0 };      // Show Front
            case 6: return { x: 180, y: 0 };    // Show Back (Flip X)
            case 2: return { x: 0, y: -90 };    // Show Right (Rotate Y Left)
            case 5: return { x: 0, y: 90 };     // Show Left (Rotate Y Right)
            case 3: return { x: -90, y: 0 };    // Show Top (Rotate X Down)
            case 4: return { x: 90, y: 0 };     // Show Bottom (Rotate X Up)
            default: return { x: 0, y: 0 };
        }
    };

    const Cube = ({ value, isRolling, index }) => {
        const controls = useAnimation();

        // Sequence animation logic
        useEffect(() => {
            if (show && isRolling) {
                const target = getRotation(value);
                const randomX = (Math.random() - 0.5) * 400;
                const randomY = -200 - Math.random() * 200;

                // Extra spins for chaos
                const loopsX = 2 + Math.floor(Math.random() * 2);
                const loopsY = 2 + Math.floor(Math.random() * 2);

                // Throwing sequence
                controls.start({
                    x: [randomX, 0],
                    y: [randomY, 0],
                    z: [300, 0],
                    rotateX: [0, (loopsX * 360) + target.x],
                    rotateY: [0, (loopsY * 360) + target.y],
                    rotateZ: [0, 360 + (index * 90)],
                    scale: [0.4, 1.1, 1],
                    opacity: [0, 1],
                    // Removed filter blur
                    transition: {
                        duration: 2.0,
                        ease: [0.16, 1, 0.3, 1], // Power4 easeOut
                    }
                });
            }
        }, [show, isRolling, value, index, controls]);

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
            const size = 50; // Half of 100px
            switch (n) {
                case 1: return `translateZ(${size}px)`; // Front
                case 6: return `rotateY(180deg) translateZ(${size}px)`; // Back
                case 2: return `rotateY(90deg) translateZ(${size}px)`; // Right
                case 5: return `rotateY(-90deg) translateZ(${size}px)`; // Left
                case 3: return `rotateX(90deg) translateZ(${size}px)`; // Top
                case 4: return `rotateX(-90deg) translateZ(${size}px)`; // Bottom
                default: return `translateZ(${size}px)`;
            }
        };

        const Face = ({ n }) => (
            <div
                className="absolute w-[100px] h-[100px] bg-white rounded-xl border-2 border-gray-300 flex flex-wrap content-center justify-between p-2 backface-hidden"
                style={{
                    transform: getFaceTransform(n),
                    boxShadow: 'inset 0 0 15px rgba(0,0,0,0.1)'
                }}
            >
                <div className="w-full h-full relative grid grid-cols-3 grid-rows-3 gap-1 p-1">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="flex items-center justify-center">
                            {dots(n).includes(i) && (
                                <div className="w-4 h-4 rounded-full bg-black shadow-sm"
                                    style={{ background: 'radial-gradient(circle at 30% 30%, #444, #000)' }} />
                            )}
                        </div>
                    ))}
                </div>
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/30 rounded-xl" />
            </div>
        );

        return (
            <div className="dice-container relative w-[100px] h-[100px]">
                <motion.div
                    className="cube w-full h-full relative"
                    style={{ transformStyle: 'preserve-3d' }}
                    animate={controls}
                    initial={{ opacity: 0, scale: 0.2 }}
                >
                    {[1, 2, 3, 4, 5, 6].map(n => <Face key={n} n={n} />)}
                </motion.div>

                {/* Shadow */}
                <motion.div
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-24 h-6 bg-black/40 blur-xl rounded-full -z-10"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={show ? {
                        scale: [0.5, 1.2, 1],
                        opacity: [0.2, 0.6, 0.4],
                        transition: { duration: 2, ease: "easeOut" }
                    } : {}}
                />
            </div>
        );
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none bg-black/40"
                // REMOVED backdrop-blur attributes here as requested
                >
                    <div className="flex gap-12 md:gap-32 relative p-20 perspective-[1000px]">
                        {/* Player Name Label */}
                        {playerName && (
                            <motion.div
                                initial={{ opacity: 0, y: -60, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ type: "spring", delay: 0.1 }}
                                className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-[0.5em] mb-1">
                                        Ход Игрока
                                    </span>
                                    <span className="text-5xl font-black text-white uppercase tracking-tighter font-display drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                        {playerName}
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        <Cube value={displayValues[0]} isRolling={rolling} index={0} />
                        <Cube value={displayValues[1]} isRolling={rolling} index={1} />
                    </div>

                    {!rolling && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="mt-12 flex flex-col items-center gap-1"
                        >
                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-3xl px-16 py-6 rounded-[2.5rem] border border-white/20 shadow-2xl flex flex-col items-center relative overflow-hidden group">
                                {/* Inner animated glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-transparent to-yellow-500/20 animate-pulse" />

                                <span className="text-xs text-blue-300 uppercase font-black tracking-[0.3em] mb-2 z-10">Сумма Броска</span>
                                <span className="text-8xl font-black text-white font-game drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] leading-none z-10 italic">
                                    {displayValues[0] + displayValues[1]}
                                </span>
                            </div>

                            {displayValues[0] === displayValues[1] && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="text-yellow-400 font-black text-2xl uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(234,179,8,0.6)] mt-4"
                                >
                                    🚀 Двойной Шанс! 🚀
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
