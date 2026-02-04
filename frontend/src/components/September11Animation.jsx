import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const September11Animation = ({ isVisible, onComplete }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] pointer-events-none overflow-hidden bg-black/90 flex items-center justify-center"
                    onAnimationComplete={() => setTimeout(onComplete, 1000)} // Wait 1s after global animation
                >
                    {/* Sky Background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-blue-800 to-orange-900 opacity-50" />

                    {/* Towers Container - Centered */}
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-8 items-end h-[70vh] z-10"
                    >
                        {/* Tower 1 */}
                        <div className="w-32 h-full bg-gray-300 border-x-4 border-t-4 border-gray-500 relative shadow-2xl flex flex-col">
                            {/* Antenna */}
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-1 h-16 bg-gray-400" />
                            {/* Windows */}
                            <div className="grid grid-cols-4 gap-1 p-2 h-full content-start opacity-50">
                                {Array(60).fill(0).map((_, i) => <div key={i} className="h-3 bg-black/40 w-full" />)}
                            </div>
                        </div>
                        {/* Tower 2 */}
                        <div className="w-32 h-full bg-gray-300 border-x-4 border-t-4 border-gray-500 relative shadow-2xl flex flex-col">
                            <div className="grid grid-cols-4 gap-1 p-2 h-full content-start opacity-50">
                                {Array(60).fill(0).map((_, i) => <div key={i} className="h-3 bg-black/40 w-full" />)}
                            </div>
                        </div>
                    </motion.div>

                    {/* Plane */}
                    {/* Plane */}
                    <motion.div
                        initial={{ x: '120vw', y: '20vh', scale: 0.8 }}
                        animate={{ x: '50vw', y: '55vh', scale: 1.5 }}
                        transition={{ duration: 2.3, ease: "easeIn" }}
                        className="absolute top-0 left-0 z-20"
                    >
                        {/* 
                           Emoji ✈️ points roughly NE (45deg). 
                           We want it pointing SW (225deg) roughly to hit towers from top-right.
                           scaleX(-1) mirrors it to point NW. Then rotate -45 to point W? 
                           Let's just use rotation on the emoji itself.
                           Base: 45deg. 
                           Target: Left-Down (~200deg).
                           Rotate 155deg?
                        */}
                        <div className="text-[80px] leading-none transform rotate-[200deg]">✈️</div>
                    </motion.div>

                    {/* Explosion Effect */}
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 8, 6],
                            opacity: [0, 1, 0, 0]
                        }}
                        transition={{ delay: 2.3, duration: 1.5, times: [0, 0.1, 0.8, 1] }} // Plane hits at 2.5s? adjust timing
                        className="absolute top-[60vh] left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex items-center justify-center"
                        style={{ top: '60%' }}
                    >
                        <div className="text-[300px] filter drop-shadow-[0_0_50px_rgba(255,69,0,0.8)]">💥</div>
                    </motion.div>

                    {/* Flash */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ delay: 2.3, duration: 0.5 }}
                        className="absolute inset-0 bg-white z-[60]"
                    />

                    {/* Smoke/Debris after explosion */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.4, duration: 0.5 }}
                        className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-center"
                        >
                            <h1 className="text-6xl text-red-600 font-black tracking-widest uppercase drop-shadow-lg mb-4">CRITICAL HIT</h1>
                            <div className="text-2xl text-white font-mono">Properties Destroyed</div>
                        </motion.div>
                    </motion.div>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default September11Animation;
