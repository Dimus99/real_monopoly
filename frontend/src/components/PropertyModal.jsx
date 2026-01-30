import React from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, Home, Building2, Hotel, MapPin, Plane } from 'lucide-react';
import { CHARACTERS } from '../constants/characters';

// Group color mapping
const GROUP_COLORS = {
    Brown: { bg: '#8B4513', text: '#fff', gradient: 'linear-gradient(180deg, #8B4513, #5D2E0C)' },
    LightBlue: { bg: '#87CEEB', text: '#1a1a2e', gradient: 'linear-gradient(180deg, #87CEEB, #5F9EA0)' },
    Pink: { bg: '#FF69B4', text: '#fff', gradient: 'linear-gradient(180deg, #FF69B4, #C71585)' },
    Orange: { bg: '#FF8C00', text: '#fff', gradient: 'linear-gradient(180deg, #FF8C00, #E67E00)' },
    Red: { bg: '#DC143C', text: '#fff', gradient: 'linear-gradient(180deg, #DC143C, #B22222)' },
    Yellow: { bg: '#FFD700', text: '#1a1a2e', gradient: 'linear-gradient(180deg, #FFD700, #DAA520)' },
    Green: { bg: '#228B22', text: '#fff', gradient: 'linear-gradient(180deg, #228B22, #006400)' },
    DarkBlue: { bg: '#191970', text: '#fff', gradient: 'linear-gradient(180deg, #191970, #00008B)' },
    Cyan: { bg: '#00FFFF', text: '#1a1a2e', gradient: 'linear-gradient(180deg, #00FFFF, #00CED1)' },
    Station: { bg: '#2c2c2c', text: '#fff', gradient: 'linear-gradient(180deg, #2c2c2c, #000000)' },
    Railroad: { bg: '#2c2c2c', text: '#fff', gradient: 'linear-gradient(180deg, #2c2c2c, #000000)' },
    Utility: { bg: '#4a4a4a', text: '#fff', gradient: 'linear-gradient(180deg, #4a4a4a, #2b2b2b)' },
    Special: { bg: '#1a1a2e', text: '#FFD700', gradient: 'linear-gradient(180deg, #1a1a2e, #0a0a1a)' }
};

// Tile images fallbacks
const TILE_IMAGES = {
    'Moscow': '/tiles/moscow.png',
    'Washington': '/tiles/washington.png',
    'Kyiv': '/tiles/kyiv.png',
    'Beijing': '/tiles/beijing.png',
    'Greenland': '/tiles/greenland.png'
};

const DISPLAY_NAMES = {
    'Jail': 'Остров Эпштейна',
    'Go to Jail': 'Рейс на остров',
    'Free Parking': 'Саммит ООН'
};

const getTileImage = (property) => {
    if (TILE_IMAGES[property.name]) return TILE_IMAGES[property.name];
    const groupMap = {
        'Brown': '/tiles/moscow.png',
        'LightBlue': '/tiles/moscow.png',
        'Pink': '/tiles/kyiv.png',
        'Orange': '/tiles/kyiv.png',
        'Red': '/tiles/beijing.png',
        'Yellow': '/tiles/beijing.png',
        'Green': '/tiles/washington.png',
        'DarkBlue': '/tiles/washington.png',
        'Station': '/tiles/greenland.png',
        'Utility': '/tiles/greenland.png'
    };
    return groupMap[property.group] || '/tiles/greenland.png';
};

