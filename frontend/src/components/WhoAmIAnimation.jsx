import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import handPointing from '../assets/hand_pointing.png';

const WhoAmIAnimation = ({ isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            // Auto close after 5 seconds or keep until click
            // const timer = setTimeout(onClose, 5000);
            // return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md cursor-pointer overflow-hidden"
            >
                {/* Text Animation */}
                <motion.h1
                    initial={{ scale: 0, opacity: 0, y: -100 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{
                        delay: 0.5,
                        type: "spring",
                        stiffness: 300,
                        damping: 15
                    }}
                    className="text-6xl md:text-8xl font-black text-red-600 uppercase tracking-tighter text-center drop-shadow-[0_0_15px_rgba(220,38,38,0.8)] font-display z-20"
                    style={{ textShadow: '4px 4px 0px #000' }}
                >
                    ТЫ ПИДОР
                </motion.h1>

                {/* Hand Animation */}
                <motion.div
                    initial={{ y: 500, scale: 0.5, opacity: 0 }}
                    animate={{ y: 100, scale: 1.2, opacity: 1 }}
                    transition={{
                        duration: 0.8,
                        type: "spring",
                        bounce: 0.4
                    }}
                    className="relative z-10 w-[500px] h-[500px] flex items-center justify-center"
                >
                    <img
                        src={handPointing}
                        alt="Pointing Hand"
                        className="w-full h-full object-contain filter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    />
                </motion.div>

                <div className="absolute bottom-10 text-white/30 text-sm animate-pulse">
                    Нажми, чтобы закрыть
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default WhoAmIAnimation;
