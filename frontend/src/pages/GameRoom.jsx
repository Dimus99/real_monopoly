import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, Users, Bot, Play, Check, Home, Clock, ArrowLeftRight,
    ArrowLeft, MessageSquare, Settings, Bell,
    Menu, UserPlus, X, MapPin, ChevronLeft, ChevronRight, Crosshair
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
import ChanceModal from '../components/ChanceModal';
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
    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [friends, setFriends] = useState([]);

    // Dice Animation States
    const [showDice, setShowDice] = useState(false);
    const [diceRolling, setDiceRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);

    // Log management - Update immediately to keep chat fresh
    const [displayedLogs, setDisplayedLogs] = useState([]);
    useEffect(() => {
        if (gameState?.logs) {
            setDisplayedLogs(gameState.logs);
        }
    }, [gameState?.logs]);

    // Animation States
    const [showBuyout, setShowBuyout] = useState(false);
    const [showAid, setShowAid] = useState(false);
    const [showNuke, setShowNuke] = useState(false);
    const [showVictory, setShowVictory] = useState(false);
    const boardRef = useRef(null);

    // Trade States
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [tradeTarget, setTradeTarget] = useState(null);
    const [incomingTrade, setIncomingTrade] = useState(null);

    // Sync State
    const [delayedPlayers, setDelayedPlayers] = useState({});

    // Targeting State
    const [targetingAbility, setTargetingAbility] = useState(null);

    const currentPlayer = gameState?.players?.[playerId];
    const isMyTurn = gameState?.player_order?.[gameState?.current_turn_index] === playerId;
    const currentTurnPlayer = gameState?.players?.[gameState?.player_order?.[gameState?.current_turn_index]];

    // Character data mapping check - Moved here to avoid initialization error
    const char = CHARACTERS[currentPlayer?.character] || CHARACTERS.Putin;

    const currentTile = gameState?.board?.[currentPlayer?.position];
    // Can buy only if on the tile (UI Logic)
    const canBuy = isMyTurn &&
        currentTile &&
        !currentTile.owner_id &&
        currentTile.price > 0 &&
        !['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax'].includes(currentTile.group) &&
        !currentTile.is_destroyed;

    useEffect(() => {
        if (isMyTurn && currentTile) {
            console.log("canBuy Check:", {
                isMyTurn,
                currentTileName: currentTile.name,
                owner: currentTile.owner_id,
                price: currentTile.price,
                group: currentTile.group,
                destroyed: currentTile.is_destroyed,
                result: canBuy
            });
        }
    }, [isMyTurn, currentTile, canBuy]);

    const handleBuyProperty = () => {
        if (!isMyTurn || !currentPlayer) {
            console.warn("Cannot buy: not my turn or no player", { isMyTurn, currentPlayer });
            return;
        }
        console.log("Buying property at", currentPlayer.position);
        sendAction('BUY', { property_id: currentPlayer.position });
    };

    const handleBuildHouse = (propertyId) => {
        if (!isMyTurn) return;
        sendAction('BUILD', { property_id: propertyId });
    };

    const checkMonopolyByPlayer = (tile) => {
        if (!tile || !tile.group || !gameState?.board) return false;
        if (['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax'].includes(tile.group)) return false;
        const groupTiles = gameState.board.filter(t => t.group === tile.group);
        if (groupTiles.length === 0) return false;
        return groupTiles.every(t => t.owner_id === playerId);
    };

    const copyToClipboard = (text) => {
        const link = `${window.location.origin}/?game=${text}`;
        navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleEndTurn = () => {
        if (!isMyTurn) return;
        sendAction('END_TURN');
        // Do NOT setHasRolled(false) here. Wait for backend confirmation.
    };

    const handleAbility = (abilityType) => {
        if (!isMyTurn || !currentPlayer) return;
        if (['ORESHNIK', 'BUYOUT', 'ISOLATION', 'SANCTIONS'].includes(abilityType)) {
            setTargetingAbility(abilityType);
        } else {
            sendAction('USE_ABILITY', { ability_type: abilityType });
        }
    };

    // Timer
    const [timeLeft, setTimeLeft] = useState(90);
    useEffect(() => {
        if (!gameState?.turn_expiry) return;
        const updateTimer = () => {
            let expiryStr = gameState.turn_expiry;
            if (expiryStr && !expiryStr.endsWith('Z')) expiryStr += 'Z';
            const expiry = new Date(expiryStr).getTime();
            const now = new Date().getTime();
            const diff = Math.ceil((expiry - now) / 1000);
            setTimeLeft(Math.max(0, diff));
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [gameState?.turn_expiry, gameState?.current_turn_index]); // Also update on turn index change

    const handleRoll = () => {
        if (!isMyTurn || isRolling) return;
        setIsRolling(true);
        sendAction('ROLL');
    };

    const handleSendMessage = (text) => {
        if (text.trim()) sendAction('CHAT', { message: text });
    };

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



    // --- Waiting Room Actions ---
    const handleStartGame = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/games/${gameId}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to start');
        } catch (e) {
            alert('Could not start game. Need at least 2 players.');
        }
    };

    const handleAddBot = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            await fetch(`${API_BASE}/api/games/${gameId}/bots`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) { alert('Failed to add bot'); }
    };

    const handleRemoveBot = async (botId) => {
        try {
            const token = localStorage.getItem('monopoly_token');
            await fetch(`${API_BASE}/api/games/${gameId}/bots/${botId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) { alert('Failed to remove bot'); }
    };

    const fetchFriends = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/friends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setFriends(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleSendInvite = async (friendId) => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/games/${gameId}/invite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ to_user_id: friendId })
            });
            if (res.ok) {
                alert('Invite sent!');
            } else {
                const err = await res.json();
                alert(err.detail || 'Failed to send invite');
            }
        } catch (e) { alert('Error sending invite'); }
    };

    const openInviteModal = () => {
        fetchFriends();
        setShowInviteModal(true);
    };

    // Modals state
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showRentModal, setShowRentModal] = useState(false);
    const [rentDetails, setRentDetails] = useState(null);
    const [showChanceModal, setShowChanceModal] = useState(false);
    const [chanceData, setChanceData] = useState(null);

    // Effects
    useEffect(() => {
        if (!lastAction) return;
        switch (lastAction.type) {
            case 'ORESHNIK': setShowOreshnik(true); break;
            case 'BUYOUT': setShowBuyout(true); break;
            case 'AID': setShowAid(true); break;
            case 'NUKE': setShowNuke(true); break;
            case 'DICE_ROLLED':
                setDiceValues(lastAction.dice || [1, 1]);
                setShowDice(true);
                setDiceRolling(true);

                // Rolling for 1.5 seconds
                setTimeout(() => {
                    setDiceRolling(false);
                    setHasRolled(true);
                    setIsRolling(false);

                    // Sync players to move tokens
                    if (gameState?.players) {
                        setDelayedPlayers(gameState.players);
                    }

                    // Show result for 3 seconds then process
                    setTimeout(() => {
                        setShowDice(false);

                        if (lastAction.player_id === playerId) {
                            // Check for Chance card
                            if (lastAction.chance_card) {
                                setChanceData(lastAction);
                            }

                            // Trigger modals based on action
                            if (lastAction.action === 'can_buy') {
                                // Do not auto-open modal. User can use ActionPanel button.
                            } else if (lastAction.action === 'pay_rent') {
                                setRentDetails({
                                    amount: lastAction.amount,
                                    ownerId: lastAction.owner_id
                                });
                                setShowRentModal(true);
                            } else if (lastAction.action === 'chance') {
                                setChanceData(lastAction);
                            } else {
                                // Passive / Auto-end conditions
                                if (!lastAction.doubles) {
                                    setTimeout(() => {
                                        if (isMyTurn) sendAction('END_TURN');
                                    }, 1500);
                                }
                            }
                        }
                    }, 3000);

                }, 1500);
                break;

            case 'PROPERTY_BOUGHT':
                if (lastAction.player_id === playerId) {
                    setShowBuyModal(false);
                    // Auto-end turn if not doubles
                    // We check current dice values for doubles
                    const isDoubles = diceValues[0] === diceValues[1];
                    if (!isDoubles) {
                        setTimeout(() => sendAction('END_TURN'), 1000);
                    }
                }
                break;

            case 'RENT_PAID':
                if (lastAction.player_id === playerId) {
                    setShowRentModal(false); // Close rent modal if open
                    // Auto-end if not doubles
                    const isDoubles = diceValues[0] === diceValues[1];
                    if (!isDoubles) {
                        setTimeout(() => sendAction('END_TURN'), 1000);
                    }
                }
                break;

            case 'TURN_ENDED':
            case 'TURN_SKIPPED':
                setHasRolled(false);
                break;
            case 'ERROR':
                setIsRolling(false);
                setHasRolled(false);
                // The toast component already handles displaying messages if we pass them
                break;
            case 'GAME_OVER': setShowVictory(true); break;
            case 'TRADE_OFFERED':
                if (lastAction.trade?.to_player_id === playerId) setIncomingTrade(lastAction.trade);
                break;
            case 'TRADE_UPDATED': setIncomingTrade(null); break;
        }
    }, [lastAction, playerId, isMyTurn, diceValues]);

    useEffect(() => {
        if (gameState?.players) {
            // Check if this is a dice roll that involves movement
            const isDiceRoll = lastAction?.type === 'DICE_ROLLED';

            // Helper to check position changes
            const hasPositionChanged = (oldP, newP) => {
                if (!oldP || !newP) return true;
                for (const pid in newP) {
                    if (oldP[pid]?.position !== newP[pid]?.position) return true;
                }
                return false;
            };

            const positionChanged = hasPositionChanged(delayedPlayers, gameState.players);

            // BLOCK update if we are about to animate dice (Pre-Animation Phase)
            // If it's a roll, positions changed, and dice aren't showing yet -> WAIT.
            // We rely on the dice animation completion to manually update delayedPlayers.
            if (isDiceRoll && positionChanged && !showDice) {
                return;
            }

            if (!showDice) {
                setDelayedPlayers(gameState.players);
            } else {
                const timer = setTimeout(() => {
                    setDelayedPlayers(gameState.players);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [gameState?.players, showDice, lastAction]);

    // Auto-open Buy Modal -- DISABLED per user request
    /*
    useEffect(() => {
        if (canBuy && hasRolled && !showBuyModal && !selectedTile) {
            setShowBuyModal(true);
        }
    }, [canBuy, hasRolled]);
    */

    // Sync state from server to handle page reloads / reconnections
    useEffect(() => {
        if (gameState && !isRolling && !diceRolling) {
            setDiceValues(gameState.dice || [1, 1]);
            if (gameState.turn_state) {
                setHasRolled(!!gameState.turn_state.has_rolled);
            }
        }
    }, [gameState, isRolling, diceRolling]);

    // Handle tile click
    const handleTileClick = (tileId) => {
        if (targetingAbility) {
            sendAction('USE_ABILITY', { ability_type: targetingAbility, target_id: tileId });
            setTargetingAbility(null);
            return;
        }
        const tile = gameState?.board?.find(t => t.id === tileId);
        if (tile) setSelectedTile(tile);
    };

    if (!gameState) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center">
                <div className="text-2xl font-display text-white animate-pulse">Loading Game...</div>
            </div>
        );
    }

    // --- WAITING ROOM ---
    if (gameState.game_status === 'waiting') {
        const myPlayer = gameState.players[playerId];
        const isHost = gameState.host_id === myPlayer?.user_id;

        return (
            <div className="min-h-screen animated-bg flex items-center justify-center p-4">
                <div className="glass-card max-w-4xl w-full p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-50"><Settings className="animate-spin-slow" size={100} /></div>

                    <div className="relative z-10">
                        <h1 className="text-4xl font-display font-bold text-white mb-2">Lobby Waiting</h1>
                        <div className="flex items-center gap-4 text-gray-400 mb-8">
                            <div className="bg-white/10 px-3 py-1 rounded font-mono">ID: {gameId}</div>
                            <div className="flex items-center justify-center gap-2"><Users size={16} /> {Object.keys(gameState.players).length}/{gameState.max_players} Players</div>
                            {!isHost && <div className="text-yellow-500 animate-pulse">Waiting for host to start...</div>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            {Object.values(gameState.players).map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <img src={CHARACTERS[p.character]?.avatar} className="w-12 h-12 rounded-lg bg-black/30 object-cover" />
                                            {p.is_bot && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] px-1 rounded">BOT</div>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{p.name}</div>
                                            <div className="text-xs text-gray-400">{p.character}</div>
                                        </div>
                                    </div>
                                    {isHost && p.is_bot && (
                                        <button onClick={() => handleRemoveBot(p.id)} className="p-2 text-red-500 hover:bg-white/10 rounded-full transition-colors" title="Remove Bot">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
                            {isHost && (
                                <>
                                    <button
                                        onClick={handleStartGame}
                                        className="btn-primary py-3 px-8 text-lg flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                                        disabled={Object.keys(gameState.players).length < 2}
                                    >
                                        <Play size={24} /> Start Game
                                    </button>
                                    <button
                                        onClick={handleAddBot}
                                        className="btn-ghost py-3 px-6 flex items-center gap-2 border border-white/20 hover:bg-white/10"
                                        disabled={Object.keys(gameState.players).length >= gameState.max_players}
                                    >
                                        <Bot size={20} /> Add Bot
                                    </button>
                                </>
                            )}

                            <button
                                onClick={openInviteModal}
                                className="btn-purple py-3 px-6 flex items-center gap-2 shadow-lg"
                            >
                                <UserPlus size={20} /> Invite Friend
                            </button>

                            <button
                                onClick={() => copyToClipboard(gameId)}
                                className="btn-ghost py-3 px-6 flex items-center gap-2 border border-white/20 hover:bg-white/10 ml-auto"
                            >
                                <Copy size={20} /> Copy ID
                            </button>
                        </div>
                    </div>

                    {/* Invite Modal (Inside Waiting Room) */}
                    <AnimatePresence>
                        {showInviteModal && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
                                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} className="glass-card p-6 max-w-md w-full">
                                    <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-white">Invite Friends</h3><button onClick={() => setShowInviteModal(false)} className="btn-ghost"><X size={20} /></button></div>
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {friends.length === 0 ? (
                                            <div className="text-gray-500 text-center py-4">No friends found. Add them in Lobby!</div>
                                        ) : (
                                            friends.map(friend => (
                                                <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white">
                                                            {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full rounded-full" /> : friend.name.charAt(0)}
                                                        </div>
                                                        <div className="font-semibold text-white">{friend.name}</div>
                                                    </div>
                                                    <button onClick={() => handleSendInvite(friend.id)} className="btn-sm btn-success flex items-center gap-1"><UserPlus size={14} /> Send</button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-[#0c0c14] h-screen w-full overflow-hidden font-sans selection:bg-purple-500/30">
            {/* COLLAPSIBLE SIDEBAR */}
            <motion.div
                animate={{ width: sidebarCollapsed ? 80 : 300 }}
                className="flex-shrink-0 bg-[#0c0c14] border-r border-white/10 flex flex-col z-30 shadow-2xl relative transition-all duration-300"
            >
                {/* Top Info Bar */}
                <div className="p-4 border-b border-white/10 bg-[#13131f] flex items-center justify-between">
                    {!sidebarCollapsed && (
                        <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
                            <ArrowLeft size={16} />
                        </button>
                    )}

                    <button onClick={() => copyToClipboard(gameId)} className={`flex flex-col ${sidebarCollapsed ? 'items-center w-full' : 'items-end'}`}>
                        {sidebarCollapsed ? <Copy size={16} className="text-blue-400 mb-1" /> : (
                            <>
                                <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">Game ID</span>
                                <span className="text-sm font-mono font-bold text-blue-400">#{gameId.substring(0, 6)}</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="absolute -right-3 top-20 bg-yellow-500 rounded-full p-1 text-black shadow-lg hover:scale-110 transition-transform z-50"
                    >
                        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                {/* Status Compact */}
                <div className="p-2 border-b border-white/10 bg-[#0c0c14]">
                    <div className={`flex ${sidebarCollapsed ? 'flex-col gap-2' : 'gap-2'}`}>
                        <div className={`bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col items-center ${sidebarCollapsed ? 'w-full' : 'flex-1'}`}>
                            <Clock size={12} className={(gameState?.turn_timer !== 0 && timeLeft <= 10) ? 'text-orange-500 animate-pulse' : 'text-gray-400'} />
                            <span className={`text-sm font-mono font-bold ${(gameState?.turn_timer !== 0 && timeLeft <= 10) ? 'text-orange-500 animate-pulse' : 'text-white'}`}>
                                {gameState?.turn_timer === 0 ? '∞' : timeLeft}
                            </span>
                        </div>
                        <div className={`bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col items-center ${sidebarCollapsed ? 'w-full' : 'flex-1'}`}>
                            <div className="w-3 h-3 rounded-full bg-yellow-500" title="Current Turn" />
                            {!sidebarCollapsed && <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">{currentTurnPlayer?.name}</span>}
                        </div>
                    </div>
                </div>

                {/* Players List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {Object.entries(delayedPlayers || {}).map(([pid, p]) => {
                        const isTurn = gameState?.player_order?.[gameState?.current_turn_index] === pid;
                        const char = CHARACTERS[p.character] || {};

                        return (
                            <motion.div
                                key={pid}
                                layout
                                className={`relative rounded-xl border transition-all duration-300 ${isTurn
                                    ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 border-l-4 border-l-blue-500 border-white/10'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    } ${sidebarCollapsed ? 'p-2 flex justify-center' : 'p-3'}`}
                            >
                                {sidebarCollapsed ? (
                                    <div className="relative group">
                                        <img src={char.avatar} className="w-10 h-10 rounded-lg bg-black/40 object-cover" />
                                        {isTurn && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-black" />}
                                        {/* Tooltip */}
                                        <div className="absolute left-14 top-0 bg-black/90 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                                            {p.name} (${p.money})
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                                            <img src={char.avatar} className="w-full h-full object-cover bg-black/40" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-xs font-bold truncate ${isTurn ? 'text-white' : 'text-gray-300'}`}>{p.name}</span>
                                            </div>
                                            <div className="text-lg font-mono font-black text-yellow-400 leading-none">
                                                ${p.money?.toLocaleString()}
                                            </div>
                                        </div>
                                        {!isMyTurn && !p.is_bot && (
                                            <button onClick={(e) => { e.stopPropagation(); initiateTrade(p); }} className="p-1 hover:bg-white/10 rounded">
                                                <ArrowLeftRight size={14} className="text-gray-400" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* MAIN BOARD AREA */}
            <div className="flex-1 relative bg-[#0c0c14] flex items-center justify-center p-8 overflow-auto">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0c0c14_80%)] z-0" />

                <div className="relative z-10 shadow-2xl transition-all duration-300"
                    ref={boardRef}
                    style={{
                        height: '92vh',
                        minHeight: '800px', // Ensures content is visible
                        aspectRatio: '1/1',
                        margin: 'auto'
                    }}
                >
                    <Board
                        tiles={gameState.board}
                        players={delayedPlayers}
                        onTileClick={handleTileClick}
                        mapType={gameState.map_type}
                        currentPlayerId={playerId}
                        logs={displayedLogs}
                        onSendMessage={handleSendMessage}
                        externalRef={boardRef}
                        onAvatarClick={(pid) => pid !== playerId && initiateTrade(pid)}
                    />
                </div>

                <div className="absolute inset-0 pointer-events-none z-[100] flex items-center justify-center">
                    <AnimatePresence>
                        {showDice && (
                            <div className="pointer-events-auto transform scale-150">
                                <DiceAnimation show={showDice} rolling={diceRolling} values={diceValues} glow={diceValues[0] === diceValues[1]} />
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Action Panel - CENTERED */}
                <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md pointer-events-auto z-[140] px-4 flex justify-center items-center scale-90">
                    <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-2 shadow-2xl border border-white/10">
                        <ActionPanel
                            isMyTurn={isMyTurn}
                            isRolling={isRolling}
                            hasRolled={hasRolled}
                            onRoll={handleRoll}
                            canBuy={canBuy}
                            onBuy={handleBuyProperty}
                            onEndTurn={handleEndTurn}
                            character={currentPlayer?.character}
                            onAbility={handleAbility}
                            currentTilePrice={currentTile?.price}
                            currentTileName={currentTile?.name}
                            gameMode={gameState.game_mode}
                            isChatOpen={false}
                            isDoubles={diceValues[0] === diceValues[1]}
                        />
                    </div>
                </div>
            </div>

            {/* Target Overlay */}
            <AnimatePresence>
                {targetingAbility && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[150] pointer-events-none flex flex-col items-center justify-start pt-20"
                    >
                        <div className="bg-red-600/90 text-white px-8 py-4 rounded-2xl border-4 border-white shadow-[0_0_50px_rgba(255,0,0,0.5)] pointer-events-auto text-center flex flex-col items-center gap-2">
                            <div className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                                <Crosshair size={32} className="animate-spin-slow" /> ВЫБЕРИТЕ ЦЕЛЬ НА КАРТЕ
                            </div>
                            <p className="text-sm font-bold opacity-80 uppercase">Кликните по любому городу противника</p>
                            <button
                                onClick={() => setTargetingAbility(null)}
                                className="mt-2 px-4 py-1 bg-white text-red-600 rounded-lg text-xs font-black hover:bg-gray-100 transition-colors uppercase"
                            >
                                Отмена
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pointer-events-none fixed inset-0 z-[100]">
                <OreshnikAnimation
                    isVisible={showOreshnik}
                    onComplete={() => setShowOreshnik(false)}
                    targetTileId={lastAction?.target_id}
                    boardRef={boardRef}
                />
                <AbilityAnimations.BuyoutAnimation isVisible={showBuyout} onComplete={() => setShowBuyout(false)} />
                <AbilityAnimations.AidAnimation isVisible={showAid} onComplete={() => setShowAid(false)} />
                <AbilityAnimations.NukeThreatAnimation isVisible={showNuke} onComplete={() => setShowNuke(false)} />
            </div>

            {/* Buy Modal */}
            <AnimatePresence>
                {(selectedTile || showBuyModal) && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => { setSelectedTile(null); setShowBuyModal(false); }} />
                        <div className="relative z-10 pointer-events-auto">
                            <PropertyModal
                                property={selectedTile || currentTile}
                                players={gameState.players}
                                canBuy={showBuyModal || (canBuy && currentPlayer?.position === (selectedTile || currentTile)?.id)}
                                onBuy={() => {
                                    handleBuyProperty();
                                    setShowBuyModal(false);
                                }}
                                onClose={() => { setSelectedTile(null); setShowBuyModal(false); }}
                                onBuild={handleBuildHouse}
                                canBuild={isMyTurn && (selectedTile || currentTile)?.owner_id === playerId && checkMonopolyByPlayer(selectedTile || currentTile)}
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Rent Modal */}
            <AnimatePresence>
                {showRentModal && rentDetails && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl border border-red-500/30 shadow-2xl max-w-md w-full text-center space-y-6">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <div className="text-4xl">💸</div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Оплата аренды</h3>
                                <p className="text-gray-400">Вы попали на территорию <span className="text-white font-bold">{gameState?.players?.[rentDetails.ownerId]?.name}</span>.</p>
                            </div>
                            <div className="py-4 border-y border-white/10">
                                <span className="text-4xl font-mono font-bold text-red-400">-${rentDetails.amount}</span>
                            </div>
                            <button
                                onClick={() => {
                                    sendAction('PAY_RENT', { property_id: currentPlayer.position });
                                    setShowRentModal(false);
                                }}
                                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg transition-all"
                            >
                                Оплатить и продолжить
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chance Modal */}
            <AnimatePresence>
                {(showChanceModal || !!chanceData) && (
                    <ChanceModal
                        show={!!chanceData}
                        data={chanceData}
                        onClose={() => {
                            setChanceData(null);
                            // Auto-end turn on close if not doubles
                            const isDoubles = diceValues[0] === diceValues[1];
                            if (isMyTurn && !isDoubles) {
                                sendAction('END_TURN');
                            }
                        }}
                    />
                )}
            </AnimatePresence>
            {/* Also show trade modal (only needed if trading in waiting room enabled? Probably not, but safe to keep) */}
            <TradeModal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} fromPlayer={currentPlayer} toPlayer={tradeTarget} gameState={gameState} onSendOffer={handleSendOffer} />
            <TradeNotification trade={incomingTrade} fromPlayer={gameState?.players?.[incomingTrade?.from_player_id]} onRespond={handleRespondTrade} />
        </div>
    );
};

export default GameRoom;