const PropertyDetailView = ({ property, players, tiles, canBuy, onBuy, onClose, onBuild, onSellHouse, onMortgage, onUnmortgage, canBuild, currentPlayerId }) => {
    if (!property) return null;

    const groupColor = GROUP_COLORS[property.group] || GROUP_COLORS.Special;
    const owner = property.owner_id ? players[property.owner_id] : null;
    const image = getTileImage(property);
    const displayName = DISPLAY_NAMES[property.name] || property.name;

    const isPropertyType = !['Special', 'Chance', 'Tax', 'Jail', 'GoToJail', 'FreeParking'].includes(property.group);
    const housePrice = Math.floor(property.price / 2) + 50;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[320px] md:w-[350px] max-h-[90vh] bg-[#1a1b26] rounded-[32px] overflow-hidden flex flex-col relative shadow-[0_30px_90px_rgba(0,0,0,0.8)] border border-white/10"
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-50 p-2.5 bg-black/60 hover:bg-black/80 rounded-full text-white/70 hover:text-white transition-all shadow-xl border border-white/10"
            >
                <X size={20} />
            </button>

            {/* Premium Card Header */}
            <div className="relative h-[140px] shrink-0 overflow-hidden">
                <div
                    className="absolute inset-0 z-10 opacity-90"
                    style={{ background: groupColor.gradient || groupColor.bg }}
                />
                {image && (
                    <img
                        src={image}
                        alt={displayName}
                        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay scale-110"
                    />
                )}

                <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] to-transparent z-20" />

                <div className="relative z-30 h-full flex flex-col items-center justify-end p-4 pb-4 text-center">
                    {property.group === 'Station' && (
                        <div className="absolute top-4 left-4 z-40 p-2 bg-blue-500/20 rounded-lg backdrop-blur-md border border-blue-400/30">
                            <Plane size={16} className="text-blue-200" />
                        </div>
                    )}
                    <div className="mb-1 text-[8px] font-black uppercase tracking-[0.4em] text-white/50">
                        {property.group === 'Station' ? 'ТРАНСПОРТНЫЙ УЗЕЛ' : `${property.group} АКТИВЫ`}
                    </div>
                    <h2
                        className="font-display text-2xl font-black leading-tight text-white tracking-tight uppercase"
                        style={{ textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}
                    >
                        {displayName}
                    </h2>
                </div>
            </div>

            {/* Card Content */}
            <div className="flex-1 p-6 space-y-4 bg-gradient-to-b from-[#1a1a2e] to-[#0c0c14] overflow-y-auto custom-scrollbar">
                {isPropertyType ? (
                    <>
                        {/* Price & Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-[16px] text-center backdrop-blur-md">
                                <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-0.5">Цена</div>
                                <div className="text-xl font-black text-yellow-400 font-mono tracking-tighter">
                                    ${property.price?.toLocaleString()}
                                </div>
                            </div>
                            <div className="bg-white/[0.03] border border-white/5 p-3 rounded-[16px] text-center backdrop-blur-md">
                                <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-0.5">Рента</div>
                                <div className="text-xl font-black text-white font-mono tracking-tighter">
                                    ${property.rent?.[0]?.toLocaleString()}
                                </div>
                            </div>
                        </div>
                        {property.owner_id && !property.is_mortgaged && (
                            <div className={`p-3 rounded-[16px] text-center backdrop-blur-md border ${property.isolation_turns > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                                <div className={`text-[9px] uppercase font-black tracking-widest mb-0.5 ${property.isolation_turns > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {property.isolation_turns > 0 ? 'Ядерная Угроза' : 'Текущая аренда'}
                                </div>
                                <div className="text-2xl font-black text-white font-mono tracking-tighter flex items-center justify-center gap-2">
                                    {property.isolation_turns > 0 ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <span className="text-xl">☢️</span>
                                                <span>БЛОК</span>
                                            </div>
                                            <div className="text-[10px] text-red-400/70 font-bold uppercase mt-1">
                                                Аренда заблокирована ({property.isolation_turns})
                                            </div>
                                        </div>
                                    ) : (
                                        `$${(() => {
                                            if (property.houses > 0) return (property.rent?.[property.houses] || 0).toLocaleString();
                                            if (property.group === 'Station') {
                                                const stations_owned = tiles ? tiles.filter(t => t.group === 'Station' && t.owner_id === property.owner_id).length : 1;
                                                return (property.rent?.[stations_owned - 1] || property.rent?.[0] || 0).toLocaleString();
                                            }
                                            return ((property.is_monopoly && property.group !== 'Utility') ? (property.rent?.[0] * 2) : (property.rent?.[0] || 0)).toLocaleString();
                                        })()}`
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Special Rents Info (Utilities / Stations) */}
                        {property.group === 'Utility' && (
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-[20px] text-center backdrop-blur-md">
                                <div className="text-[10px] text-blue-300 uppercase font-black tracking-widest mb-1">Особые условия</div>
                                <div className="text-xs text-blue-100 leading-relaxed font-bold">
                                    Владение 1 компанией: <span className="text-white">10% от наличных</span>
                                    <br />
                                    Владение 2 компаниями: <span className="text-yellow-400">20% от наличных (x2)</span>
                                </div>
                            </div>
                        )}
                        {property.group === 'Station' && (
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-[20px] text-center backdrop-blur-md">
                                <div className="text-[10px] text-blue-300 uppercase font-black tracking-widest mb-1">Тарифная сетка</div>
                                <div className="text-xs text-blue-100 leading-relaxed font-bold grid grid-cols-4 gap-1 mt-1">
                                    {property.rent?.map((r, i) => {
                                        const stations_owned = tiles ? tiles.filter(t => t.group === 'Station' && t.owner_id === property.owner_id).length : 0;
                                        const active = stations_owned === (i + 1);
                                        return (
                                            <div key={i} className={active ? 'scale-110' : 'opacity-60'}>
                                                {i + 1}: <span className={active ? 'text-yellow-400 font-black' : 'text-white'}>${r}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ownership Badge */}
                        <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-[20px] border border-white/5 shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Владелец</span>
                                <span className={`text-[11px] font-bold ${owner ? 'text-white' : 'text-green-400'}`}>
                                    {owner ? 'Частный актив' : 'Свободно'}
                                </span>
                            </div>
                            {owner ? (
                                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                                    <img
                                        src={CHARACTERS[owner.character]?.avatar || owner.avatar || '/avatars/putin.png'}
                                        className="w-6 h-6 rounded-full border border-white/20 object-cover shadow-lg"
                                        alt=""
                                    />
                                    <span className="text-xs font-bold text-white truncate max-w-[80px]">{owner.name}</span>
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                                    <MapPin size={16} className="text-green-400" />
                                </div>
                            )}
                        </div>

                        {/* Development Rent Table */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Доходность развития</span>
                                <div className="flex gap-1.5 opacity-40">
                                    <Home size={12} />
                                    <Building2 size={12} />
                                    <Hotel size={12} />
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2.5">
                                {[1, 2, 3, 4].map(h => (
                                    <div key={h} className={`bg-white/[0.02] border border-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-between group px-1 ${property.houses === h ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                                        <div className="flex gap-0.5 mb-2.5">
                                            {Array(h).fill(0).map((_, i) => (
                                                <div key={i} className="w-1.5 h-2 bg-green-500 rounded-[2px] shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                            ))}
                                        </div>
                                        <div className="text-[11px] font-black font-mono text-gray-300">
                                            ${property.rent?.[h]}
                                        </div>
                                    </div>
                                ))}
                                <div className={`bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-2.5 flex flex-col items-center justify-between shadow-[inset_0_0_20px_rgba(234,179,8,0.05)] ${property.houses === 5 ? 'border-yellow-500 bg-yellow-500/20' : ''}`}>
                                    <Hotel size={16} className="text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)] mb-2" />
                                    <div className="text-[11px] font-black font-mono text-yellow-500">
                                        ${property.rent?.[5]}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-6 px-4">
                        <motion.div
                            animate={{ y: [0, -12, 0], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="text-8xl mb-10 filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                        >
                            {displayName === 'JACKPOT' && '🎰'}
                            {displayName === 'SUPER JACKPOT' && '🎰'}
                            {property.group === 'Jail' && '⚖️'}
                            {property.group === 'GoToJail' && '🚨'}
                            {property.group === 'FreeParking' && '🏔️'}
                            {property.group === 'Chance' && '🃏'}
                            {property.group === 'Tax' && '💸'}
                            {property.group === 'Special' && '🌟'}
                        </motion.div>
                        <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wider">
                            {displayName}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-[240px] opacity-80">
                            {displayName === 'GO' && 'Заберите свой корпоративный бонус за проход круга.'}
                            {property.group === 'Jail' && 'Дипломатический изолятор. Отдыхайте, пока другие работают.'}
                            {property.group === 'GoToJail' && 'Ваши активы под арестом. Проследуйте в изолятор.'}
                            {property.group === 'FreeParking' && 'Зона оффшоров. Ваши деньги здесь в безопасности.'}
                            {property.group === 'Chance' && 'Секретная депеша. Пан или пропал?'}
                            {property.group === 'Tax' && 'Налог на роскошь в пользу неизвестных лиц.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 pt-0 space-y-2 bg-[#0c0c14]">
                {canBuy && isPropertyType && !owner && (
                    <motion.button
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onBuy}
                        className="btn btn-success w-full h-14 text-lg tracking-tight"
                    >
                        <DollarSign size={20} className="animate-bounce" /> КУПИТЬ АКТИВ
                    </motion.button>
                )}

                {/* Development Management */}
                {owner && owner.id === currentPlayerId && isPropertyType && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Build Button */}
                            {canBuild && property.houses < 5 && !['Utility', 'Station'].includes(property.group) && !property.is_mortgaged ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onBuild(property.id)}
                                    className="h-14 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center gap-2 text-white font-bold shadow-lg shadow-blue-900/40 border border-blue-400/20"
                                >
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[10px] opacity-70 uppercase tracking-wider">Построить</span>
                                        <span className="text-sm">{property.houses < 4 ? 'ДОМ' : 'ОТЕЛЬ'} ${housePrice}</span>
                                    </div>
                                    <Home size={18} className="text-blue-200" />
                                </motion.button>
                            ) : <div />}

                            {/* Sell House Button */}
                            {property.houses > 0 ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onSellHouse && onSellHouse(property.id)}
                                    className="h-14 bg-gradient-to-r from-red-600 to-red-500 rounded-xl flex items-center justify-center gap-2 text-white font-bold shadow-lg shadow-red-900/40 border border-red-400/20"
                                >
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[10px] opacity-70 uppercase tracking-wider">Продать</span>
                                        <span className="text-sm">{property.houses === 5 ? 'ОТЕЛЬ' : 'ДОМ'} +${Math.floor(((property.price / 2) + 50) * 0.7)}</span>
                                    </div>
                                    <Home size={18} className="text-red-200" />
                                </motion.button>
                            ) : <div />}
                        </div>

                        {/* Mortgage / Unmortgage Buttons */}
                        <div className="flex gap-2">
                            {!property.is_mortgaged ? (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onMortgage(property.id)}
                                    disabled={property.houses > 0}
                                    className={`flex-1 h-12 border rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${property.houses > 0
                                        ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed opacity-50'
                                        : 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 border-orange-600/30'
                                        }`}
                                    title={property.houses > 0 ? "Сначала продайте здания" : ""}
                                >
                                    Заложить (+${Math.floor(property.price * 0.7)})
                                </motion.button>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => onUnmortgage(property.id)}
                                    className="flex-1 h-12 bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                                >
                                    Выкупить (-${Math.floor(property.price * 0.8)})
                                </motion.button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </motion.div >
    );
};

export default PropertyDetailView;
