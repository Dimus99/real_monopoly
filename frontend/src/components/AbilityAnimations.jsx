import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Trump's Buyout Animation
export const BuyoutAnimation = ({ isVisible, onComplete, targetProperty = 'Property' }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
                    onAnimationComplete={() => setTimeout(onComplete, 2500)}
                >
                    {/* Dark overlay with gold tint */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.85 }}
                        className="absolute inset-0 bg-gradient-to-br from-black via-amber-900/30 to-black"
                    />

                    {/* Money rain effect */}
                    {Array(30).fill(0).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                y: -100,
                                x: `${Math.random() * 100}%`,
                                rotate: 0,
                                opacity: 1
                            }}
                            animate={{
                                y: '120vh',
                                rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                                opacity: [1, 1, 0.5]
                            }}
                            transition={{
                                duration: 2 + Math.random() * 2,
                                delay: Math.random() * 0.5,
                                ease: 'linear'
                            }}
                            className="absolute text-4xl"
                        >
                            💵
                        </motion.div>
                    ))}

                    {/* Trump silhouette pose */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5, repeat: 3 }}
                            className="text-[120px]"
                        >
                            🤝
                        </motion.div>
                    </motion.div>

                    {/* "DEAL!" text */}
                    <motion.div
                        initial={{ opacity: 0, scale: 2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8, type: 'spring' }}
                        className="absolute top-1/4 left-0 right-0 text-center"
                    >
                        <div className="font-display text-6xl md:text-8xl text-yellow-400 font-black tracking-wider drop-shadow-lg">
                            THE ART OF THE DEAL
                        </div>
                    </motion.div>

                    {/* Property acquired text */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 }}
                        className="absolute bottom-20 left-0 right-0 text-center"
                    >
                        <div className="text-2xl text-white font-bold">
                            Property Acquired! 🏢
                        </div>
                        <div className="text-orange-400 text-xl mt-2">
                            {targetProperty}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Zelensky's Aid Animation
export const AidAnimation = ({ isVisible, onComplete, amount = 100 }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
                    onAnimationComplete={() => setTimeout(onComplete, 2500)}
                >
                    {/* Blue and yellow overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to bottom, #0057B8 50%, #FFD700 50%)'
                        }}
                    />

                    {/* Hearts/hands coming from edges */}
                    {Array(20).fill(0).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                x: i % 2 === 0 ? '-10%' : '110%',
                                y: `${20 + Math.random() * 60}%`,
                                scale: 0
                            }}
                            animate={{
                                x: '50%',
                                y: '50%',
                                scale: [0, 1.5, 0]
                            }}
                            transition={{
                                duration: 1.5,
                                delay: 0.5 + i * 0.1,
                                ease: 'easeOut'
                            }}
                            className="absolute text-4xl"
                        >
                            {['🤝', '💙', '💛', '🇺🇦'][i % 4]}
                        </motion.div>
                    ))}

                    {/* Center message */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 1, repeat: 2 }}
                            className="text-8xl mb-4"
                        >
                            🇺🇦
                        </motion.div>
                        <div className="font-display text-5xl md:text-7xl text-white font-black drop-shadow-lg">
                            AID RECEIVED!
                        </div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 }}
                            className="text-3xl text-yellow-300 mt-4 font-bold"
                        >
                            +${amount} FROM ALLIES
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Kim's Nuke Threat Animation
export const NukeThreatAnimation = ({ isVisible, onComplete }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
                    onAnimationComplete={() => setTimeout(onComplete, 3000)}
                >
                    {/* Red alert overlay */}
                    <motion.div
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 0.5, repeat: 5 }}
                        className="absolute inset-0 bg-red-900"
                    />

                    {/* Warning symbols */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 0.3, repeat: 8 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                    >
                        <div className="text-[150px]">☢️</div>
                    </motion.div>

                    {/* Text */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
                        transition={{ duration: 1.5 }}
                        className="absolute top-20 left-0 right-0 text-center"
                    >
                        <div className="font-display text-5xl text-red-500 font-black">
                            ⚠️ NUCLEAR THREAT ⚠️
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2 }}
                        className="absolute bottom-20 left-0 right-0 text-center"
                    >
                        <div className="text-2xl text-white">
                            Property Blocked! ⛔
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Victory Animation
export const VictoryAnimation = ({ isVisible, onComplete, winnerName, winnerCharacter }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                >
                    {/* Confetti background */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-black"
                    />

                    {/* Confetti particles */}
                    {Array(50).fill(0).map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                y: -20,
                                x: `${Math.random() * 100}%`,
                                rotate: 0
                            }}
                            animate={{
                                y: '120vh',
                                rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                delay: Math.random() * 2,
                                repeat: Infinity
                            }}
                            className="absolute w-3 h-3"
                            style={{
                                backgroundColor: ['#FFD700', '#FF6B35', '#00D26A', '#FF69B4', '#87CEEB'][i % 5],
                                borderRadius: i % 2 === 0 ? '50%' : '0'
                            }}
                        />
                    ))}

                    {/* Victory content */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="relative z-10 text-center"
                    >
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="text-8xl mb-6"
                        >
                            👑
                        </motion.div>

                        <div className="font-display text-6xl md:text-8xl text-yellow-400 font-black mb-4">
                            VICTORY!
                        </div>

                        <div className="text-3xl text-white font-bold">
                            {winnerName} has conquered the world!
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onComplete}
                            className="mt-8 btn-primary pointer-events-auto"
                        >
                            Return to Lobby
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Biden's Sanctions Animation
export const SanctionsAnimation = ({ isVisible, onComplete }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
                    onAnimationComplete={() => setTimeout(onComplete, 3000)}
                >
                    {/* Dark/Ice overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.9 }}
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                    />

                    {/* Chains/Lock icon */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        <div className="text-[120px] filter drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            🔒
                        </div>
                    </motion.div>

                    {/* Text */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute top-2/3 left-0 right-0 text-center"
                    >
                        <div className="font-display text-6xl text-blue-400 font-bold tracking-widest uppercase">
                            SANCTIONS IMPOSED
                        </div>
                        <div className="text-2xl text-white mt-4 font-mono">
                            ASSETS FROZEN // TURN SKIPPED
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Xi's Belt & Road Animation
export const BeltRoadAnimation = ({ isVisible, onComplete, bonus = 0 }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
                    onAnimationComplete={() => setTimeout(onComplete, 2500)}
                >
                    {/* Red overlay */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-0 bg-gradient-to-r from-red-600/90 to-red-900/40"
                    />

                    {/* Moving Train/Road effect */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, delay: 0.2, ease: 'linear' }}
                        className="absolute top-1/2 -translate-y-1/2 w-full h-32 bg-amber-500/20 flex items-center"
                    >
                        <div className="text-6xl mx-10">🚂</div>
                        <div className="flex-1 border-b-4 border-dashed border-amber-400/50"></div>
                        <div className="text-6xl mx-10">🏗️</div>
                    </motion.div>

                    {/* Text */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="absolute top-1/3 left-0 right-0 text-center"
                    >
                        <div className="font-display text-6xl text-amber-400 font-black uppercase text-shadow">
                            BELT & ROAD
                        </div>
                        <div className="text-3xl text-white font-bold mt-2">
                            Infrastructure Bonus Collected!
                        </div>
                        {bonus > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1.5 }}
                                className="text-4xl text-green-400 font-mono mt-6 font-bold"
                            >
                                +${bonus}
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


