import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Shield, Info } from 'lucide-react';

const CharacterSelection = ({ characters, selectedId, onSelect }) => {
    const selectedChar = characters.find(c => c.id === selectedId) || characters[0];

    return (
        <div className="space-y-6">
            {/* Main Preview Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedChar.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass-card p-5 relative overflow-hidden group"
                >
                    {/* Background Glow Effect */}
                    <div
                        className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20"
                        style={{
                            background: `linear-gradient(135deg, ${selectedChar.color}, transparent 60%)`
                        }}
                    />

                    <div className="flex flex-row items-center gap-5 relative z-10">
                        {/* Avatar Column */}
                        <div className="relative shrink-0">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 15 }}
                                className="w-24 h-24 rounded-2xl p-0.5 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm shadow-xl flex-shrink-0"
                                style={{ width: '96px', height: '96px', minWidth: '96px' }}
                            >
                                <img
                                    src={selectedChar.avatar}
                                    alt={selectedChar.name}
                                    className="w-full h-full rounded-xl object-cover block"
                                    style={{ border: `2px solid ${selectedChar.color}` }}
                                />
                            </motion.div>

                            {/* Country Flag/Badge */}
                            <div
                                className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-lg flex items-center gap-1 border border-white/20 whitespace-nowrap"
                                style={{ background: selectedChar.color }}
                            >
                                <Star size={8} fill="currentColor" />
                                {selectedChar.country}
                            </div>
                        </div>

                        {/* Info Column */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-display font-bold text-white leading-none mb-1">
                                {selectedChar.name}
                            </h2>
                            <div className="text-gray-400 text-xs mb-3 flex items-center gap-1.5">
                                <Shield size={10} />
                                Аватар
                            </div>

                            {/* Ability Stats - Compact */}
                            <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-white shadow-inner font-bold"
                                    style={{ background: selectedChar.color }}
                                >
                                    {selectedChar.ability[0]}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-white text-xs leading-tight">
                                        {selectedChar.ability}
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate">
                                        {selectedChar.abilityDesc}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Carousel / Roster */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 mb-2 px-1 uppercase tracking-wider">Выберите лидера</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x scrollbar-hide mask-fade-sides">
                    {characters.map((char) => {
                        const isSelected = selectedId === char.id;
                        return (
                            <motion.button
                                key={char.id}
                                onClick={() => onSelect(char.id)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`
                                    relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden transition-all duration-300
                                    snap-start border-2
                                    ${isSelected ? 'ring-2 ring-offset-1 ring-offset-black/50 opacity-100' : 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0'}
                                `}
                                style={{
                                    borderColor: isSelected ? char.color : 'rgba(255,255,255,0.1)',
                                    '--tw-ring-color': char.color,
                                    width: '48px',
                                    height: '48px',
                                    minWidth: '48px'
                                }}
                            >
                                <img
                                    src={char.avatar}
                                    alt={char.name}
                                    className="w-full h-full object-cover"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-1">
                                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-0.5">
                                            <Check size={10} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CharacterSelection;
