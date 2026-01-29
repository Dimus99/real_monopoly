import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, Users, Bot, Play, Check, Home, Clock, ArrowLeftRight,
    ArrowLeft, MessageSquare, Settings, Bell,
    Menu, UserPlus, X, MapPin, ChevronLeft, ChevronRight, Crosshair, Flag,
    Map, Zap, Folder, Smile
} from 'lucide-react';
import { CHARACTERS, ABILITIES } from '../constants/characters';
import useGameSocket from '../hooks/useGameSocket';
import Board from '../components/Board';
import PropertyModal from '../components/PropertyModal';
import DiceAnimation from '../components/DiceAnimation';
import ToastNotification from '../components/ToastNotification';
import ActionPanel from '../components/ActionPanel';
import TradeModal from '../components/TradeModal';
import TradeNotification from '../components/TradeNotification';
import ChanceModal from '../components/ChanceModal';
import CasinoModal from '../components/CasinoModal';
import { BuyoutAnimation, AidAnimation, NukeThreatAnimation, SanctionsAnimation, BeltRoadAnimation } from '../components/AbilityAnimations';

// Lazy load to avoid circular dependency/initialization issues
const OreshnikAnimation = lazy(() => import('../components/OreshnikAnimation'));
const WhoAmIAnimation = lazy(() => import('../components/WhoAmIAnimation'));

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
        !['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax', 'Negotiations', 'RaiseTax', 'Casino'].includes(currentTile.group) &&
        !currentTile.is_destroyed;

    // UI States
    const [showOreshnik, setShowOreshnik] = useState(false);
    const [showWhoAmI, setShowWhoAmI] = useState(false);
    const [selectedTile, setSelectedTile] = useState(null);
    const [isRolling, setIsRolling] = useState(false); // For button disable
    const [diceValues, setDiceValues] = useState([1, 2]); // Default to non-doubles to avoid initial "Double" state
    const [copied, setCopied] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [friends, setFriends] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // New States for Profiles & Friends
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [showRequestsModal, setShowRequestsModal] = useState(false);
    const [showPranksMenu, setShowPranksMenu] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [myUser, setMyUser] = useState(null);
    const [hoveredAbility, setHoveredAbility] = useState(null);

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
    const [rollingPlayerId, setRollingPlayerId] = useState(null);

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
    const [showSanctions, setShowSanctions] = useState(false);
    const [showBeltRoad, setShowBeltRoad] = useState(false);
    const [abilityBonus, setAbilityBonus] = useState(0); // For Belt Road
    const [abilityTargetName, setAbilityTargetName] = useState('');
    const [abilityAmount, setAbilityAmount] = useState(0);
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
    const handleCloseSanctions = React.useCallback(() => setShowSanctions(false), []);
    const handleCloseBeltRoad = React.useCallback(() => setShowBeltRoad(false), []);

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

    const handlePayBail = React.useCallback(() => {
        if (!isMyTurn || !currentPlayer?.is_jailed) return;
        sendAction('PAY_BAIL');
    }, [isMyTurn, currentPlayer?.is_jailed, sendAction]);

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

    const handleLeaveGame = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            await fetch(`${API_BASE}/api/games/${gameId}/leave`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            navigate('/');
        } catch (e) { navigate('/'); }
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

    const handleKickPlayer = async (playerId) => {
        try {
            const token = localStorage.getItem('monopoly_token');
            await fetch(`${API_BASE}/api/games/${gameId}/players/${playerId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (e) { alert('Не удалось исключить игрока'); }
    };

    useEffect(() => {
        const fetchMe = async () => {
            try {
                const token = localStorage.getItem('monopoly_token');
                if (!token) return;
                const res = await fetch(`${API_BASE}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setMyUser(await res.json());
            } catch (e) { console.error(e); }
        };
        fetchMe();
        fetchFriends();
    }, [API_BASE]);

    const fetchFriends = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/friends`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setFriends(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleSendGameInvite = async (friendId) => {
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
                alert('Приглашение отправлено!');
            } else {
                const err = await res.json();
                alert(err.detail || 'Не удалось отправить приглашение');
            }
        } catch (e) { alert('Ошибка при отправке приглашения'); }
    };

    const handleSendFriendRequest = async (targetUserId) => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/friends/request`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ to_user_id: targetUserId })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message || 'Заявка в друзья отправлена!');
            } else {
                alert(data.detail || 'Ошибка при отправке заявки');
            }
        } catch (e) { alert('Ошибка сети'); }
    };

    const fetchPendingRequests = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/friends/requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data.slice(0, 5)); // Only last 5
            }
        } catch (e) { console.error(e); }
    };

    const handleAcceptFriend = async (requestId) => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/friends/requests/${requestId}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPendingRequests();
                alert('Заявка принята!');
            }
        } catch (e) { console.error(e); }
    };

    const handleRejectFriend = async (requestId) => {
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/friends/requests/${requestId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchPendingRequests();
        } catch (e) { console.error(e); }
    };

    const fetchUserProfile = async (userId) => {
        setIsLoadingProfile(true);
        try {
            const token = localStorage.getItem('monopoly_token');
            const res = await fetch(`${API_BASE}/api/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSelectedUserProfile(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoadingProfile(false); }
    };



    const openInviteModal = () => {
        fetchFriends();
        setShowInviteModal(true);
    };

    // Modals state
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showChanceModal, setShowChanceModal] = useState(false);
    const [showCasinoModal, setShowCasinoModal] = useState(false);
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
            case 'BUYOUT':
                setAbilityTargetName(lastAction.target_name);
                setShowBuyout(true);
                break;
            case 'AID':
                setAbilityAmount(lastAction.amount_collected);
                setShowAid(true);
                break;
            case 'ISOLATION': setShowNuke(true); break;
            case 'SANCTIONS': setShowSanctions(true); break;
            case 'BELT_ROAD':
                if (lastAction.bonus) setAbilityBonus(lastAction.bonus);
                setShowBeltRoad(true);
                break;
            case 'DICE_ROLLED':
                // Handle Skipped Turn (Sanctions)
                if (lastAction.action === 'skipped_turn') {
                    // No animation needed. Just update state strictly.
                    // Ensure we don't block controls.
                    setDiceRolling(false);
                    setIsRolling(false);
                    setShowDice(false);
                    // setHasRolled(false); // Do not force false here, let server sync handle it naturally, essentially it's end of turn.
                    return;
                }

                setDiceValues(lastAction.dice || [1, 1]);
                setShowDice(true);
                setDiceRolling(true);
                setRollingPlayerId(lastAction.player_id);

                // CRITICAL FIX: Only block MY controls if it's MY roll
                if (lastAction.player_id === playerId) {
                    setIsRolling(true);
                }

                // SAFETY: Force clear rolling state after a reasonable time
                setTimeout(() => {
                    if (isRolling) setIsRolling(false);
                    setDiceRolling(false);
                }, 8000);

                // Phase 1: Rolling animation (2000ms spin)
                const rollTimeout = setTimeout(() => {
                    setDiceRolling(false); // Stop spinning (Freeze)

                    // Trigger movement immediately when dice stop
                    if (gameState?.players) {
                        setDelayedPlayers(gameState.players);
                    }

                    // Phase 2: Wait for movement (1000ms) then ENABLE BUTTONS
                    const enableTimeout = setTimeout(() => {
                        setIsRolling(false);

                        // SYNC hasRolled accurately from the latest server state
                        if (lastAction.player_id === playerId && gameState?.turn_state) {
                            setHasRolled(!!gameState.turn_state.has_rolled);
                        }

                        // Handle rent/tax/chance after movement
                        if (lastAction.player_id === playerId) {
                            if (lastAction.action === 'pay_rent' || lastAction.action === 'tax') {
                                setRentDetails({
                                    amount: lastAction.amount || lastAction.tax_paid,
                                    ownerId: lastAction.owner_id || 'BANK'
                                });
                            }
                            if (lastAction.chance_card) {
                                setChanceCard(lastAction.chance_card);
                                setChanceData({ chance_card: lastAction.chance_card });
                                setShowChanceModal(true);
                            }
                            if (lastAction.action === 'casino_prompt') {
                                setShowCasinoModal(true);
                            }
                            // Added: immediate jail check update
                            if (lastAction.action === 'go_to_jail') {
                                setHasRolled(true);
                            }
                        }

                        // Phase 3: Wait more for visual "freeze" (2000ms) then HIDE DICE
                        const hideTimeout = setTimeout(() => {
                            setShowDice(false);
                        }, 2000);

                    }, 1000);
                }, 3000);
                break;

            case 'PROPERTY_BOUGHT':
                if (lastAction.player_id === playerId) {
                    setShowBuyModal(false);
                }
                break;

            case 'CHAT_MESSAGE':
                break;

            case 'RENT_PAID':
            case 'TAX_PAID':
                if (lastAction.player_id === playerId) {
                    setShowRentModal(false);
                }
                break;

            case 'TURN_ENDED':
            case 'TURN_SKIPPED':
            case 'PLAYER_DISQUALIFIED':
                if (lastAction.player_id === playerId) {
                    setHasRolled(false);
                    setShowDice(false);
                    setDiceRolling(false);
                    setIsRolling(false);
                    setDiceValues([1, 2]); // Reset dice to non-doubles for next turn
                }
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
            case 'CASINO_RESULT':
                if (lastAction.player_id === playerId) {
                    setShowCasinoModal(false);
                    if (lastAction.skipped) {
                        // Just quiet close or toast
                    } else if (lastAction.win) {
                        alert(`💰 КАЗИНО: Вы выиграли $${lastAction.amount}!`);
                    } else {
                        alert(`🔥 КАЗИНО: Вы проиграли! В стране произошла РЕВОЛЮЦИЯ.`);
                    }
                }
                break;
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
    // Reset UI locks on NEW TURN to ensure buttons activate on time
    useEffect(() => {
        if (!gameState) return;
        if (isMyTurn) {
            // Force unlock UI when my turn starts or page loads into my turn
            setIsRolling(false);
            setDiceRolling(false);
        }
    }, [gameState?.turn_number, isMyTurn]);


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
            // STRICTER CHECK: Do not sync hasRolled if ANY rolling flag is true.
            // This prevents the "Button Blocked" bug where server says hasRolled=true (immediately after roll),
            // but our animation hasn't finished, so we might get into a weird state.
            // We only trust the server sync when we are IDLE.
            if (isMyTurn) {
                const serverHasRolled = !!gameState.turn_state.has_rolled;
                if (!isRolling && !diceRolling && !showDice) {
                    setHasRolled(serverHasRolled);
                } else {
                    // Critical Fix: If server says we have NOT rolled (e.g. Doubles reset), force client to false even if animating
                    // This prevents getting stuck in "Done" state when we should be able to roll again.
                    if (!serverHasRolled) {
                        setHasRolled(false);
                    }
                }
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

    const handleAvatarClick = (targetPlayer) => {
        if (!targetPlayer) return;
        const targetPid = targetPlayer.id;

        // 1. Check targeting ability
        if (targetingAbility === 'SANCTIONS' && targetPid !== playerId) {
            sendAction('USE_ABILITY', { ability_type: targetingAbility, target_id: targetPid });
            setTargetingAbility(null);
            return;
        }

        // 2. Self -> show friend requests
        if (targetPlayer.user_id === myUser?.id) {
            fetchPendingRequests();
            setShowRequestsModal(true);
        }
        // 3. Other Human -> show profile
        else if (!targetPlayer.is_bot) {
            fetchUserProfile(targetPlayer.user_id);
        }
        // 4. Bot or fallback -> maybe trade? Bot trade is complex, usually we don't open profile for bots.
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                <Map className="text-blue-400" size={20} />
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Карта</div>
                                    <div className="text-sm text-white font-medium">{gameState.map_type}</div>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                <Zap className="text-yellow-400" size={20} />
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Режим</div>
                                    <div className="text-sm text-white font-medium">{gameState.game_mode}</div>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                <Clock className="text-green-400" size={20} />
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Таймер</div>
                                    <div className="text-sm text-white font-medium">{gameState.turn_timer === 0 ? 'Без таймера' : `${gameState.turn_timer} сек`}</div>
                                </div>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                <Users className="text-purple-400" size={20} />
                                <div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Игроки</div>
                                    <div className="text-sm text-white font-medium">{Object.keys(gameState.players).length}/{gameState.max_players}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            {Object.values(gameState.players).map(p => (
                                <div key={p.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-colors"
                                        onClick={() => handleAvatarClick(p)}>
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 flex items-center justify-center text-2xl">
                                                <img src={CHARACTERS[p.character]?.avatar} className="w-full h-full object-cover" />
                                            </div>
                                            {p.is_bot && <div className="absolute -bottom-1 -right-1 bg-blue-500 text-[10px] px-1 rounded">БОТ</div>}
                                            {p.user_id === myUser?.id && <div className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-[#1a1a2e]" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white leading-tight">{p.name}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{p.character}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!p.is_bot && p.user_id !== myUser?.id && !friends.some(f => f.id === p.user_id) && (
                                            <button onClick={() => handleSendFriendRequest(p.user_id)} className="p-2 text-blue-400 hover:bg-white/10 rounded-full transition-colors" title="Добавить в друзья">
                                                <UserPlus size={16} />
                                            </button>
                                        )}
                                        {isHost && p.user_id !== myUser?.id && (
                                            <button onClick={() => handleKickPlayer(p.id)} className="p-2 text-red-500 hover:bg-white/10 rounded-full transition-colors" title="Исключить">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
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
                                onClick={handleLeaveGame}
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
                                                    <button onClick={() => handleSendGameInvite(friend.id)} className="btn-sm btn-success flex items-center gap-1"><UserPlus size={14} /> Отправить</button>
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
        <div className="flex bg-[#0c0c14] min-h-screen w-full font-sans selection:bg-purple-500/30 relative">
            {/* COLLAPSIBLE SIDEBAR */}
            <motion.div
                animate={{
                    width: isMobile ? (sidebarCollapsed ? 0 : 280) : (sidebarCollapsed ? 80 : 300),
                    x: isMobile && sidebarCollapsed ? -280 : 0
                }}
                className={`flex-shrink-0 bg-[#0c0c14] border-r border-white/10 flex flex-col z-[500] shadow-2xl relative transition-all duration-300 ${isMobile ? 'absolute inset-y-0 left-0' : ''}`}
            >
                {/* Mobile Toggle Button (only visible on mobile) */}
                {isMobile && sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="fixed top-4 left-4 z-[200] p-3 bg-yellow-500 rounded-full text-black shadow-lg"
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
                        className="absolute -right-3 top-20 bg-yellow-500 rounded-full p-1 text-black shadow-lg hover:scale-110 transition-transform z-[200]"
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
                                {gameState?.turn_timer === 0 || gameState?.game_status === 'finished' ? '∞' : timeLeft}
                            </span>
                        </div>
                        <div className={`bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col items-center ${sidebarCollapsed ? 'w-full' : 'flex-1'}`}>
                            <div className="w-3 h-3 rounded-full bg-yellow-500" title="Текущий ход" />
                            {!sidebarCollapsed && <span className="text-[10px] text-gray-400 truncate w-full text-center mt-1">{currentTurnPlayer?.name}</span>}
                        </div>
                    </div>
                </div>

                {/* "Pranks" / Fun Folder Section */}
                <div className="p-2 border-b border-white/10 flex flex-col gap-2">
                    <button
                        onClick={() => setShowPranksMenu(!showPranksMenu)}
                        className={`btn-ghost text-xs py-2 px-2 flex items-center gap-2 border border-white/10 hover:bg-white/5 ${sidebarCollapsed ? 'justify-center' : 'w-full pl-3'}`}
                        title="Папка с приколами"
                    >
                        <Folder size={16} className="text-yellow-400" />
                        {!sidebarCollapsed && <span className="font-bold text-gray-300">ПРИКОЛЫ</span>}
                        {!sidebarCollapsed && <span className="ml-auto text-[10px]">{showPranksMenu ? '▼' : '▶'}</span>}
                    </button>

                    <AnimatePresence>
                        {showPranksMenu && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden flex flex-col gap-1 pl-2"
                            >
                                <button
                                    onClick={() => setShowWhoAmI(true)}
                                    className={`btn-ghost text-xs py-1 px-2 flex items-center gap-2 hover:bg-white/10 rounded-lg ${sidebarCollapsed ? 'justify-center' : 'w-full justify-start'}`}
                                    title="Кто я?"
                                >
                                    <span className="text-lg">🤡</span>
                                    {!sidebarCollapsed && <span>Кто я?</span>}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
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

                                        {/* Ability indicator for collapsed view */}
                                        {p.character && ABILITIES[p.character] && (
                                            <div
                                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] border border-black shadow-lg ${p.ability_cooldown > 0 ? 'bg-orange-600/90' : 'bg-green-600/90'}`}
                                            >
                                                {p.ability_cooldown > 0 ? p.ability_cooldown : ABILITIES[p.character].icon}
                                            </div>
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute left-14 top-0 bg-[#1a1a2e]/95 text-white px-3 py-2 rounded-xl text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-2xl transition-all scale-95 group-hover:scale-100">
                                            <div className="font-bold border-b border-white/10 pb-1.5 mb-1.5 flex justify-between gap-4">
                                                <span>{p.name}</span>
                                                <span className="text-yellow-400">${p.money.toLocaleString()}</span>
                                            </div>
                                            {p.character && ABILITIES[p.character] && (
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-blue-300">
                                                        <span>{ABILITIES[p.character].icon}</span>
                                                        <span>{ABILITIES[p.character].name}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 italic mb-1">{ABILITIES[p.character].desc}</div>
                                                    <div className={`text-[10px] font-bold ${p.ability_cooldown > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                                                        {p.ability_cooldown > 0 ? `Кулдаун: ${p.ability_cooldown} ходов` : 'Способность готова!'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 flex items-center justify-center text-xl cursor-pointer"
                                            onClick={() => handleAvatarClick(p)}>
                                            <img src={CHARACTERS[p.character]?.avatar} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className={`text-xs font-bold truncate cursor-pointer ${isTurn ? 'text-white' : 'text-gray-300'}`}
                                                    onClick={() => handleAvatarClick(p)}>{p.name}</span>
                                            </div>
                                            <div className="text-lg font-mono font-black text-yellow-400 leading-none">
                                                ${p.money?.toLocaleString()}
                                            </div>
                                            {/* Ability Status */}
                                            {p.character && ABILITIES[p.character] && (
                                                <div className="mt-1.5 relative group/ability">
                                                    <div
                                                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-colors cursor-help ${p.ability_cooldown > 0
                                                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                                            : 'bg-green-500/10 border-green-500/30 text-green-400'
                                                            }`}
                                                        onMouseEnter={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setHoveredAbility({
                                                                x: rect.left,
                                                                y: rect.bottom + 10, // Position BELOW
                                                                charName: p.character,
                                                                name: ABILITIES[p.character].name,
                                                                desc: ABILITIES[p.character].desc,
                                                                cooldown: p.ability_cooldown
                                                            });
                                                        }}
                                                        onMouseLeave={() => setHoveredAbility(null)}
                                                    >
                                                        <span>{ABILITIES[p.character].icon}</span>
                                                        <span>{p.ability_cooldown > 0 ? `${p.ability_cooldown} Х` : 'ГОТОВО'}</span>
                                                    </div>
                                                </div>
                                            )}
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
                                            {!p.is_bot && p.user_id !== myUser?.id && (
                                                <button onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(p.user_id); }} className="p-1 hover:bg-white/10 rounded" title="Добавить в друзья">
                                                    <UserPlus size={14} className="text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                                }
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div >

            {/* MAIN BOARD AREA */}
            < div className={`flex-1 relative bg-[#0c0c14] flex flex-col ${isMobile ? 'items-start overflow-auto pr-[50px] pb-24' : 'items-center overflow-x-auto overflow-y-hidden pr-24'}`}>
                {/* Background */}
                < div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0c0c14_80%)] z-0 min-h-full" />

                <div className={`relative z-10 shadow-2xl transition-all duration-300 my-auto py-8 ${isMobile ? 'overflow-visible' : 'mx-12'}`}
                    style={{
                        width: isMobile ? '800px' : '85%',
                        maxWidth: '1000px',
                        aspectRatio: '1/1',
                        minHeight: isMobile ? '800px' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // Mobile: Force min-width to allow scroll if parent is scrolling
                        minWidth: isMobile ? '800px' : 'auto',
                        paddingRight: isMobile ? '50px' : '0', // Allow scrolling extra to right
                        paddingLeft: isMobile ? '50px' : '0',  // Allow scrolling extra to left (expose sidebar hint)
                        marginRight: isMobile ? '0' : '150px' // Increased extra space for desktop scroll
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
                        onBuy={() => {
                            handleBuyProperty();
                            setShowBuyModal(false);
                            setSelectedTile(null);
                        }}
                        onBuild={handleBuildHouse}
                        onSellHouse={handleSellHouse}
                        onMortgage={handleMortgage}
                        onUnmortgage={handleUnmortgage}
                        canBuild={isMyTurn && (selectedTile || currentTile)?.owner_id === playerId && (selectedTile || currentTile)?.is_monopoly && !(gameState.turn_state?.build_counts?.[(selectedTile || currentTile)?.group] >= 1)}
                        isMyTurn={isMyTurn}
                        lastAction={lastAction}
                        playersPos={gameState.players}
                    />

                    {/* Chat relative to Board Center (Bottom) */}
                    <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-full max-w-[400px] z-[200] pointer-events-none">
                        <div className="pointer-events-auto">
                            <ToastNotification logs={displayedLogs} onSendMessage={handleSendMessage} />
                        </div>
                    </div>
                </div>

                {/* Property Modal - Ensure High Z-Index & Centering */}
                {
                    gameState?.board && (
                        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
                            <div className="pointer-events-auto">
                                <PropertyModal
                                    isOpen={!!selectedTile}
                                    onClose={() => setSelectedTile(null)}
                                    property={selectedTile}
                                    players={gameState.players}
                                    currentPlayerId={playerId}
                                    onBuy={handleBuyProperty}
                                    canBuy={canBuy && (selectedTile?.id === currentTile?.id)}
                                    canBuild={isMyTurn && !(gameState.turn_state?.build_counts?.[selectedTile?.group] >= 1)}
                                    onBuild={handleBuildHouse}
                                    onSellHouse={handleSellHouse}
                                    onMortgage={handleMortgage}
                                    onUnmortgage={handleUnmortgage}
                                    tiles={gameState.board}
                                />
                            </div>
                        </div>
                    )
                }


                {/* Action Panel - CENTERED - Hide when TradeModal or CasinoModal is open */}
                {
                    !showTradeModal && !showCasinoModal && (
                        <div className={`fixed left-1/2 -translate-x-1/2 pointer-events-auto z-[140] px-4 flex justify-center items-center w-full max-w-md ${isMobile ? 'bottom-24 scale-90' : 'top-[25%] -translate-y-1/2 scale-90'}`}>
                            <div className="bg-black/80 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20 w-fit mx-auto">
                                <ActionPanel
                                    onToggleSidebar={isMobile ? () => setSidebarCollapsed(!sidebarCollapsed) : null}
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
                                    isJailed={currentPlayer?.is_jailed}
                                    abilityCooldown={currentPlayer?.ability_cooldown}
                                    abilityUsed={currentPlayer?.ability_used_this_game}
                                    onSurrender={() => sendAction('SURRENDER')}
                                    rentDetails={rentDetails}
                                    onPayRent={handlePayRent}
                                    onPayBail={handlePayBail}
                                />
                            </div>
                        </div>
                    )
                }

                {/* Chat / Toast Notification - Elevated to avoid overlap */}
                {/* Chat / Toast Notification - Removed fixed position here, moved inside Board container */}
            </div >

            {/* Fancy Newspaper Chance Modal */}
            {/* Fancy Newspaper Chance Modal - High Z-Index */}
            <div className="relative z-[300]">
                <ChanceModal
                    show={showChanceModal}
                    data={chanceData}
                    onClose={() => {
                        setShowChanceModal(false);
                        setChanceCard(null); // Sync with ActionPanel
                    }}
                />
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
                <Suspense fallback={null}>
                    <OreshnikAnimation
                        isVisible={showOreshnik}
                        onComplete={handleCloseOreshnik}
                        targetTileId={lastAction?.target_id}
                        boardRef={boardRef}
                    />
                    <WhoAmIAnimation
                        isVisible={showWhoAmI}
                        onClose={() => setShowWhoAmI(false)}
                    />
                </Suspense>
                <BuyoutAnimation isVisible={showBuyout} onComplete={handleCloseBuyout} targetProperty={abilityTargetName} />
                <AidAnimation isVisible={showAid} onComplete={handleCloseAid} amount={abilityAmount} />
                <NukeThreatAnimation isVisible={showNuke} onComplete={handleCloseNuke} />
                <SanctionsAnimation isVisible={showSanctions} onComplete={handleCloseSanctions} />
                <BeltRoadAnimation isVisible={showBeltRoad} onComplete={handleCloseBeltRoad} bonus={abilityBonus} />
            </div>




            {/* Also show trade modal (only needed if trading in waiting room enabled? Probably not, but safe to keep) */}
            <TradeModal isOpen={showTradeModal} onClose={() => setShowTradeModal(false)} fromPlayer={currentPlayer} toPlayer={tradeTarget} gameState={gameState} onSendOffer={handleSendOffer} />
            <TradeNotification trade={incomingTrade} fromPlayer={gameState?.players?.[incomingTrade?.from_player_id]} onRespond={handleRespondTrade} board={gameState?.board} />
            {/* User Profile Modal */}
            <AnimatePresence>
                {selectedUserProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card max-w-sm w-full p-6 relative"
                        >
                            <button onClick={() => setSelectedUserProfile(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 mb-4 bg-black/40">
                                    {selectedUserProfile.avatar_url ? (
                                        <img src={selectedUserProfile.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-4xl text-white/20">👤</div>
                                    )}
                                </div>
                                <h2 className="text-2xl font-display font-bold text-white mb-1">{selectedUserProfile.name}</h2>
                                <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] text-gray-300 font-mono mb-6">
                                    CODE: {selectedUserProfile.friend_code}
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Игр</div>
                                        <div className="text-xl font-mono text-white">{selectedUserProfile.stats.games_played}</div>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Побед</div>
                                        <div className="text-xl font-mono text-green-400">{selectedUserProfile.stats.wins}</div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full">
                                    <button
                                        onClick={() => { handleSendFriendRequest(selectedUserProfile.id); setSelectedUserProfile(null); }}
                                        className="btn-primary py-3 w-full flex items-center justify-center gap-2"
                                    >
                                        <UserPlus size={20} /> Добавить в друзья
                                    </button>
                                    <button
                                        onClick={() => { initiateTrade(Object.values(gameState.players).find(p => p.user_id === selectedUserProfile.id)); setSelectedUserProfile(null); }}
                                        className="btn-ghost py-3 w-full border border-white/10 hover:bg-white/5"
                                    >
                                        Предложить обмен
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Friend Requests Modal */}
            <AnimatePresence>
                {showRequestsModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card max-w-md w-full p-6 relative"
                        >
                            <button onClick={() => setShowRequestsModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>

                            <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                                <Users size={28} className="text-blue-400" /> Заявки в друзья
                            </h2>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {pendingRequests.length > 0 ? (
                                    pendingRequests.map(req => (
                                        <div key={req.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/40">
                                                    {req.from_user.avatar_url ? (
                                                        <img src={req.from_user.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/20 select-none text-xl">👤</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white">{req.from_user.name}</div>
                                                    <div className="text-[10px] text-gray-400">Игр: {req.from_user.stats.games_played} | Побед: {req.from_user.stats.wins}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleAcceptFriend(req.id)}
                                                    className="p-2 bg-green-500/20 text-green-500 hover:bg-green-500 rounded-lg transition-all"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleRejectFriend(req.id)}
                                                    className="p-2 bg-red-500/20 text-red-500 hover:bg-red-500 rounded-lg transition-all"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-500">
                                        <div className="text-4xl mb-4 opacity-20 text-center flex justify-center">💌</div>
                                        <p>Пока нет новых заявок</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* GAME OVER MODAL */}
            <AnimatePresence>
                {gameState?.game_status === 'finished' && gameState?.winner_id && (
                    /* Changed: transparent background, pointer-events-none on container so clicks pass through to sides if needed, 
                       but pointer-events-auto on content */
                    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="relative flex flex-col items-center justify-center p-8 bg-black/80 backdrop-blur-md rounded-3xl border border-yellow-500/30 shadow-2xl pointer-events-auto"
                            style={{ maxWidth: '90%', width: '400px' }}
                        >
                            {/* Confetti Effect inside the card */}
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10 rounded-3xl overflow-hidden" />

                            {/* Avatar */}
                            <div className="relative w-32 h-32 mb-6 z-10">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 rounded-full border-4 border-dashed border-yellow-400"
                                />
                                <div className="absolute inset-2 rounded-full overflow-hidden border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] bg-black">
                                    <img
                                        src={CHARACTERS[gameState.players[gameState.winner_id]?.character]?.avatar}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Crown Icon */}
                                <motion.div
                                    initial={{ y: -40, opacity: 0 }}
                                    animate={{ y: -55, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-4xl"
                                >
                                    👑
                                </motion.div>
                            </div>

                            {/* Text */}
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-500 uppercase tracking-tighter mb-2 text-center drop-shadow-lg font-display z-10"
                            >
                                ПОБЕДИТЕЛЬ!
                            </motion.h1>

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-xl font-bold text-white mb-8 text-center z-10"
                            >
                                {gameState.players[gameState.winner_id]?.name}
                            </motion.div>

                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent bubbling
                                    navigate('/');
                                }}
                                className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg rounded-full shadow-lg hover:scale-105 transition-all uppercase tracking-widest z-20 cursor-pointer pointer-events-auto"
                            >
                                В Лобби
                            </motion.button>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Global Dice Animation Overlay - Fixed to Viewport */}
            <DiceAnimation
                show={showDice}
                rolling={diceRolling}
                values={diceValues}
                glow={diceValues[0] === diceValues[1]}
                playerName={gameState?.players?.[rollingPlayerId]?.name || ''}
            />
            {
                showCasinoModal && (
                    <CasinoModal
                        onClose={() => setShowCasinoModal(false)}
                        onBet={(numbers) => sendAction('CASINO_BET', { bet_numbers: numbers })}
                    />
                )
            }

            {/* Global Tooltip Portal (rendered outside overflow containers) */}
            <AnimatePresence>
                {hoveredAbility && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{
                            position: 'fixed',
                            top: hoveredAbility.y,
                            left: hoveredAbility.x,
                            zIndex: 9999
                        }}
                        className="w-64 p-3 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl pointer-events-none origin-top-left"
                    >
                        <div className="text-xs font-black text-white/40 uppercase tracking-widest mb-1 pb-1 border-b border-white/5 flex justify-between">
                            <span>{hoveredAbility.charName}: {hoveredAbility.name}</span>
                            {hoveredAbility.cooldown > 0 && <span className="text-orange-400">⏳ {hoveredAbility.cooldown}</span>}
                        </div>
                        <p className="text-[11px] text-white/90 leading-normal font-medium whitespace-normal">
                            {hoveredAbility.desc}
                        </p>
                        {/* Arrow (Pointing Up) */}
                        <div className="absolute -top-1.5 left-4 w-3 h-3 bg-gray-900 border-l border-t border-white/10 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default GameRoom;
