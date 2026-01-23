import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, Users, Bot, Play, Check, Home, Clock, ArrowLeftRight,
    ArrowLeft, MessageSquare, Settings, Bell,
    Menu, UserPlus, X, MapPin, ChevronLeft, ChevronRight
} from 'lucide-react';
import useGameSocket from '../hooks/useGameSocket';
import Board from '../components/Board';
import OreshnikAnimation from '../components/OreshnikAnimation';
import PropertyModal from '../components/PropertyModal';
import DiceAnimation from '../components/DiceAnimation';
import ToastNotification from '../components/ToastNotification';
import ActionPanel from '../components/ActionPanel';
import TradeModal from '../components/TradeModal';
import TradeNotification from '../components/TradeNotification';
import * as AbilityAnimations from '../components/AbilityAnimations';

// Character data
const CHARACTERS = {
    Putin: { avatar: '/avatars/putin.png', color: '#C41E3A', ability: 'ORESHNIK' },
    Trump: { avatar: '/avatars/trump.png', color: '#FF6B35', ability: 'BUYOUT' },
    Zelensky: { avatar: '/avatars/zelensky.png', color: '#0057B8', ability: 'AID' },
    Kim: { avatar: '/avatars/kim.png', color: '#8B0000', ability: 'NUKE' },
    Biden: { avatar: '/avatars/biden.png', color: '#3C3B6E', ability: 'SANCTIONS' },
    Xi: { avatar: '/avatars/xi.png', color: '#DE2910', ability: 'DEBT' }
};

