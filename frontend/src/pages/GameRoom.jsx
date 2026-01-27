import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, Users, Bot, Play, Check, Home, Clock, ArrowLeftRight,
    ArrowLeft, MessageSquare, Settings, Bell,
    Menu, UserPlus, X, MapPin, ChevronLeft, ChevronRight, Crosshair, Flag
} from 'lucide-react';
import { CHARACTERS } from '../constants/characters';
import useGameSocket from '../hooks/useGameSocket';
import Board from '../components/Board';
import PropertyModal from '../components/PropertyModal';
import DiceAnimation from '../components/DiceAnimation';
import ToastNotification from '../components/ToastNotification';
import ActionPanel from '../components/ActionPanel';
import TradeModal from '../components/TradeModal';
import TradeNotification from '../components/TradeNotification';
import ChanceModal from '../components/ChanceModal';
import { BuyoutAnimation, AidAnimation, NukeThreatAnimation } from '../components/AbilityAnimations';

// Lazy load to avoid circular dependency/initialization issues
const OreshnikAnimation = lazy(() => import('../components/OreshnikAnimation'));

const getApiBase = () => import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

const GameRoom = () => {
    const API_BASE = React.useMemo(() => getApiBase(), []);
    const { gameId, playerId } = useParams();
    const navigate = useNavigate();
    const { gameState, sendAction, lastAction } = useGameSocket(gameId, playerId);

    // Derived State Variables (Moved up to avoid TDZ errors in useEffect)
    const currentPlayer = gameState?.players?.[playerId];
    const isMyTurn = gameState?.player_order?.[gameState?.current_turn_index] === playerId;
    const currentTurnPlayer = gameState?.players?.[gameState?.player_order?.[gameState?.current_turn_index]];
    const playerChar = CHARACTERS[currentPlayer?.character] || CHARACTERS.Putin;
    const currentTile = gameState?.board?.[currentPlayer?.position];

    // Can buy only if on the tile (UI Logic)
    const canBuy = isMyTurn &&
        currentTile &&
        !currentTile.owner_id &&
        currentTile.price > 0 &&
        !['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax'].includes(currentTile.group) &&
        !currentTile.is_destroyed;

    // UI States
    const [showOreshnik, setShowOreshnik] = useState(false);
    const [selectedTile, setSelectedTile] = useState(null);
    const [isRolling, setIsRolling] = useState(false); // For button disable
    const [diceValues, setDiceValues] = useState([1, 2]); // Default to non-doubles to avoid initial "Double" state
    const [copied, setCopied] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [friends, setFriends] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setSidebarCollapsed(true);
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Dice Animation States
    const [showDice, setShowDice] = useState(false);
    const [diceRolling, setDiceRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);
    const [chanceCard, setChanceCard] = useState(null);

    // Sync 'hasRolled' and 'dice' state from server to handle page reloads / reconnections
    useEffect(() => {
        // Source of truth for whether the current player has rolled
        if (isMyTurn && gameState?.turn_state) {
            // Only sync if we're not currently in the middle of a roll animation
            if (!isRolling) {
                const serverHasRolled = !!gameState.turn_state.has_rolled;
                setHasRolled(serverHasRolled);
            }

            // Sync dice values
            if (gameState.dice && gameState.dice.length === 2) {
                setDiceValues(gameState.dice);
            }
        }
    }, [gameState?.turn_state?.has_rolled, gameState?.dice, isMyTurn, isRolling]);

    // Reset states on new turn
    useEffect(() => {
        setHasRolled(false);
        setIsRolling(false);
        setShowDice(false);
        setDiceRolling(false);
    }, [gameState?.current_turn_index, gameState?.game_status]);

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

    const handleCloseOreshnik = React.useCallback(() => setShowOreshnik(false), []);
    const handleCloseBuyout = React.useCallback(() => setShowBuyout(false), []);
    const handleCloseAid = React.useCallback(() => setShowAid(false), []);
    const handleCloseNuke = React.useCallback(() => setShowNuke(false), []);

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

    const handleSellHouse = (propertyId) => {
        if (!isMyTurn) return;
        sendAction('SELL_HOUSE', { property_id: propertyId });
    };

    const handleMortgage = (propertyId) => {
        sendAction('MORTGAGE', { property_id: propertyId });
    };

    const handleUnmortgage = (propertyId) => {
        sendAction('UNMORTGAGE', { property_id: propertyId });
    };

    // Rent State
    const [showRentModal, setShowRentModal] = useState(false);
    const [rentDetails, setRentDetails] = useState(null);

    const handlePayRent = React.useCallback(() => {
        if (!isMyTurn || !rentDetails) return;
        if (rentDetails.ownerId === 'BANK') {
            sendAction('PAY_TAX');
        } else {
            sendAction('PAY_RENT', { property_id: currentPlayer?.position });
        }
        setRentDetails(null);
    }, [isMyTurn, rentDetails, currentPlayer?.position, sendAction]);

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
    const [showChanceModal, setShowChanceModal] = useState(false);
    const [chanceData, setChanceData] = useState(null);

    // Track processed actions to prevent loops/re-triggers
    const lastProcessedActionRef = useRef(null);

    // Effects
    useEffect(() => {
        if (!lastAction) return;

        // Prevent processing the same action object multiple times
        if (lastProcessedActionRef.current === lastAction) return;
        lastProcessedActionRef.current = lastAction;
        switch (lastAction.type) {
            case 'GAME_STARTED':
                // Reset everything on start
                setHasRolled(false);
                setIsRolling(false);
                setShowDice(false);
                break;
            case 'ORESHNIK': setShowOreshnik(true); break;
            case 'BUYOUT': setShowBuyout(true); break;
            case 'AID': setShowAid(true); break;
            case 'NUKE': setShowNuke(true); break;
            case 'DICE_ROLLED':
                setDiceValues(lastAction.dice || [1, 1]);
                setShowDice(true);
                setDiceRolling(true);
                setIsRolling(true);

                // Immediately set hasRolled based on doubles to prevent UI hang
                if (lastAction.doubles) {
                    setHasRolled(false);
                } else {
                    setHasRolled(true);
                }

                // Phase 1: Rolling animation (800ms)
                const rollTimeout = setTimeout(() => {
                    setDiceRolling(false); // Show final result

                    // Phase 2: Show result briefly (1s instead of 2s for better speed)
                    const resultTimeout = setTimeout(() => {
                        setShowDice(false);

                        // Phase 3: Final state update
                        const finalTimeout = setTimeout(() => {
                            if (gameState?.players) {
                                setDelayedPlayers(gameState.players);
                            }
                            setIsRolling(false);

                            if ((lastAction.action === 'pay_rent' || lastAction.action === 'tax') && lastAction.player_id === playerId) {
                                setRentDetails({
                                    amount: lastAction.amount || lastAction.tax_paid,
                                    ownerId: lastAction.owner_id || 'BANK'
                                });
                            }

                            if (lastAction.chance_card && lastAction.player_id === playerId) {
                                setChanceCard(lastAction.chance_card);
                            }
                        }, 100);

                    }, 1000); // Faster result display
                }, 800);
                break;

            case 'PROPERTY_BOUGHT':
                if (lastAction.player_id === playerId) {
                    setShowBuyModal(false);
                }
                break;

            case 'CHAT_MESSAGE':
                // Removed setChanceCard from here to avoid blocking popups for other players' turns
                break;

            case 'RENT_PAID':
            case 'TAX_PAID':
                if (lastAction.player_id === playerId) {
                    setShowRentModal(false); // Close rent modal if open
                }
                break;

            case 'TURN_ENDED':
            case 'TURN_SKIPPED':
                setHasRolled(false);
                setShowDice(false);
                setDiceRolling(false);
                setIsRolling(false);
                break;
            case 'ERROR':
                setIsRolling(false);
                setDiceRolling(false);
                setShowDice(false);
                if (lastAction.message) {
                    alert(`Внимание: ${lastAction.message}`);
                }
                break;
            case 'GAME_OVER': setShowVictory(true); break;
            case 'TRADE_OFFERED':
                if (lastAction.trade?.to_player_id === playerId) setIncomingTrade(lastAction.trade);
                break;
            case 'TRADE_UPDATED': setIncomingTrade(null); break;
        }
    }, [lastAction]); // STRICT DEPENDENCY: Only lastAction. NO diceValues.

    // Optimized Player Sync Effect
    useEffect(() => {
        if (gameState?.players) {
            const isDiceRoll = lastAction?.type === 'DICE_ROLLED';

            // If we are in a dice sequence (dice showing or about to show), 
            // DO NOT auto-update players. The DICE_ROLLED handler will do it manually 
            // at the perfect moment (after animation).
            if (showDice) return;

            // Also prevent update if we just received a roll action but showDice isn't true yet 
            // (react render cycle gap).
            if (isDiceRoll && !showDice) {
                // If positions changed, we assume a roll animation is imminent, so we wait.
                // If no animation triggers (e.g. reconnect), the timeout below or next update saves us?
                // Actually, if it IS a dice roll, we trust the DICE_ROLLED effect to handle it.
                // But if we just loaded the page and state has a past roll?
                // For live updates: lastAction is fresh.
                return;
            }

            // Normal updates (non-dice selection, joins, etc) or instant sync
            setDelayedPlayers(gameState.players);
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

    // Sync state from server to handle page reloads / reconnections / state updates
    useEffect(() => {
        if (!gameState) return;

        // Sync basic flags that don't interfere with animations
        if (gameState.turn_state) {
            // Strictly sync rent pending state from server's truth
            if (gameState.turn_state.awaiting_payment && isMyTurn) {
                setRentDetails({
                    amount: gameState.turn_state.awaiting_payment_amount,
                    ownerId: gameState.turn_state.awaiting_payment_owner
                });
            } else if (!isRolling && !diceRolling) {
                // Only clear if we are NOT in the middle of a roll animation
                // which might be about to set its own rentDetails from the action data
                setRentDetails(null);
            }

            // Sync other turn flags
            if (!isRolling && !diceRolling) {
                setHasRolled(!!gameState.turn_state.has_rolled);
            }
        }

        // Basic sync for dice values if not currently rolling
        if (!isRolling && !diceRolling && gameState.dice) {
            setDiceValues(gameState.dice);
        }
    }, [gameState, isRolling, diceRolling, isMyTurn]);

    // Handle tile click
    const handleTileClick = (tileId) => {
        if (tileId === null) {
            setSelectedTile(null);
            return;
        }

        if (targetingAbility) {
            // For property-targeting abilities (ORESHNIK, BUYOUT, ISOLATION)
            if (['ORESHNIK', 'BUYOUT', 'ISOLATION'].includes(targetingAbility)) {
                sendAction('USE_ABILITY', { ability_type: targetingAbility, target_id: tileId });
                setTargetingAbility(null);
            }
            return;
        }
        const tile = gameState?.board?.find(t => t.id === tileId);
        if (tile) setSelectedTile(tile);
    };

    const handleAvatarClick = (targetPid) => {
        if (targetPid === playerId) return;

        if (targetingAbility === 'SANCTIONS') {
            sendAction('USE_ABILITY', { ability_type: targetingAbility, target_id: targetPid });
            setTargetingAbility(null);
            return;
        }

        // Default: Trade
        initiateTrade(gameState.players[targetPid]);
    };

    if (!gameState) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center">
                <div className="text-2xl font-display text-white animate-pulse">Загрузка игры...</div>
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
                        <h1 className="text-4xl font-display font-bold text-white mb-2">Ожидание в лобби</h1>
                        <div className="flex items-center gap-4 text-gray-400 mb-8">
                            <div className="bg-white/10 px-3 py-1 rounded font-mono">ID: {gameId}</div>
                            <div className="flex items-center justify-center gap-2"><Users size={16} /> {Object.keys(gameState.players).length}/{gameState.max_players} Игроков</div>
                            {!isHost && <div className="text-yellow-500 animate-pulse">Ожидание начала игры хостом...</div>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            {Object.values(gameState.players).map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 flex items-center justify-center text-2xl">
                                                <img src={CHARACTERS[p.character]?.avatar} className="w-full h-full object-cover" />
                                            </div>
                                            {p.is_bot && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] px-1 rounded">БОТ</div>}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{p.name}</div>
                                            <div className="text-xs text-gray-400">{p.character}</div>
                                        </div>
                                    </div>
                                    {isHost && p.is_bot && (
                                        <button onClick={() => handleRemoveBot(p.id)} className="p-2 text-red-500 hover:bg-white/10 rounded-full transition-colors" title="Удалить бота">
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
                                        <Play size={24} /> Начать игру
                                    </button>
                                    <button
                                        onClick={handleAddBot}
                                        className="btn-ghost py-3 px-6 flex items-center gap-2 border border-white/20 hover:bg-white/10"
                                        disabled={Object.keys(gameState.players).length >= gameState.max_players}
                                    >
                                        <Bot size={20} /> Добавить бота
                                    </button>
                                </>
                            )}

                            <button
                                onClick={openInviteModal}
                                className="btn-purple py-3 px-6 flex items-center gap-2 shadow-lg"
                            >
                                <UserPlus size={20} /> Пригласить
                            </button>

                            <button
                                onClick={() => copyToClipboard(gameId)}
                                className="btn-ghost py-3 px-6 flex items-center gap-2 border border-white/20 hover:bg-white/10"
                            >
                                <Copy size={20} /> Скопировать ID
                            </button>

                            <button
                                onClick={() => navigate('/')}
                                className="py-3 px-6 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 ml-auto"
                            >
                                <X size={20} /> Выйти
                            </button>
                        </div>
                    </div>

                    {/* Invite Modal (Inside Waiting Room) */}
                    <AnimatePresence>
                        {showInviteModal && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
                                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} onClick={e => e.stopPropagation()} className="glass-card p-6 max-w-md w-full">
                                    <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-white">Пригласить друзей</h3><button onClick={() => setShowInviteModal(false)} className="btn-ghost"><X size={20} /></button></div>
                                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {friends.length === 0 ? (
                                            <div className="text-gray-500 text-center py-4">Нет друзей. Добавьте их в лобби!</div>
                                        ) : (
                                            friends.map(friend => (
                                                <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white">
                                                            {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full rounded-full" /> : friend.name.charAt(0)}
                                                        </div>
                                                        <div className="font-semibold text-white">{friend.name}</div>
                                                    </div>
                                                    <button onClick={() => handleSendInvite(friend.id)} className="btn-sm btn-success flex items-center gap-1"><UserPlus size={14} /> Отправить</button>
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
                animate={{
                    width: isMobile ? (sidebarCollapsed ? 0 : 280) : (sidebarCollapsed ? 80 : 300),
                    x: isMobile && sidebarCollapsed ? -280 : 0
                }}
                className={`flex-shrink-0 bg-[#0c0c14] border-r border-white/10 flex flex-col z-30 shadow-2xl relative transition-all duration-300 ${isMobile ? 'absolute inset-y-0 left-0' : ''}`}
            >
                {/* Mobile Toggle Button (only visible on mobile) */}
                {isMobile && sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="fixed top-4 left-4 z-50 p-3 bg-yellow-500 rounded-full text-black shadow-lg"
                    >
                        <Menu size={20} />
                    </button>
                )}
                {/* Top Info Bar */}
                <div className="p-4 border-b border-white/10 bg-[#13131f] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {!sidebarCollapsed && (
                            <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        {/* Persistent Surrender Button */}

                    </div>

                    <button onClick={() => copyToClipboard(gameId)} className={`flex flex-col ${sidebarCollapsed ? 'items-center w-full' : 'items-end'}`}>
                        {sidebarCollapsed ? <Copy size={16} className="text-blue-400 mb-1" /> : (
                            <>
                                <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">ID игры</span>
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
                            <div className="w-3 h-3 rounded-full bg-yellow-500" title="Текущий ход" />
                            {!sidebarCollapsed && <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">{currentTurnPlayer?.name}</span>}
                        </div>
                    </div>
                </div>

                {/* Players List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {(gameState?.player_order || []).map(pid => {
                        const p = delayedPlayers?.[pid];
                        if (!p) return null;
                        const isTurn = gameState?.player_order?.[gameState?.current_turn_index] === pid;
                        const pChar = CHARACTERS[p.character] || {};

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
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 flex items-center justify-center text-xl">
                                            <img src={CHARACTERS[p.character]?.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        {isTurn && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-black" />}
                                        {/* Tooltip */}
                                        <div className="absolute left-14 top-0 bg-black/90 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                                            {p.name} (${p.money})
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 flex items-center justify-center text-xl">
                                            <img src={CHARACTERS[p.character]?.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-xs font-bold truncate ${isTurn ? 'text-white' : 'text-gray-300'}`}>{p.name}</span>
                                            </div>
                                            <div className="text-lg font-mono font-black text-yellow-400 leading-none">
                                                ${p.money?.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {p.id !== playerId ? (
                                                <button onClick={(e) => { e.stopPropagation(); initiateTrade(p); }} className="p-1 hover:bg-white/10 rounded" title="Предложить обмен">
                                                    <ArrowLeftRight size={14} className="text-gray-400" />
                                                </button>
                                            ) : (
                                                // Self actions
                                                <button onClick={() => { if (window.confirm('Сдаться?')) sendAction('SURRENDER'); }} className="p-1 hover:bg-red-500/20 rounded text-red-500" title="Сдаться">
                                                    <Flag size={14} />
                                                </button>
                                            )}
                                            {!p.is_bot && p.id !== playerId && (
                                                <button onClick={(e) => { e.stopPropagation(); handleSendInvite(p.user_id); }} className="p-1 hover:bg-white/10 rounded" title="Добавить в друзья">
                                                    <UserPlus size={14} className="text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* MAIN BOARD AREA */}
            <div className="flex-1 relative bg-[#0c0c14] overflow-auto flex flex-col items-center">
                {/* Background */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0c0c14_80%)] z-0 min-h-full" />

                <div className="relative z-10 shadow-2xl transition-all duration-300 my-auto py-8"
                    style={{
                        width: isMobile ? '800px' : '85%', // Reduced by 5%
                        maxWidth: '1000px',
                        aspectRatio: '1/1', // Keep square aspect ratio
                        minHeight: isMobile ? '800px' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Board
                        tiles={gameState.board}
                        players={gameState.players}
                        onTileClick={handleTileClick}
                        mapType={gameState.map_type}
                        currentPlayerId={playerId}
                        // logs and onSendMessage removed from here as we moved the component up

                        externalRef={boardRef}
                        onAvatarClick={handleAvatarClick}
                        winner={gameState.winner}

                        selectedTileId={selectedTile?.id}
                        onBuy={() => {
                            handleBuyProperty();
                            setShowBuyModal(false);
                            setSelectedTile(null);
                        }}
                        onBuild={handleBuildHouse}
                        onSellHouse={handleSellHouse}
                        onMortgage={handleMortgage}
                        onUnmortgage={handleUnmortgage}
                        canBuild={isMyTurn && (selectedTile || currentTile)?.owner_id === playerId && checkMonopolyByPlayer(selectedTile || currentTile)}
                        isMyTurn={isMyTurn}
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
                            isChanceOpen={!!chanceCard}
                            isDoubles={diceValues[0] === diceValues[1]}
                            abilityCooldown={currentPlayer?.ability_cooldown}
                            onSurrender={() => sendAction('SURRENDER')}
                            rentDetails={rentDetails}
                            onPayRent={handlePayRent}
                        />
                    </div>
                </div>

                {/* Chat / Toast Notification - Moved to main view for proper layering */}
                <div className="absolute bottom-0 left-0 right-0 z-[150] w-full flex flex-col justify-end pointer-events-none p-4">
                    <div className="pointer-events-auto w-full max-w-[600px] mx-auto">
                        <ToastNotification logs={displayedLogs} onSendMessage={handleSendMessage} />
                    </div>
                </div>
            </div>

            {/* CHANCE CARD NOTIFICATION PANEL */}
            <AnimatePresence>
                {chanceCard && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[160] w-full max-w-lg px-4"
                    >
                        <div className="bg-[#1e1e2f] border-2 border-yellow-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(234,179,8,0.4)] flex items-center gap-6">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse">
                                <span className="text-4xl">📰</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-yellow-500 font-bold tracking-widest uppercase text-xs mb-1">Срочные Новости</div>
                                <div className="text-white text-lg font-bold leading-tight">
                                    {chanceCard}
                                </div>
                            </div>
                            <button
                                onClick={() => setChanceCard(null)}
                                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm rounded-lg shadow-lg hover:scale-105 transition-all"
                            >
                                Понятно
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                <Suspense fallback={null}>
                    <OreshnikAnimation
                        isVisible={showOreshnik}
                        onComplete={handleCloseOreshnik}
                        targetTileId={lastAction?.target_id}
                        boardRef={boardRef}
                    />
                </Suspense>
                <BuyoutAnimation isVisible={showBuyout} onComplete={handleCloseBuyout} />
                <AidAnimation isVisible={showAid} onComplete={handleCloseAid} />
                <NukeThreatAnimation isVisible={showNuke} onComplete={handleCloseNuke} />
            </div>




            {/* Also show trade modal (only needed if trading in waiting room enabled? Probably not, but safe to keep) */}
            <TradeModal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} fromPlayer={currentPlayer} toPlayer={tradeTarget} gameState={gameState} onSendOffer={handleSendOffer} />
            <TradeNotification trade={incomingTrade} fromPlayer={gameState?.players?.[incomingTrade?.from_player_id]} onRespond={handleRespondTrade} board={gameState?.board} />
        </div>
    );
};

export default GameRoom;
