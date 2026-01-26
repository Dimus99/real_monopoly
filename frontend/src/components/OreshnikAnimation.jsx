import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OreshnikAnimation = ({ isVisible, onComplete, targetTileId = null, boardRef = null }) => {
    const [targetPosition, setTargetPosition] = useState({ x: '50vw', y: '50vh' });
    const [animationPhase, setAnimationPhase] = useState('launching'); // launching, flying, exploding

    useEffect(() => {
        if (isVisible && targetTileId !== null && boardRef?.current) {
            // Try to find the target tile element on the board
            const tileElement = boardRef.current.querySelector(`[data-tile-id="${targetTileId}"]`);
            if (tileElement) {
                const rect = tileElement.getBoundingClientRect();
                setTargetPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        }
    }, [isVisible, targetTileId, boardRef]);

    useEffect(() => {
        if (isVisible) {
            setAnimationPhase('launching');
            const flyTimeout = setTimeout(() => setAnimationPhase('flying'), 400);
            const explodeTimeout = setTimeout(() => setAnimationPhase('exploding'), 1600);
            const completeTimeout = setTimeout(() => {
                if (onComplete) onComplete();
            }, 2800);

            return () => {
                clearTimeout(flyTimeout);
                clearTimeout(explodeTimeout);
                clearTimeout(completeTimeout);
            };
        }
    }, [isVisible, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
                >
                    {/* Dark overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.85 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-b from-black via-red-950/30 to-black"
                    />

                    {/* Warning text */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: -50 }}
                        animate={{
                            opacity: animationPhase === 'launching' ? 1 : 0,
                            scale: 1,
                            y: 0
                        }}
                        transition={{ duration: 0.3 }}
                        className="absolute top-16 left-0 right-0 text-center z-10"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3, repeat: Infinity }}
                            className="font-display text-3xl md:text-5xl lg:text-6xl text-red-500 font-black tracking-wider drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]"
                        >
                            ⚠️ INCOMING ORESHNIK ⚠️
                        </motion.div>
                        <div className="text-red-300 text-lg mt-2 font-bold uppercase tracking-widest">
                            Missile Launch Detected
                        </div>
                    </motion.div>

                    {/* Rocket with trail - animates to target */}
                    <motion.div
                        initial={{
                            x: -150,
                            y: typeof window !== 'undefined' ? window.innerHeight + 100 : 800,
                            rotate: -45,
                            scale: 0.5
                        }}
                        animate={{
                            x: typeof targetPosition.x === 'number' ? targetPosition.x - 60 : '45vw',
                            y: typeof targetPosition.y === 'number' ? targetPosition.y - 60 : '45vh',
                            rotate: -45,
                            scale: 1
                        }}
                        transition={{
                            duration: 1.5,
                            ease: [0.45, 0.05, 0.55, 0.95] // Custom easing for realistic trajectory
                        }}
                        className="absolute z-20"
                    >
                        {/* Trail effect - long gradient tail */}
                        <motion.div
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 0.1, repeat: Infinity }}
                            className="absolute -left-32 md:-left-48 top-1/2 -translate-y-1/2 w-32 md:w-48 h-3 md:h-4"
                            style={{
                                background: 'linear-gradient(to left, #ff6b35, #ffa500, #ffff00, transparent)',
                                filter: 'blur(3px)',
                                borderRadius: '50%'
                            }}
                        />

                        {/* Secondary trail */}
                        <motion.div
                            animate={{ opacity: [0.4, 0.8, 0.4], scaleX: [1, 1.2, 1] }}
                            transition={{ duration: 0.15, repeat: Infinity }}
                            className="absolute -left-24 md:-left-36 top-1/2 -translate-y-1/2 w-24 md:w-36 h-6 md:h-8"
                            style={{
                                background: 'linear-gradient(to left, #ff4500, #ff8c00, transparent)',
                                filter: 'blur(8px)',
                                borderRadius: '50%'
                            }}
                        />

                        {/* Rocket emoji with shake */}
                        <motion.div
                            animate={{
                                rotate: [0, 3, -3, 2, -2, 0],
                                scale: [1, 1.02, 1]
                            }}
                            transition={{ duration: 0.15, repeat: Infinity }}
                            className="text-6xl md:text-8xl lg:text-9xl filter drop-shadow-[0_0_20px_rgba(255,100,0,0.8)]"
                        >
                            🚀
                        </motion.div>

                        {/* Spark particles around rocket */}
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    x: [-10 - i * 5, -30 - i * 10],
                                    y: [(i % 2 ? 1 : -1) * 5, (i % 2 ? 1 : -1) * 15],
                                    opacity: [1, 0],
                                    scale: [1, 0]
                                }}
                                transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                                className="absolute left-0 top-1/2 w-2 h-2 rounded-full bg-yellow-400"
                            />
                        ))}
                    </motion.div>

                    {/* Explosion at target - precisely positioned */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: animationPhase === 'exploding' ? [0, 1, 1, 0.8] : 0,
                            scale: animationPhase === 'exploding' ? [0, 1.5, 2.5, 3] : 0
                        }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className="absolute z-30"
                        style={{
                            left: typeof targetPosition.x === 'number' ? targetPosition.x : '50%',
                            top: typeof targetPosition.y === 'number' ? targetPosition.y : '50%',
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        <div className="relative">
                            {/* Central explosion */}
                            <motion.div
                                animate={{ rotate: [0, 180, 360] }}
                                transition={{ duration: 0.8, ease: 'linear' }}
                                className="text-[100px] md:text-[150px] lg:text-[200px]"
                            >
                                💥
                            </motion.div>

                            {/* Fire ring */}
                            {[...Array(8)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0, rotate: i * 45 }}
                                    animate={{
                                        scale: animationPhase === 'exploding' ? [0, 1.5, 2] : 0,
                                        opacity: [1, 0.8, 0]
                                    }}
                                    transition={{ duration: 0.8, delay: i * 0.05 }}
                                    className="absolute text-5xl md:text-7xl"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-80px)`
                                    }}
                                >
                                    🔥
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Screen shake during explosion */}
                    {animationPhase === 'exploding' && (
                        <motion.div
                            animate={{
                                x: [0, -8, 8, -6, 6, -4, 4, 0],
                                y: [0, 4, -4, 3, -3, 2, -2, 0]
                            }}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 pointer-events-none"
                        />
                    )}

                    {/* Flash effect */}
                    {animationPhase === 'exploding' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-white/50 pointer-events-none"
                        />
                    )}

                    {/* "ORESHNIK" text reveal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{
                            opacity: animationPhase === 'exploding' ? [0, 1, 1] : 0,
                            y: animationPhase === 'exploding' ? [50, 0, 0] : 50
                        }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="absolute bottom-16 md:bottom-24 left-0 right-0 text-center z-40"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.02, 1] }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                            className="font-display text-4xl md:text-6xl lg:text-7xl text-yellow-400 font-black tracking-[0.15em] drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]"
                        >
                            ОРЕШНИК
                        </motion.div>
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: animationPhase === 'exploding' ? 1 : 0 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                            className="h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto mt-4 w-48 md:w-64"
                        />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: animationPhase === 'exploding' ? 1 : 0 }}
                            transition={{ delay: 1 }}
                            className="text-red-400 text-lg md:text-xl mt-3 font-bold uppercase tracking-widest"
                        >
                            Цель уничтожена
                        </motion.div>
                    </motion.div>

                    {/* Debris particles */}
                    {animationPhase === 'exploding' && [...Array(25)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                opacity: 0,
                                x: typeof targetPosition.x === 'number' ? targetPosition.x : '50%',
                                y: typeof targetPosition.y === 'number' ? targetPosition.y : '50%',
                                scale: 0
                            }}
                            animate={{
                                opacity: [0, 1, 0],
                                x: `calc(${typeof targetPosition.x === 'number' ? targetPosition.x + 'px' : '50%'} + ${(Math.random() - 0.5) * 400}px)`,
                                y: `calc(${typeof targetPosition.y === 'number' ? targetPosition.y + 'px' : '50%'} + ${(Math.random() - 0.5) * 400}px)`,
                                scale: [0, 1 + Math.random(), 0],
                                rotate: Math.random() * 360
                            }}
                            transition={{
                                delay: Math.random() * 0.3,
                                duration: 1 + Math.random() * 0.5,
                                ease: 'easeOut'
                            }}
                            className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full"
                            style={{
                                background: ['#ff6b35', '#ffd700', '#ff4500', '#dc143c', '#ff8c00'][Math.floor(Math.random() * 5)],
                                boxShadow: '0 0 10px currentColor'
                            }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OreshnikAnimation;