const GameRoom = () => {
    const { gameId, playerId } = useParams();
    const navigate = useNavigate();
    const { gameState, sendAction, lastAction } = useGameSocket(gameId, playerId);

    // UI States
    const [showOreshnik, setShowOreshnik] = useState(false);
    const [selectedTile, setSelectedTile] = useState(null);
    const [isRolling, setIsRolling] = useState(false); // For button disable
    const [diceValues, setDiceValues] = useState([1, 1]);
    const [copied, setCopied] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showMobilePlayers, setShowMobilePlayers] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Dice Animation States
    const [showDice, setShowDice] = useState(false);
    const [diceRolling, setDiceRolling] = useState(false);

    // Animation States
    const [showBuyout, setShowBuyout] = useState(false);
    const [showAid, setShowAid] = useState(false);
    const [showNuke, setShowNuke] = useState(false);
    const [showVictory, setShowVictory] = useState(false);

    // Trade States
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [tradeTarget, setTradeTarget] = useState(null);
    const [incomingTrade, setIncomingTrade] = useState(null);

    // Sync State for delayed movement
    const [delayedPlayers, setDelayedPlayers] = useState({});

    // Targeting State
    const [targetingAbility, setTargetingAbility] = useState(null); // 'ORESHNIK', 'BUYOUT', etc.

    const currentPlayer = gameState?.players?.[playerId];
    const isMyTurn = gameState?.player_order?.[gameState?.current_turn_index] === playerId;
    const currentTurnPlayer = gameState?.players?.[gameState?.player_order?.[gameState?.current_turn_index]];

    // Contextual actions
    const currentTile = gameState?.board?.[currentPlayer?.position];
    const canBuy = isMyTurn &&
        currentTile &&
        !currentTile.owner_id &&
        !['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax'].includes(currentTile.group) &&
        !currentTile.is_destroyed;

    const handleBuyProperty = () => {
        if (!isMyTurn || !currentPlayer) return;
        sendAction('BUY', { property_id: currentPlayer.position });
    };

    const handleAbility = (abilityType) => {
        if (!isMyTurn || !currentPlayer) return;

        // Some abilities require target selection
        if (['ORESHNIK', 'BUYOUT', 'ISOLATION', 'SANCTIONS'].includes(abilityType)) {
            setTargetingAbility(abilityType);
        } else {
            sendAction('USE_ABILITY', { ability_type: abilityType });
        }
    };

    // Timer state
    const [timeLeft, setTimeLeft] = useState(45);

    useEffect(() => {
        if (!gameState?.turn_expiry) return;

        const updateTimer = () => {
            const expiry = new Date(gameState.turn_expiry).getTime();
            const now = new Date().getTime();
            const diff = Math.ceil((expiry - now) / 1000);
            setTimeLeft(Math.max(0, diff));
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [gameState?.turn_expiry]);



    const handleRoll = () => {
        if (!isMyTurn || isRolling) return;
        setIsRolling(true);
        sendAction('ROLL');
    };

    // Handle Chat
    const handleSendMessage = (text) => {
        if (text.trim()) {
            sendAction('CHAT', { message: text });
        }
    };

    // Add bot
    const addBot = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            await fetch(`http://localhost:8000/api/games/${gameId}/bots`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) {
            console.error(e);
        }
    };

    // Start game
    const startGame = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            await fetch(`http://localhost:8000/api/games/${gameId}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) {
            console.error(e);
        }
    };

    // Copy game code
    const copyGameCode = () => {
        navigator.clipboard.writeText(gameId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Invite Friend
    const handleInvite = (friend) => {
        alert(`Invite sent to ${friend.name}!`);
        setShowInviteModal(false);
    };

    // Trade Logic
    const initiateTrade = (targetPlayer) => {
        setTradeTarget(targetPlayer);
        setShowTradeModal(true);
    };

    const handleSendOffer = (offerData) => {
        sendAction('TRADE_OFFER', offerData);
        setShowTradeModal(false);
    };

    const handleRespondTrade = (tradeId, response) => {
        sendAction('TRADE_RESPONSE', { trade_id: tradeId, response });
        setIncomingTrade(null);
    };

    // Effects for animations
    useEffect(() => {
        if (!lastAction) return;

        switch (lastAction.type) {
            case 'ORESHNIK':
                setShowOreshnik(true);
                break;
            case 'BUYOUT':
                setShowBuyout(true);
                break;
            case 'AID':
                setShowAid(true);
                break;
            case 'NUKE':
                setShowNuke(true);
                break;
            case 'DICE_ROLLED':
                setDiceValues(lastAction.dice || gameState?.dice);
                setShowDice(true);
                setDiceRolling(true);

                setTimeout(() => {
                    setDiceRolling(false);
                    setTimeout(() => {
                        setShowDice(false);
                        setIsRolling(false);
                    }, 2000);
                }, 2000);
                break;
            case 'GAME_OVER':
                setShowVictory(true);
                break;
            case 'TRADE_OFFERED':
                if (lastAction.trade.to_player_id === playerId) {
                    setIncomingTrade(lastAction.trade);
                }
                break;
            case 'TRADE_UPDATED':
                setIncomingTrade(null);
                break;
            case 'CHAT_MESSAGE':
                // Chat messages are handled through lastAction - they update the logs display
                break;
        }
    }, [lastAction]);

    useEffect(() => {
        if (gameState?.players) {
            if (!diceRolling) {
                setDelayedPlayers(gameState.players);
            }
        }
    }, [gameState?.players, diceRolling]);

    useEffect(() => {
        if (gameState?.dice) {
            if (!showDice) {
                setDiceValues(gameState.dice);
            }
        }
    }, [gameState?.dice]);

    // Handle tile click
    const handleTileClick = (tileId) => {
        if (targetingAbility) {
            sendAction('USE_ABILITY', {
                ability_type: targetingAbility,
                target_id: tileId
            });
            setTargetingAbility(null);
            return;
        }

        const tile = gameState?.board?.find(t => t.id === tileId);
        if (tile) {
            setSelectedTile(tile);
        }
    };

    if (!gameState) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-20 h-20 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-6"
                    />
                    <div className="text-2xl font-display text-white">Connecting...</div>
                    <div className="text-gray-400 mt-2 font-mono">{gameId}</div>
                </motion.div>
            </div>
        );
    }

    if (gameState.game_status === 'waiting') {
        const friends = JSON.parse(localStorage.getItem('monopoly_friends') || '[]');
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-0 overflow-hidden max-w-4xl w-full flex flex-col md:flex-row min-h-[500px]"
                >
                    <div className="p-8 md:w-1/2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 bg-black/20">
                        <motion.h1 className="font-display text-4xl font-bold text-white mb-2">LOBBY</motion.h1>
                        <p className="text-gray-400 mb-8">Waiting for players...</p>
                        <div className="mb-8">
                            <div className="text-sm text-gray-500 mb-2 uppercase tracking-widest">Game Code</div>
                            <div onClick={copyGameCode} className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/10 hover:border-yellow-500/50 cursor-pointer group transition-all">
                                <span className="font-mono text-3xl font-bold text-white tracking-[0.2em]">{gameState.game_id}</span>
                                <div className="p-2 bg-white/5 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
                                    {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-white" />}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button onClick={() => setShowInviteModal(true)} className="btn btn-blue w-full">
                                <UserPlus size={20} /> Invite Friend
                            </button>
                            <button onClick={startGame} disabled={gameState.player_order.length < 2} className="btn btn-primary w-full">
                                <Play size={20} /> Start Match
                            </button>
                        </div>
                    </div>
                    <div className="p-6 md:w-1/2 bg-black/10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Users size={20} /> Players</h2>
                            <button onClick={addBot} className="btn btn-blue btn-sm">
                                <Bot size={16} /> Add Bot
                            </button>
                        </div>
                        <div className="space-y-3">
                            {gameState.player_order.map((pid, idx) => {
                                const p = gameState.players[pid];
                                const char = CHARACTERS[p.character];
                                return (
                                    <motion.div key={pid} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                        <img src={char?.avatar} className="w-10 h-10 rounded-full object-cover bg-black/50" alt={p.name} />
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm">{p.name}</div>
                                            <div className="text-xs text-gray-400">{p.character}</div>
                                        </div>
                                        {pid === playerId && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">YOU</span>}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
                <AnimatePresence>
                    {showInviteModal && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={e => e.stopPropagation()} className="glass-card p-6 max-w-sm w-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-white">Invite Friends</h3>
                                    <button onClick={() => setShowInviteModal(false)}><X size={20} className="text-gray-400" /></button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {JSON.parse(localStorage.getItem('monopoly_friends') || '[]').length === 0 ? (
                                        <div className="text-gray-500 text-center py-4">No friends added yet</div>
                                    ) : (
                                        JSON.parse(localStorage.getItem('monopoly_friends') || '[]').map(friend => (
                                            <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${friend.online ? 'bg-green-500' : 'bg-gray-500'}`} />
                                                    <span className="text-white font-medium">{friend.name}</span>
                                                </div>
                                                <button onClick={() => handleInvite(friend)} className="btn btn-success btn-sm">Invite</button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full animated-bg flex flex-col md:flex-row relative">
            {/* Mobile Sidebar Backdrop */}
            {showMobilePlayers && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setShowMobilePlayers(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                ${sidebarCollapsed ? 'w-[80px]' : 'w-[85vw] max-w-[320px] lg:max-w-[380px]'}
                shrink-0 min-h-screen bg-[#0a0a14] border-r border-white/5 z-40 transition-all duration-300 ease-out
                ${showMobilePlayers ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 fixed md:sticky md:top-0 left-0 top-0 h-screen overflow-y-auto custom-scrollbar shadow-2xl
            `}>
                {/* Collapse Toggle Button - Desktop only */}
                <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-50 w-6 h-14 bg-[#1a1a2e] border border-white/10 rounded-r-xl items-center justify-center text-gray-400 hover:text-white hover:bg-[#252540] transition-colors shadow-lg"
                >
                    {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <div className="p-4 md:p-6">
                    {/* Header - only show when expanded */}
                    {!sidebarCollapsed && (
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-white tracking-tighter flex items-center gap-3"><Users size={24} className="text-blue-500" /> ГЕОПОЛИТИКИ</h2>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <Settings size={18} className="text-gray-500" />
                            </motion.div>
                        </div>
                    )}

                    {/* Collapsed header - avatar icon */}
                    {sidebarCollapsed && (
                        <div className="flex flex-col items-center mb-6 pt-2">
                            <Users size={24} className="text-blue-500" />
                        </div>
                    )}

                    <div className={sidebarCollapsed ? 'space-y-3' : 'space-y-4'}>
                        {gameState.player_order.map((pid, idx) => {
                            const p = gameState.players[pid];
                            const isTurn = gameState.player_order[gameState.current_turn_index] === pid;
                            const isCurrentPlayer = pid === playerId;
                            const char = CHARACTERS[p.character];

                            // Collapsed view - just avatars
                            if (sidebarCollapsed) {
                                return (
                                    <motion.div
                                        key={pid}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => setSidebarCollapsed(false)}
                                        className={`relative cursor-pointer group mx-auto`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 p-0.5 transition-all duration-300 ${isTurn ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'border-white/10 group-hover:border-white/30'}`}>
                                            <img src={char?.avatar} className="w-full h-full object-cover rounded-lg bg-black/40" alt={p.name} />
                                        </div>
                                        {isTurn && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-lg shadow-lg border border-white/20"><Clock size={8} /></div>}
                                        {isCurrentPlayer && <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-[#0a0a14]" />}
                                        {/* Tooltip on hover */}
                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                            <div className="text-white font-bold text-sm">{p.name}</div>
                                            <div className="text-yellow-400 font-mono text-xs">${p.money?.toLocaleString()}</div>
                                        </div>
                                    </motion.div>
                                );
                            }

                            // Expanded view - full cards
                            return (
                                <motion.div key={pid} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} className={`relative p-5 rounded-[24px] border-2 transition-all duration-500 ${isTurn ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/50 shadow-[0_10px_30px_rgba(59,130,246,0.15)]' : 'bg-white/[0.03] border-white/5 opacity-80'}`}>
                                    {isTurn && <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,1)]" />}
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 p-0.5 ${isTurn ? 'border-blue-500' : 'border-white/10'}`}>
                                                <img src={char?.avatar} className="w-full h-full object-cover rounded-xl bg-black/40" alt={p.name} />
                                            </div>
                                            {isTurn && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-lg shadow-lg border border-white/20"><Clock size={10} /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="text-white font-black text-sm truncate uppercase tracking-tight flex items-center gap-2">
                                                    {p.name} {p.is_bot && <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/20">BOT</span>}
                                                </div>
                                                {isTurn && <div className="text-blue-400 font-mono font-black text-xs">{timeLeft}s</div>}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-2xl font-black text-yellow-400 font-mono tracking-tighter">${p.money?.toLocaleString()}</div>
                                                {isCurrentPlayer && !isTurn && <span className="text-[9px] font-black text-blue-400 border border-blue-400/30 px-1.5 py-0.5 rounded-md uppercase tracking-widest">You</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 flex items-center justify-between gap-2 border-t border-white/5">
                                        <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.1em]">Assets</span><div className="flex items-center gap-1.5 text-white font-black text-xs"><Home size={12} className="text-blue-500" />{p.properties?.length || 0}</div></div>
                                        <div className="flex flex-col text-right"><span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.1em]">Position</span><div className="flex items-center gap-1.5 text-white font-black text-xs"><MapPin size={12} className="text-purple-500" />#{p.position || 0}</div></div>
                                    </div>
                                    {isTurn && <motion.div initial={{ width: '100%' }} animate={{ width: (timeLeft / 45) * 100 + '%' }} className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-full opacity-60" />}
                                    {!isCurrentPlayer && !p.is_bot && (
                                        <button onClick={(e) => { e.stopPropagation(); initiateTrade(p); }} className="btn-ghost absolute top-4 right-4 text-white/50 hover:text-yellow-400">
                                            <ArrowLeftRight size={14} />
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
                {/* Close button for mobile sidebar */}
                <button
                    onClick={() => setShowMobilePlayers(false)}
                    className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-h-screen relative min-w-0 bg-[#0c0c14]">
                <header className="h-14 md:h-16 shrink-0 bg-gray-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-3 md:px-6 z-10 sticky top-0">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button onClick={() => navigate('/')} className="btn btn-ghost btn-circle p-2">
                            <ArrowLeft size={18} />
                        </button>
                        <button onClick={() => setShowMobilePlayers(true)} className="md:hidden btn btn-ghost btn-circle p-2">
                            <Users size={18} />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[9px] md:text-[10px] text-gray-500 font-mono tracking-widest uppercase">#{gameId.substring(0, 6)}</span>
                            <span className="text-xs md:text-sm font-bold text-white font-display uppercase tracking-wider">{gameState.map_type}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="px-2 md:px-3 py-1 md:py-1.5 bg-black/40 rounded-full border border-white/10 flex items-center gap-1.5 md:gap-2 shadow-inner">
                            <Clock size={12} className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-gray-400"} />
                            <span className={`font-mono font-bold text-xs md:text-sm ${timeLeft < 10 ? "text-red-500" : "text-white"}`}>{timeLeft}s</span>
                        </div>
                        <div className="hidden sm:flex px-3 md:px-4 py-1 md:py-1.5 bg-black/40 rounded-full border border-white/10 items-center gap-2 shadow-inner">
                            <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider">Turn:</span>
                            <span className="text-yellow-400 font-bold text-xs md:text-sm truncate max-w-[80px]">{currentTurnPlayer?.name}</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 relative bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0c0c14_100%)] overflow-auto">
                    <div
                        className="relative shadow-[0_30px_60px_rgba(0,0,0,0.8)] md:shadow-[0_60px_120px_rgba(0,0,0,0.9)] rounded-2xl md:rounded-[40px] transition-all duration-300"
                        style={{
                            width: 'min(95vw, min(85vh, 1000px))',
                            height: 'min(95vw, min(85vh, 1000px))',
                            minWidth: '320px',
                            minHeight: '320px'
                        }}
                    >
                        <div className="absolute -inset-1 bg-gradient-to-br from-white/10 to-transparent rounded-[42px] z-[-1]" />
                        <Board
                            tiles={gameState.board}
                            players={delayedPlayers}
                            onTileClick={handleTileClick}
                            mapType={gameState.map_type}
                            currentPlayerId={playerId}
                            logs={gameState.logs}
                            onSendMessage={handleSendMessage}
                        />
                        <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center">
                            <AnimatePresence>
                                {showDice && (
                                    <div className="pointer-events-auto">
                                        <DiceAnimation show={showDice} rolling={diceRolling} values={diceValues} />
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="absolute bottom-4 md:bottom-8 lg:bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[90%] sm:max-w-sm pointer-events-auto z-40 px-2 md:px-4">
                            <ActionPanel
                                isMyTurn={isMyTurn}
                                isRolling={isRolling}
                                onRoll={handleRoll}
                                canBuy={canBuy}
                                onBuy={handleBuyProperty}
                                character={currentPlayer?.character}
                                onAbility={() => handleAbility(gameState.game_mode === 'oreshnik_all' ? 'ORESHNIK' : currentPlayer?.character)}
                                currentTilePrice={currentTile?.price}
                                gameMode={gameState.game_mode}
                            />
                        </div>
                        <AnimatePresence>
                            {targetingAbility && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[60] bg-red-500/10 pointer-events-none flex flex-col items-center justify-start pt-20">
                                    <div className="bg-black/80 backdrop-blur-md px-8 py-4 rounded-2xl border border-red-500 shadow-2xl pointer-events-auto text-center">
                                        <div className="text-red-400 font-black text-xl mb-1 uppercase tracking-tighter animate-pulse">SELECT TARGET FOR {targetingAbility}</div>
                                        <div className="text-gray-400 text-sm mb-4">Click a tile on the board</div>
                                        <button onClick={() => setTargetingAbility(null)} className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-all">CANCEL</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Overlays */}
            <div className="pointer-events-none fixed inset-0 z-[100]">
                <OreshnikAnimation isVisible={showOreshnik} onComplete={() => setShowOreshnik(false)} />
                <AbilityAnimations.BuyoutAnimation isVisible={showBuyout} onComplete={() => setShowBuyout(false)} />
                <AbilityAnimations.AidAnimation isVisible={showAid} onComplete={() => setShowAid(false)} />
                <AbilityAnimations.NukeThreatAnimation isVisible={showNuke} onComplete={() => setShowNuke(false)} />
            </div>

            <AnimatePresence>
                {selectedTile && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setSelectedTile(null)} />
                        <div className="relative z-10 pointer-events-auto">
                            <PropertyModal property={selectedTile} players={gameState.players} canBuy={canBuy && currentPlayer?.position === selectedTile.position} onBuy={handleBuyProperty} onClose={() => setSelectedTile(null)} />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <TradeModal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} fromPlayer={currentPlayer} toPlayer={tradeTarget} gameState={gameState} onSendOffer={handleSendOffer} />
            <TradeNotification trade={incomingTrade} fromPlayer={gameState?.players?.[incomingTrade?.from_player_id]} onRespond={handleRespondTrade} />

        </div>
    );
};

export default GameRoom;
