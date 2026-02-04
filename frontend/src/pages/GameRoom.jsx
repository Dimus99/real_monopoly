import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, Users, Bot, Play, Check, Home, Clock, ArrowLeftRight,
    ArrowLeft, MessageSquare, Settings, Bell,
    Menu, UserPlus, X, MapPin, ChevronLeft, ChevronRight, Crosshair, Flag,
    Map, Zap, Folder, Smile, Maximize, Minimize
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
import AuctionModal from '../components/AuctionModal';
import { BuyoutAnimation, AidAnimation, NukeThreatAnimation, SanctionsAnimation, BeltRoadAnimation } from '../components/AbilityAnimations';
import BankruptcyAnimation from '../components/BankruptcyAnimation';
import { soundManager } from '../utils/sounds';

// Lazy load to avoid circular dependency/initialization issues
const OreshnikAnimation = lazy(() => import('../components/OreshnikAnimation'));
const September11Animation = lazy(() => import('../components/September11Animation'));
const WhoAmIAnimation = lazy(() => import('../components/WhoAmIAnimation'));

const getApiBase = () => import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

const GameRoom = () => {
    const API_BASE = React.useMemo(() => getApiBase(), []);
    const { gameId, playerId } = useParams();
    const navigate = useNavigate();
    const { gameState, sendAction, lastAction } = useGameSocket(gameId, playerId);

    // Sync State (Moved to top to prevent ReferenceError)
    const [delayedPlayers, setDelayedPlayers] = useState({});



    // Derived State Variables (Moved up to avoid TDZ errors in useEffect)
    // CRITICAL: Use delayedPlayers for UI logic (Buy button,etc) so it matches the visual token position!
    const effectivePlayers = (Object.keys(delayedPlayers).length > 0) ? delayedPlayers : (gameState?.players || {});
    const currentPlayer = effectivePlayers[playerId] || gameState?.players?.[playerId];

    const isMyTurn = gameState?.player_order?.[gameState?.current_turn_index] === playerId;
    const currentTurnPlayer = effectivePlayers[gameState?.player_order?.[gameState?.current_turn_index]];
    const playerChar = CHARACTERS[currentPlayer?.character] || CHARACTERS.Putin;
    const currentTile = gameState?.board?.[currentPlayer?.position];

    // Can buy only if on the tile (UI Logic)
    const canBuy = isMyTurn &&
        (gameState?.turn_state?.has_rolled || gameState?.turn_state?.action === 'can_buy') &&
        currentTile &&
        !currentTile.owner_id &&
        currentTile.price > 0 &&
        !['Special', 'Jail', 'FreeParking', 'GoToJail', 'Chance', 'Tax', 'Negotiations', 'RaiseTax', 'Casino'].includes(currentTile.group) &&
        !currentTile.is_destroyed &&
        !gameState?.turn_state?.auction_active;

    // UI States
    const [showOreshnik, setShowOreshnik] = useState(false);
    const [showSeptember11, setShowSeptember11] = useState(false);
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
    const [boardScale, setBoardScale] = useState(1);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Modal & Action States (Moved up to fix TDZ errors)
    const [targetingAbility, setTargetingAbility] = useState(null);
    const [showRentModal, setShowRentModal] = useState(false);
    const [rentDetails, setRentDetails] = useState(null);
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showChanceModal, setShowChanceModal] = useState(false);
    const [showCasinoModal, setShowCasinoModal] = useState(false);
    const [chanceData, setChanceData] = useState(null);
    const [showAuctionModal, setShowAuctionModal] = useState(false);
    const [auctionTimeLeft, setAuctionTimeLeft] = useState(30);
    const [timeLeft, setTimeLeft] = useState(90);
    const [lastRollTime, setLastRollTime] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setSidebarCollapsed(true);
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
        return () => window.removeEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Board Scaling Effect (Desktop)
    useEffect(() => {
        soundManager.init();
        const handleScale = () => {
            const h = window.innerHeight;
            const w = window.innerWidth;
            const sidebarWidth = sidebarCollapsed ? 80 : 320;
            const availableWidth = w - (isMobile ? 0 : sidebarWidth);
            const availableHeight = h - 60;
            setBoardScale(1);
        };
        window.addEventListener('resize', handleScale);
        handleScale();
        return () => window.removeEventListener('resize', handleScale);
    }, [sidebarCollapsed, isMobile]);

    // Full Screen Sync Effect
    useEffect(() => {
        const handleFS = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.error(e));
        } else {
            document.exitFullscreen().catch(e => console.error(e));
        }
    };

    // Dice Animation States
    const [showDice, setShowDice] = useState(false);
    const [diceRolling, setDiceRolling] = useState(false);
    const [hasRolled, setHasRolled] = useState(false);
    const [isDoubles, setIsDoubles] = useState(false);
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
                // Also sync doubles state if backend provides it, otherwise derive from dice
                // gameState.turn_state doesn't always have doubles, usually in dice event.
                // But we can check if can_roll is true AND has_rolled is true -> implies doubles
                if (serverHasRolled && gameState.turn_state.can_roll) {
                    setIsDoubles(true);
                }
            }

            // Sync dice values
            if (gameState.dice && gameState.dice.length === 2) {
                setDiceValues(gameState.dice);
            }
        }
    }, [gameState?.turn_state?.has_rolled, gameState?.dice, isMyTurn, isRolling]);

    // Reset states on new turn - but be careful not to kill active dice animations
    useEffect(() => {
        setHasRolled(false);
        setIsDoubles(false);
        // Only reset if we are not currently showing dice
        if (!showDice) {
            setIsRolling(false);
            setDiceRolling(false);
        }
    }, [gameState?.current_turn_index, gameState?.game_status]);

    // Log management - Update immediately to keep chat fresh, BUT delay roll messages if rolling
    const [releasedLogCount, setReleasedLogCount] = useState(0);

    // Initial sync of releasedLogCount
    useEffect(() => {
        if (gameState?.logs && releasedLogCount === 0) {
            setReleasedLogCount(gameState.logs.length);
        }
    }, [gameState?.logs]);

    // Auto-sync logs when NOT in a roll sequence
    useEffect(() => {
        if (gameState?.logs && !showDice && !diceRolling && !isRolling) {
            setReleasedLogCount(gameState.logs.length);
        }
    }, [gameState?.logs, showDice, diceRolling, isRolling]);

    const displayedLogs = React.useMemo(() => {
        return (gameState?.logs || []).slice(0, releasedLogCount);
    }, [gameState?.logs, releasedLogCount]);

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
    // Bankruptcy States
    const [bankruptPlayer, setBankruptPlayer] = useState(null);
    const prevPlayersRef = useRef({});

    useEffect(() => {
        if (gameState?.players) {
            Object.values(gameState.players).forEach(p => {
                const prevP = prevPlayersRef.current[p.id];
                if (p.is_bankrupt && prevP && !prevP.is_bankrupt) {
                    setBankruptPlayer(p);
                    soundManager.play('bankruptcy', 0.8);
                }
            });
            prevPlayersRef.current = gameState.players;
        }
    }, [gameState?.players]);

    // Automatic turn ending
    useEffect(() => {
        if (!isMyTurn || !hasRolled || diceRolling || showDice || showBuyModal || rentDetails || chanceCard || showCasinoModal || targetingAbility || showTradeModal || !!selectedTile || gameState?.turn_state?.auction_active) {
            return;
        }

        // If it's my turn and I've rolled and no mandatory actions are left, auto-end
        if (!isDoubles) {
            const timer = setTimeout(() => {
                handleEndTurn();
            }, 3000); // 3 second delay for reading the board
            return () => clearTimeout(timer);
        }
    }, [isMyTurn, hasRolled, diceRolling, showDice, showBuyModal, rentDetails, chanceCard, isDoubles, showCasinoModal, targetingAbility, showTradeModal, !!selectedTile]);

    // Trade States End

    // --- Handlers (Moved up to avoid TDZ) ---
    const handleEndTurn = () => {
        if (!isMyTurn) return;
        sendAction('END_TURN');
    };

    const handleSendMessage = (text) => {
        if (text.trim()) sendAction('CHAT', { message: text });
    };

    const handleAbility = (abilityType) => {
        if (!isMyTurn || !currentPlayer) return;
        if ((abilityType === 'WHO_AM_I' || abilityType === 'SHOW_OFF') && showWhoAmI) {
            setShowWhoAmI(false);
            return;
        }
        if (['ORESHNIK', 'BUYOUT', 'ISOLATION', 'SANCTIONS', 'TELEPORT', 'SEPTEMBER_11', 'CONSTRUCTION'].includes(abilityType)) {
            setTargetingAbility(abilityType);
        } else {
            sendAction('USE_ABILITY', { ability_type: abilityType });
        }
    };

    // Keep delayedPlayers synced when not animating a move
    useEffect(() => {
        // Prevent auto-sync if we are in the middle of a dice roll sequence (controlled by timeouts)
        const isDiceSequence = lastAction?.type === 'DICE_ROLLED';

        if (!isRolling && !diceRolling && !isDiceSequence && gameState?.players) {
            setDelayedPlayers(gameState.players);
        }
    }, [gameState?.players, isRolling, diceRolling, lastAction?.type]);

    // Targeting State

    const handleCloseOreshnik = React.useCallback(() => setShowOreshnik(false), []);
    const handleCloseSeptember11 = React.useCallback(() => setShowSeptember11(false), []);
    const handleCloseBuyout = React.useCallback(() => setShowBuyout(false), []);
    const handleCloseAid = React.useCallback(() => setShowAid(false), []);
    const handleCloseNuke = React.useCallback(() => setShowNuke(false), []);
    const handleCloseSanctions = React.useCallback(() => setShowSanctions(false), []);
    const handleCloseBeltRoad = React.useCallback(() => setShowBeltRoad(false), []);

    // Escape to cancel targeting
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && targetingAbility) {
                setTargetingAbility(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [targetingAbility]);

    const handleBuyProperty = () => {
        if (!isMyTurn || !currentPlayer) {
            console.warn("Cannot buy: not my turn or no player", { isMyTurn, currentPlayer });
            return;
        }
        console.log("Buying property at", currentPlayer.position);
        sendAction('BUY', { property_id: currentPlayer.position });
    };

    const handleDeclineProperty = () => {
        if (!isMyTurn || !currentPlayer) {
            console.warn("Cannot decline: not my turn or no player", { isMyTurn, currentPlayer });
            return;
        }
        console.log("Declining property at", currentPlayer.position);
        sendAction('DECLINE_PROPERTY');
    };

    const handleRaiseBid = () => {
        sendAction('RAISE_BID');
    };

    const handlePassAuction = () => {
        sendAction('PASS_AUCTION');
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

    const handleSync = () => {
        console.log("Manual Sync Triggered");
        sendAction('SYNC');
        // Force unlock UI locks that might be stuck
        setIsRolling(false);
        setDiceRolling(false);
        setShowDice(false);
        setHasRolled(!!gameState?.turn_state?.has_rolled);
    };


    // Timer
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

    // Auction Turn timer
    useEffect(() => {
        const auctionActive = gameState?.turn_state?.auction_active;
        const turnStartTime = gameState?.turn_state?.auction_turn_start_time;
        const turnDuration = gameState?.turn_state?.auction_turn_duration || 10;

        if (auctionActive && turnStartTime) {
            setShowAuctionModal(true);

            const interval = setInterval(() => {
                const elapsed = Date.now() / 1000 - turnStartTime;
                const remaining = Math.max(0, turnDuration - Math.floor(elapsed));
                setAuctionTimeLeft(remaining);

                if (remaining === 0) {
                    // Check if it's MY turn and auto-pass
                    const eligiblePlayers = gameState?.turn_state?.auction_eligible_players || [];
                    const currentIndex = gameState?.turn_state?.auction_current_player_index || 0;
                    const activePlayerId = eligiblePlayers[currentIndex];

                    if (activePlayerId === playerId) {
                        sendAction('PASS_AUCTION');
                        clearInterval(interval);
                    }
                }
            }, 1000);

            return () => clearInterval(interval);
        } else {
            setShowAuctionModal(false);
            setAuctionTimeLeft(turnDuration);
        }
    }, [gameState?.turn_state?.auction_active, gameState?.turn_state?.auction_turn_start_time, gameState?.turn_state?.auction_eligible_players, gameState?.turn_state?.auction_current_player_index, playerId]);


    const handleRoll = () => {
        if (!isMyTurn || isRolling) return;
        setIsRolling(true);
        setLastRollTime(Date.now());
        soundManager.play('roll');
        sendAction('ROLL');
    };

    // Safety Timeout: If rolling for more than 15 seconds, something is wrong.
    useEffect(() => {
        if (isRolling && lastRollTime > 0) {
            const timer = setTimeout(() => {
                const now = Date.now();
                if (now - lastRollTime > 15000) {
                    console.warn("Dice roll sequence took too long (>15s). Forcing unlock.");
                    setIsRolling(false);
                    setDiceRolling(false);
                    setShowDice(false);
                }
            }, 16000);
            return () => clearTimeout(timer);
        }
    }, [isRolling, lastRollTime]);


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

    // Auction state

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
            case 'SEPTEMBER_11': setShowSeptember11(true); break;
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
                    setDiceRolling(false);
                    setIsRolling(false);
                    setShowDice(false);
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

                // Phase 1: Rolling animation (3.5s tumble)
                setTimeout(() => {
                    setDiceRolling(false); // Stop spinning (Freeze on result)

                    // Phase 1.5: Short Pause to show dice result (0.7s) BEFORE moving
                    setTimeout(() => {
                        // Release logs now that dice have settled!
                        if (lastAction.game_state?.logs) {
                            setReleasedLogCount(lastAction.game_state.logs.length);
                        } else if (gameState?.logs) {
                            setReleasedLogCount(gameState.logs.length);
                        }

                        // Trigger movement
                        if (gameState?.players) {
                            setDelayedPlayers(gameState.players);
                        }

                        // Phase 2: Movement time (1.0s) then Land Events & Unlock UI
                        setTimeout(() => {
                            // UNLOCK UI: Movement is done, let them click 'Done' or other actions
                            setIsRolling(false);

                            // SYNC from the MOST UP TO DATE state we have
                            const serverState = lastAction.game_state?.turn_state || gameState?.turn_state;
                            if (lastAction.player_id === playerId && serverState) {
                                setHasRolled(!!serverState.has_rolled);
                                setIsDoubles(!!serverState.is_doubles);
                            }

                            // Handle land events (Modals)
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
                                if (lastAction.action === 'go_to_jail') {
                                    setHasRolled(true);
                                }
                                if (lastAction.can_buy && !showBuyModal) {
                                    setShowBuyModal(true);
                                    const landedPos = lastAction.game_state?.players?.[playerId]?.position;
                                    if (landedPos !== undefined && (lastAction.game_state?.board || gameState?.board)) {
                                        const board = lastAction.game_state?.board || gameState.board;
                                        setSelectedTile(board[landedPos]);
                                    }
                                }
                            }

                            // Phase 3: Display dice for a bit longer (1.2s) then hide
                            setTimeout(() => {
                                setShowDice(false);
                            }, 1200);

                        }, 1000); // 1.0s movement
                    }, 700); // 0.7s pause to read dice
                }, 3500); // 3.5s total tumble (matched with Cube duration)
                break;

            case 'PROPERTY_BOUGHT':
                soundManager.play('money');
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
                soundManager.play('click', 0.2);
                if (lastAction.player_id === playerId) {
                    setHasRolled(false);
                    setDiceRolling(false);
                    setIsRolling(false);
                }
                // Do NOT reset dice values or hide showDice immediately here to avoid jumps for others
                break;
            case 'ERROR':
                setIsRolling(false);
                setDiceRolling(false);
                setShowDice(false);
                if (lastAction.message) {
                    alert(`Внимание: ${lastAction.message}`);
                }
                break;
            case 'SYNC_RESPONSE':
                if (lastAction.game_state) {
                    setDelayedPlayers(lastAction.game_state.players);
                    if (isMyTurn && lastAction.game_state.turn_state) {
                        setHasRolled(!!lastAction.game_state.turn_state.has_rolled);
                        setIsDoubles(!!lastAction.game_state.turn_state.is_doubles);

                        // Sync rent/tax details
                        if (lastAction.game_state.turn_state.awaiting_payment) {
                            setRentDetails({
                                amount: lastAction.game_state.turn_state.awaiting_payment_amount,
                                ownerId: lastAction.game_state.turn_state.awaiting_payment_owner
                            });
                        } else {
                            setRentDetails(null);
                        }
                    }
                }
                break;
            case 'GAME_OVER': setShowVictory(true); break;
            case 'TRADE_OFFERED':
                if (lastAction.trade?.to_player_id === playerId) setIncomingTrade(lastAction.trade);
                break;
            case 'TRADE_UPDATED': setIncomingTrade(null); break;
            case 'CASINO_RESULT':
                // Close modal for everyone or at least the current player
                if (String(lastAction.player_id) === String(playerId)) {
                    setShowCasinoModal(false);
                    if (lastAction.skipped) {
                        // Just quiet close
                    } else if (lastAction.win) {
                        soundManager.play('success');
                        // Small delay to allow modal to close before alert
                        setTimeout(() => alert(`💰 КАЗИНО: Вы выиграли $${lastAction.amount}!`), 100);
                    } else {
                        soundManager.play('error');
                        setTimeout(() => alert(`🔥 КАЗИНО: Вы проиграли! В стране произошла РЕВОЛЮЦИЯ.`), 100);
                    }
                } else {
                    // For others, just ensure visual sync if needed
                }
                break;
            case 'TELEPORT':
                if (lastAction.player_id === playerId) {
                    const targetPos = lastAction.target_id;
                    if (targetPos !== undefined && (lastAction.game_state?.board || gameState?.board)) {
                        const board = lastAction.game_state?.board || gameState.board;
                        setSelectedTile(board[targetPos]);
                    }
                }
                break;
            case 'ORESHNIK':
                setShowOreshnik(true);
                break;
            case 'SEPTEMBER_11':
                setShowSeptember11(true);
                break;
            case 'BUYOUT':
                setAbilityTargetName(lastAction.target_name || '');
                setShowBuyout(true);
                break;
            case 'AID':
                setAbilityAmount(lastAction.amount_collected || 0);
                setShowAid(true);
                soundManager.play('money');
                break;
            case 'NUKE_THREAT':
                setShowNuke(true);
                break;
            case 'SANCTIONS':
                setAbilityTargetName(lastAction.target_name || '');
                setShowSanctions(true);
                break;
            case 'BELT_ROAD':
                setAbilityBonus(lastAction.total_bonus || 0);
                setShowBeltRoad(true);
                break;
            case 'ISOLATION':
                // Could add a small toast or sound for isolation if no specific full-screen animation exists
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
            // CRITICAL: Prevent sync from overwriting DURING a dice roll animation
            if (!diceRolling && !isRolling) {
                // Sync rent pending state
                if (gameState.turn_state.awaiting_payment && isMyTurn) {
                    setRentDetails({
                        amount: gameState.turn_state.awaiting_payment_amount,
                        ownerId: gameState.turn_state.awaiting_payment_owner
                    });
                } else {
                    setRentDetails(null);
                }

                // Sync roll status
                if (isMyTurn) {
                    const serverHasRolled = !!gameState.turn_state.has_rolled;
                    const serverIsDoubles = !!gameState.turn_state.is_doubles;

                    setHasRolled(serverHasRolled);
                    setIsDoubles(serverIsDoubles);
                }
            } else {
                // If we ARE rolling, but server says we haven't rolled (e.g. doubles re-roll or state reset), 
                // we should allow 'false' to propagate to reset the UI button state.
                if (isMyTurn && !gameState.turn_state.has_rolled && !diceRolling) {
                    setHasRolled(false);
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
            // For property-targeting abilities (ORESHNIK, BUYOUT, ISOLATION, TELEPORT, SEPTEMBER_11, CONSTRUCTION)
            if (['ORESHNIK', 'BUYOUT', 'ISOLATION', 'TELEPORT', 'SEPTEMBER_11', 'CONSTRUCTION'].includes(targetingAbility)) {
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
                className={`flex-shrink-0 bg-[#0c0c14] border-r border-white/10 flex flex-col z-[500] shadow-2xl relative ${isMobile ? 'absolute inset-y-0 left-0' : ''}`}
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
                <div className={`border-b border-white/10 bg-[#13131f] flex items-center justify-between transition-all ${sidebarCollapsed ? 'p-2 flex-col gap-3' : 'p-4'}`}>
                    <div className="flex items-center gap-2">
                        {!sidebarCollapsed && (
                            <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400">
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <button onClick={toggleFullScreen} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-500 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] transition-all hover:scale-110" title={isFullScreen ? "Свернуть" : "На весь экран"}>
                            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                        {/* Persistent Surrender Button */}

                    </div>

                    <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'flex-col w-full' : ''}`}>
                        <button onClick={() => copyToClipboard(gameId)} className={`flex flex-col ${sidebarCollapsed ? 'items-center w-full' : 'items-end'}`}>
                            {sidebarCollapsed ? <Copy size={16} className="text-blue-400 mb-1" /> : (
                                <>
                                    <span className="text-[9px] text-blue-500 font-bold tracking-widest uppercase">ID игры</span>
                                    <span className="text-sm font-mono font-bold text-blue-400">#{gameId.substring(0, 6)}</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleSync}
                            className={`p-1.5 rounded-lg hover:bg-white/10 text-gray-400 transition-colors ${sidebarCollapsed ? 'w-full flex justify-center' : ''}`}
                            title="Синхронизировать состояние"
                        >
                            <ArrowLeftRight size={16} className={isRolling ? 'animate-spin' : ''} />
                        </button>
                    </div>

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
                        title="Дополнительно"
                    >
                        <Folder size={16} className="text-yellow-400" />
                        {!sidebarCollapsed && <span className="font-bold text-gray-300">ДОПОЛНИТЕЛЬНО</span>}
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
                                    title="Статус дня"
                                >
                                    <span className="text-lg">🔮</span>
                                    {!sidebarCollapsed && <span>Статус дня</span>}
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

                {/* Fullscreen Button - Moved here */}
                <div className="px-3 py-2 border-t border-white/5">
                    <button
                        onClick={toggleFullScreen}
                        className="w-full py-2 flex items-center justify-center gap-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 transition-all hover:scale-[1.02]"
                        title={isFullScreen ? "Свернуть" : "На весь экран"}
                    >
                        {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        {!sidebarCollapsed && <span className="text-xs font-bold uppercase tracking-widest">{isFullScreen ? 'Свернуть' : 'На весь экран'}</span>}
                    </button>
                </div>

                {/* Sidebar Footer - Empty or Bottom padding */}
                <div className="p-1 pb-3">
                </div>
            </motion.div >

            {/* MAIN BOARD AREA */}
            {/* MAIN BOARD AREA */}
            < div className={`flex-1 relative bg-[#0c0c14] flex items-start justify-start overflow-hidden p-0 pb-20`}>
                {/* Background */}
                < div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#0c0c14_80%)] z-0 min-h-full" />

                <div className={`relative z-10 shadow-2xl flex-shrink-0`}
                    style={{
                        width: isMobile
                            ? '96vw'
                            : `min(92vh, calc(100vw - ${sidebarCollapsed ? '100px' : '360px'}), 850px)`,
                        aspectRatio: '1/1',
                        transform: !isMobile ? `scale(${boardScale})` : 'none',
                        transformOrigin: 'left top'
                    }}
                >
                    <Board
                        tiles={gameState.board}
                        players={delayedPlayers || gameState.players}
                        onTileClick={handleTileClick}
                        mapType={gameState.map_type}
                        currentPlayerId={playerId}
                        targetingAbility={targetingAbility}
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
                        playersPos={delayedPlayers || gameState.players}
                        turnNumber={gameState.turn_number}
                    />

                    {/* Chat relative to Board Center (Bottom) */}
                    <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-full max-w-[400px] z-[200] pointer-events-none">
                        <div className="pointer-events-auto">
                            <ToastNotification logs={displayedLogs} onSendMessage={(msg) => {
                                handleSendMessage(msg);
                                soundManager.play('click', 0.3);
                            }} />
                        </div>
                    </div>

                    {/* Main Overlays relative to Board Area */}
                    <div className="absolute inset-0 pointer-events-none z-[130]">
                        {/* Action Panel - CENTERED in Board Area */}
                        {!showTradeModal && !showCasinoModal && (
                            <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-auto z-[140] px-4 flex justify-center items-center w-full max-w-md ${isMobile ? 'bottom-24 scale-90' : 'top-[25%] -translate-y-1/2 scale-90'}`}>
                                <div className="bg-black/80 backdrop-blur-md rounded-2xl p-2 shadow-2xl border border-white/20 w-fit mx-auto">
                                    <ActionPanel
                                        onToggleSidebar={isMobile ? () => setSidebarCollapsed(!sidebarCollapsed) : null}
                                        isMyTurn={isMyTurn}
                                        isRolling={isRolling}
                                        hasRolled={hasRolled}
                                        onRoll={handleRoll}
                                        canBuy={canBuy}
                                        onBuy={handleBuyProperty}
                                        onDecline={handleDeclineProperty}
                                        onEndTurn={handleEndTurn}
                                        character={currentPlayer?.character}
                                        onAbility={handleAbility}
                                        currentTilePrice={currentTile?.price}
                                        currentTileName={currentTile?.name}

                                        gameMode={gameState.game_mode}
                                        isChatOpen={false}
                                        isChanceOpen={!!chanceCard}
                                        isDoubles={isDoubles}
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
                        )}

                        {/* Dice Animation - CENTERED in Board Area */}
                        <div className="absolute inset-0 z-[250] flex items-center justify-center">
                            <DiceAnimation
                                show={showDice}
                                rolling={diceRolling}
                                values={diceValues}
                                glow={diceValues[0] === diceValues[1]}
                                playerName={gameState?.players?.[rollingPlayerId]?.name || ''}
                                isMine={rollingPlayerId === playerId}
                            />
                        </div>
                    </div>
                </div>

                {/* Property Modal - Ensure High Z-Index & Centering in Board Area */}
                {gameState?.board && (
                    <div className="absolute inset-0 z-[300] flex items-center justify-center pointer-events-none">
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
                )}

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
                    <September11Animation
                        isVisible={showSeptember11}
                        onComplete={handleCloseSeptember11}
                    />
                </Suspense>
                <BuyoutAnimation isVisible={showBuyout} onComplete={handleCloseBuyout} targetProperty={abilityTargetName} />
                <AidAnimation isVisible={showAid} onComplete={handleCloseAid} amount={abilityAmount} />
                <NukeThreatAnimation isVisible={showNuke} onComplete={handleCloseNuke} />
                <SanctionsAnimation isVisible={showSanctions} onComplete={handleCloseSanctions} />
                <BeltRoadAnimation isVisible={showBeltRoad} onComplete={handleCloseBeltRoad} bonus={abilityBonus} />
                <BankruptcyAnimation
                    isVisible={!!bankruptPlayer}
                    playerName={bankruptPlayer?.name || ''}
                    onComplete={() => setBankruptPlayer(null)}
                />
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

            {/* Global Animations Layer */}
            <Suspense fallback={null}>
                {showWhoAmI && <WhoAmIAnimation isVisible={showWhoAmI} onClose={() => setShowWhoAmI(false)} />}
                {showOreshnik && <OreshnikAnimation onClose={handleCloseOreshnik} />}
                {showSeptember11 && <September11Animation isVisible={showSeptember11} onComplete={handleCloseSeptember11} />}
            </Suspense>

            {/* Removed redundant DiceAnimation as it was moved inside main area */}
            {
                showCasinoModal && (
                    <CasinoModal
                        onClose={() => setShowCasinoModal(false)}
                        onBet={(numbers) => sendAction('CASINO_BET', { bet_numbers: numbers })}
                        mapType={gameState?.map_type}
                    />
                )
            }

            {/* Auction Modal */}
            {showAuctionModal && gameState?.turn_state?.auction_property_id !== undefined && (
                <AuctionModal
                    isOpen={showAuctionModal}
                    property={gameState.board[gameState.turn_state.auction_property_id]}
                    currentBid={gameState.turn_state.auction_current_bid || 0}
                    currentBidderId={gameState.turn_state.auction_current_bidder}
                    activePlayerId={gameState.turn_state.auction_eligible_players?.[gameState.turn_state.auction_current_player_index]}
                    timeLeft={auctionTimeLeft}
                    onRaise={handleRaiseBid}
                    onPass={handlePassAuction}
                    currentPlayerId={playerId}
                    players={gameState.players || {}}
                />
            )}

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

            {/* Targeting Mode Overlay */}
            <AnimatePresence>
                {targetingAbility && (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-none"
                    >
                        <div className="bg-red-600/90 text-white px-6 py-3 rounded-full shadow-[0_0_30px_rgba(220,38,38,0.6)] backdrop-blur-md border border-red-400/50 font-bold uppercase tracking-widest flex items-center gap-4 pointer-events-auto">
                            <span className="flex items-center gap-2"><Crosshair className="animate-pulse" /> ВЫБЕРИТЕ ЦЕЛЬ</span>
                            <button
                                onClick={() => setTargetingAbility(null)}
                                className="bg-black/20 hover:bg-black/40 rounded-full p-1 transition-colors"
                            >
                                <X size={16} />
                            </button>
                            <span className="text-[10px] opacity-70 border-l border-white/20 pl-4 ml-2">ESC ОТМЕНА</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default GameRoom;
