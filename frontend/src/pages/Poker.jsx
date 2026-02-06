import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle, Play, Maximize2, Minimize2, Bot, Trash2, Coins, Lightbulb, LightbulbOff } from 'lucide-react';

const PokerTable = ({ tableId, onLeave, autoBuyIn, balance, refreshBalance }) => {
    const [gameState, setGameState] = useState(null);
    const [socket, setSocket] = useState(null);
    const [betAmount, setBetAmount] = useState(0);
    const [connected, setConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showBuyIn, setShowBuyIn] = useState(false);
    const [buyInAmount, setBuyInAmount] = useState(1000);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [winnerAnim, setWinnerAnim] = useState(null);
    const [myId, setMyId] = useState(null);
    const [preAction, setPreAction] = useState(null); // 'CHECK', 'FOLD', 'CALL', or 'RAISE'
    const [isDealing, setIsDealing] = useState(false); // New: prevents action buttons before cards
    const [preActionAmount, setPreActionAmount] = useState(0);
    const [preActionCallAmount, setPreActionCallAmount] = useState(0); // Track specific call amount
    const [tick, setTick] = useState(0);
    const [dealerImageIdx, setDealerImageIdx] = useState(0);
    const dealerImages = ['/assets/croupier.png', '/assets/dealer.png', '/assets/dealer_megan.png', '/assets/dealer_zhirinovsky.png'];

    const [isChatVisible, setIsChatVisible] = useState(true);
    const [isChatPinned, setIsChatPinned] = useState(false);
    const [isChatExpanded, setIsChatExpanded] = useState(false);
    const [isActionPanelHovered, setIsActionPanelHovered] = useState(false);
    const [gameError, setGameError] = useState(null);
    const [showStandUpConfirm, setShowStandUpConfirm] = useState(false);
    const [raiseAnims, setRaiseAnims] = useState({});
    const prevSeatsRef = useRef({});

    // Detect Raises for Animation
    useEffect(() => {
        if (!gameState) return;
        const newAnims = { ...raiseAnims };
        let hasNewUpdates = false;

        Object.keys(gameState.seats).forEach(seatIdx => {
            const player = gameState.seats[seatIdx];
            const prevPlayer = prevSeatsRef.current[seatIdx];

            if (player && player.last_action && player.last_action.startsWith('RAISE')) {
                if (!prevPlayer || prevPlayer.last_action !== player.last_action) {
                    newAnims[seatIdx] = true;
                    hasNewUpdates = true;
                    setTimeout(() => {
                        setRaiseAnims(prev => ({ ...prev, [seatIdx]: false }));
                    }, 2000);
                }
            }
        });

        if (hasNewUpdates) {
            setRaiseAnims(newAnims);
        }
        prevSeatsRef.current = gameState.seats;
    }, [gameState?.seats]);
    const tableRef = useRef(null);
    const socketRef = useRef(null);
    const myHandRef = useRef(null); // Persistence for my cards

    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin);
    const wsBase = API_BASE.replace('http', 'ws');

    // --- Derived State ---
    const mySeatEntry = gameState?.seats ? Object.entries(gameState.seats).find(([_, p]) => p.user_id === (myId || gameState.me?.user_id)) : null;
    const mySeatIdx = mySeatEntry ? parseInt(mySeatEntry[0]) : -1;
    const myPlayer = mySeatEntry ? mySeatEntry[1] : (gameState?.me || null);

    const minRaiseAmount = React.useMemo(() => {
        if (!gameState || !gameState.limits) return 0;
        const bb = gameState.limits.bb || 0;
        const currentBet = gameState.current_bet || 0;
        const minIncrement = gameState.min_raise || bb;
        return currentBet + minIncrement;
    }, [gameState?.current_bet, gameState?.min_raise, gameState?.limits?.bb]);

    // --- Handlers ---
    const sendAction = (action, data = {}) => {
        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action, ...data }));
            if (['FOLD', 'CHECK', 'CALL', 'RAISE'].includes(action)) {
                setPreAction(null);
                setPreActionAmount(0);
            }
        }
    };

    const handleBuyInConfirm = () => {
        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'JOIN',
                buy_in: buyInAmount,
                requested_seat: selectedSeat
            }));
            setShowBuyIn(false);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            tableRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (gameState?.current_player_seat === mySeatIdx && myPlayer) {
            if (betAmount < minRaiseAmount) {
                setBetAmount(minRaiseAmount);
            }
        }
    }, [gameState?.current_player_seat, minRaiseAmount, mySeatIdx, myPlayer]);

    // Timer ticker
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (gameState?.state === "SHOWDOWN" && gameState?.winners_ids?.length > 0 && !winnerAnim) {
            setWinnerAnim(gameState.winners_ids);
            // Hide after 5 seconds or when hand resets
            const t = setTimeout(() => setWinnerAnim(null), 6000);
            return () => clearTimeout(t);
        }
        if (gameState?.state === "WAITING" || gameState?.state === "PREFLOP") {
            setWinnerAnim(null);
        }
    }, [gameState?.winners_ids, gameState?.state]);

    // Street change effect - for dealing animation and pre-action clearing
    const prevStreet = useRef(gameState?.state);
    useEffect(() => {
        if (gameState?.state && gameState.state !== prevStreet.current) {
            if (gameState.state !== 'WAITING') {
                setIsDealing(true);
                setTimeout(() => setIsDealing(false), 800); // Wait for cards to fly
            }
            setPreAction(null);
            setPreActionAmount(0);
            prevStreet.current = gameState.state;
        }
    }, [gameState?.state]);

    // Chat auto-fade logic

    // Error auto-clear logic
    useEffect(() => {
        if (gameError) {
            const timer = setTimeout(() => setGameError(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [gameError]);

    useEffect(() => {
        // Auto-heal: If I see '?' in my own hand during active play, ask for refresh
        if (gameState?.me?.hand && gameState.me.hand.length > 0 && gameState.me.hand[0].rank === '?') {
            if (gameState.state !== 'WAITING' && gameState.state !== 'SHOWDOWN') {
                console.log("Detected '?' in hand, requesting refresh...");
                sendAction('REFRESH_HAND');
            }
        }
    }, [gameState?.me?.hand, gameState?.state]);

    useEffect(() => {
        const token = localStorage.getItem('monopoly_token');
        const ws = new WebSocket(`${wsBase}/ws/poker/${tableId}?token=${token}`);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Poker Table');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') {
                const state = data.state;
                // Capture initial hand if present
                if (state.me && state.me.hand && state.me.hand.length && state.me.hand[0].rank !== '?') {
                    myHandRef.current = state.me.hand;
                }
                setGameState(state);
                if (data.your_id) setMyId(data.your_id);
            } else if (data.type === 'GAME_UPDATE') {
                setGameState(prev => {
                    const newState = { ...prev, ...data.state };

                    // Detect New Round (PREFLOP transition) to clear stale hand persistence
                    const isNewRound = data.state.state === 'PREFLOP' && prev?.state !== 'PREFLOP';
                    if (isNewRound) {
                        myHandRef.current = null;
                        // Force refresh immediately to ensure cards appear if HAND_UPDATE raced
                        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                            socketRef.current.send(JSON.stringify({ action: 'REFRESH_HAND' }));
                        }
                    }

                    if (prev && prev.me) {
                        newState.me = prev.me;
                        // If new round, force clear 'me.hand' so we don't carry over old cards.
                        // We set it to the incoming seat's hand (likely '?'s) to trigger auto-heal or wait for HAND_UPDATE
                        if (isNewRound) {
                            const myUserId = prev.me.user_id;
                            const mySeatKey = Object.keys(newState.seats || {}).find(k => newState.seats[k].user_id === myUserId);
                            if (mySeatKey && newState.seats[mySeatKey]) {
                                newState.me = { ...newState.me, hand: newState.seats[mySeatKey].hand };
                            } else {
                                newState.me = { ...newState.me, hand: null };
                            }
                        }
                    }

                    // Robust Hand Persistence using Ref
                    if (newState.me && newState.seats) {
                        const myUserId = newState.me.user_id;
                        const mySeatKey = Object.keys(newState.seats).find(k => newState.seats[k].user_id === myUserId);

                        // If we have a stored hand, apply it if the update tries to hide it
                        // BUT: If it's a new round (isNewRound), we deliberately cleared ref, so we won't restore old cards
                        if (mySeatKey && myHandRef.current) {
                            const incomingHand = newState.seats[mySeatKey].hand;
                            const isHidden = !incomingHand || incomingHand.length === 0 || (incomingHand[0] && incomingHand[0].rank === '?');

                            if (isHidden) {
                                // Restore from ref
                                newState.seats[mySeatKey].hand = myHandRef.current;
                                // Also sync 'me'
                                if (newState.me) newState.me.hand = myHandRef.current;
                            } else {
                                // Incoming is real? Update ref (e.g. at Showdown)
                                if (incomingHand && incomingHand.length > 0 && incomingHand[0].rank !== '?') {
                                    myHandRef.current = incomingHand;
                                }
                            }
                        }
                    }

                    if (prev && prev.seats && newState.seats) {
                        if (Object.keys(prev.seats).length !== Object.keys(newState.seats).length) {
                            if (typeof refreshBalance === 'function') refreshBalance();
                        }
                    }
                    return newState;
                });
            } else if (data.type === 'HAND_UPDATE') {
                // Update Ref immediately
                if (data.hand && data.hand.length && data.hand[0].rank !== '?') {
                    myHandRef.current = data.hand;
                }

                setGameState(prev => {
                    if (!prev) return prev;
                    const myUserId = myId || prev.me?.user_id;
                    if (!myUserId) return prev;
                    const mySeatKey = Object.keys(prev.seats).find(k => prev.seats[k].user_id === myUserId);
                    const newMe = { ...(prev.me || { user_id: myUserId }), hand: data.hand };

                    if (data.evaluation) {
                        newMe.current_hand = data.evaluation;
                    }

                    const newSeats = { ...prev.seats };
                    if (mySeatKey) {
                        newSeats[mySeatKey] = { ...newSeats[mySeatKey], hand: data.hand };
                        if (data.evaluation) {
                            newSeats[mySeatKey].current_hand = data.evaluation;
                        }
                    }
                    return { ...prev, me: newMe, seats: newSeats };
                });
            } else if (data.type === 'ERROR') {
                setGameError(data.message);
                setPreAction(null);
            }
        };

        ws.onclose = () => {
            setConnected(false);
            socketRef.current = null;
        };

        return () => ws.close();
    }, [tableId, refreshBalance]);

    // Handle Pre-actions separately without reconnecting WS
    useEffect(() => {
        if (!gameState || !preAction || gameState.current_player_seat !== mySeatIdx) return;

        const myPlayerNow = gameState.seats[mySeatIdx.toString()];
        if (!myPlayerNow || myPlayerNow.is_folded) {
            setPreAction(null);
            return;
        }

        if (preAction === 'FOLD') {
            setTimeout(() => sendAction('FOLD'), 100);
            setPreAction(null);
            setPreActionAmount(0);
        } else if (preAction === 'CHECK') {
            if (gameState.current_bet === (myPlayerNow.current_bet || 0)) {
                setTimeout(() => sendAction('CHECK'), 50);
            } else {
                // Check/Fold logic: If we can't check, we fold?
                // The button says "Check/Fold", so usually yes.
                // But let's act safe and just clear, unless user expectations of "Check/Fold" are strict.
                // User asked for specific "Call" behavior reset.
                setPreAction(null);
            }
            setPreAction(null);
            setPreActionAmount(0);
        } else if (preAction === 'CALL') {
            // CALL specific amount
            if (gameState.current_bet !== preActionCallAmount) {
                // Bet changed! Reset pre-action.
                setPreAction(null);
                setPreActionCallAmount(0);
                setGameError("Bet changed - Call reset");
            } else {
                setTimeout(() => sendAction('CALL'), 50);
                setPreAction(null);
                setPreActionCallAmount(0);
            }
        } else if (preAction === 'RAISE') {
            if (gameState.current_bet < preActionAmount) {
                setTimeout(() => sendAction('RAISE', { amount: preActionAmount }), 50);
            } else {
                setGameError("Raise amount too small");
            }
            setPreAction(null);
            setPreActionAmount(0);
        }
    }, [gameState?.current_player_seat, preAction, mySeatIdx, gameState?.current_bet, preActionCallAmount]);


    if (!gameState) return <div className="text-center p-10 text-white">Loading Table...</div>;


    const isWinningCard = (card) => {
        if (!card) return false;

        // Priority 1: Showdown Winning Cards (Server dictated for the round winner)
        if (gameState.state === 'SHOWDOWN' && gameState.winning_cards?.length > 0) {
            return gameState.winning_cards.some(c => c.rank === card.rank && c.suit === card.suit);
        }

        // Check if highlighting is enabled
        if (!highlightEnabled) return false;

        // Priority 2: My Current Best Hand Helper (Highlight my combo during play)
        if (gameState.me?.current_hand?.best_cards?.length > 0) {
            const currentHand = gameState.me.current_hand;
            const rank = currentHand.rank;
            const bestCards = currentHand.best_cards;

            // If Playing the Board (High Card/Pair etc exclusively on board), don't highlight board unless requested.
            // User asked: "only those cards which are in combination with the player's hand (only his)"

            // 1. Identify "Core" ranks based on hand type
            //    (Exclude kickers from being considered "in combination")
            let targetRanks = new Set();

            if (rank === 0) {
                // High Card: Core is just the 1 high card
                targetRanks.add(bestCards[0].rank);
            } else if (rank === 1 || rank === 3 || rank === 7) {
                // Pair, Trips, Quads: Find the rank that repeats
                const counts = {};
                bestCards.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
                Object.entries(counts).forEach(([r, count]) => {
                    if (count >= 2) targetRanks.add(r);
                });
            } else if (rank === 2) {
                // Two Pair
                const counts = {};
                bestCards.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
                Object.entries(counts).forEach(([r, count]) => {
                    if (count >= 2) targetRanks.add(r);
                });
            } else {
                // Straight, Flush, Full House, Straight Flush: All 5 cards are core
                // For these, we highlight all best_cards IF we contribute.
                // Full House is effectively Trips + Pair, both are core.
            }

            // 2. Check if MY HAND holds any of these target ranks (or any card for straight/flush)
            const myHoleCards = gameState.me.hand || [];

            let shouldHighlight = false;

            if (rank >= 4 && rank !== 7) {
                // Straights, Flushes, Full Houses
                // Highlight if ANY of my cards are part of the 5-card combo
                const amIContributing = bestCards.some(bc =>
                    myHoleCards.some(hc => hc.rank === bc.rank && hc.suit === bc.suit)
                );
                if (amIContributing) shouldHighlight = true;

            } else {
                // Pairs/Trips/Quads/HighCard
                // Highlight ONLY if I hold one of the target ranks
                const amIContributing = myHoleCards.some(hc => targetRanks.has(hc.rank));
                if (amIContributing) shouldHighlight = true;
            }

            if (!shouldHighlight) return false;

            // 3. Final Filter: Only highlight the specific core cards
            // If straight/flush, highlight all best cards.
            // If pair/trips, highlight only the matching ranks.

            if (rank >= 4 && rank !== 7) {
                return bestCards.some(c => c.rank === card.rank && c.suit === card.suit);
            } else {
                // Only highlight if this card's rank is in targetRanks AND it is part of bestCards
                // (e.g. don't highlight a 3rd pair on board if it's not in best hand, though backend filters best_cards already)
                if (!targetRanks.has(card.rank)) return false;
                return bestCards.some(c => c.rank === card.rank && c.suit === card.suit);
            }
        }

        return false;
    };

    const renderCard = (card, i) => {
        const winning = isWinningCard(card);
        const glowClass = winning ? "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.8)] z-50 scale-105" : "";

        if (!card) return <div className="w-10 h-14 bg-blue-900 border border-blue-500 rounded m-1"></div>;

        // Card Back Styles based on Dealer
        const getCardBackClass = () => {
            const backs = [
                'bg-gradient-to-br from-blue-600 to-blue-900 border-blue-400', // Classic Blue
                'bg-gradient-to-br from-red-600 to-red-900 border-red-400',     // Classic Red
                'bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-800 border-purple-400', // Megan
                'bg-gradient-to-br from-white via-blue-600 to-red-600 border-yellow-400' // Zhirinovsky (Flag Style)
            ];
            return backs[dealerImageIdx % backs.length] || backs[0];
        };

        const backPattern = (
            <div className="absolute inset-2 border-2 border-dashed border-white/20 rounded-sm opacity-50 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white/10"></div>
            </div>
        );

        // Error / Hidden Card Recovery (Render as Card Back)
        if (card.rank === '?') return (
            <div
                onClick={(e) => {
                    e.stopPropagation(); // Prevent bubbling 
                    sendAction('REFRESH_HAND');
                    // Visual feedback
                    e.target.style.transform = 'scale(0.95)';
                    setTimeout(() => e.target.style.transform = 'scale(1)', 100);
                }}
                className={`w-10 h-14 rounded m-1 flex items-center justify-center shadow-md cursor-pointer hover:brightness-110 transition-all relative overflow-hidden border ${getCardBackClass()}`}
                title="Click to refresh info"
            >
                {backPattern}
                {/* Small indicator it's unknown/hidden if needed, or just opaque back */}
            </div>
        );

        const isRed = ['♥', '♦'].includes(card.suit);
        return (
            <div
                className={`w-12 h-16 bg-white ${isRed ? 'text-red-600' : 'text-black'} rounded m-1 flex flex-col items-center justify-center font-bold text-lg shadow-lg border border-gray-300 ${glowClass} transition-all duration-300`}
                style={{
                    animation: `dealCard 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards`,
                    animationDelay: `${i * 100}ms`
                }}
            >
                <div>{card.rank}</div>
                <div className="text-xl leading-none">{card.suit}</div>
            </div>
        );
    };

    const ChipStack = ({ amount, isPot = false, showLabel = true }) => {
        if (!amount || amount <= 0) return null;

        // Colors for denominations
        // 1-99: White/Silver
        // 100-499: Red
        // 500-999: Blue
        // 1000+: Yellow/Gold
        let bgColor = "bg-gray-300";
        let borderColor = "border-gray-400";
        let textColor = "text-black";

        if (amount >= 1000) {
            bgColor = "bg-yellow-500";
            borderColor = "border-yellow-600";
        } else if (amount >= 500) {
            bgColor = "bg-blue-600";
            borderColor = "border-blue-700";
            textColor = "text-white";
        } else if (amount >= 100) {
            bgColor = "bg-red-600";
            borderColor = "border-red-700";
            textColor = "text-white";
        }

        const formatted = amount >= 1000 ? (amount / 1000).toFixed(1) + 'k' : amount;
        const scale = isPot ? 'scale-125' : 'scale-100';

        return (
            <div className={`flex flex-col items-center group relative z-40 ${scale}`}>
                <div className="relative w-9 h-9 cursor-pointer transform hover:scale-110 transition-transform">
                    {/* Simulated Stack - 3 chips */}
                    <div className={`absolute top-0 left-0 w-full h-full rounded-full ${bgColor} border-2 ${borderColor} shadow-lg`}></div>
                    <div className={`absolute -top-1 left-0 w-full h-full rounded-full ${bgColor} border-2 ${borderColor} shadow-md`}></div>
                    <div className={`absolute -top-1.5 left-0 w-full h-full rounded-full ${bgColor} border-2 ${borderColor} shadow-inner flex items-center justify-center`}>
                        <div className={`w-6 h-6 rounded-full border border-white/30 border-dashed ${textColor} text-[10px] font-black flex items-center justify-center font-mono`}>
                            $
                        </div>
                    </div>
                </div>
                {/* Tooltip Value */}
                {showLabel && (
                    <div className="bg-black/90 text-yellow-400 text-xs font-mono font-black px-2 py-0.5 rounded mt-0.5 border border-yellow-500/50 shadow-md backdrop-blur-sm z-50 whitespace-nowrap">
                        ${formatted}
                    </div>
                )}
            </div>
        );
    };

    const getTimeRemaining = () => {
        if (!gameState.turn_deadline) return 0;
        const total = Date.parse(gameState.turn_deadline) - Date.now();
        return Math.max(0, Math.floor(total / 1000));
    };

    // Rotating table so "Me" is at the bottom (pos 0)
    // Physical positions: [0, 1, 2, 3, 5, 6, 7] (4 is reserved for Dealer)
    const getSeatPosition = (serverSeatIdx) => {
        const physicalPositions = [0, 1, 2, 3, 5, 6, 7]; // Fixed anchor points
        const serverSeats = [0, 1, 2, 3, 5, 6, 7]; // Valid seats from backend

        let relativePos = 0;
        if (mySeatIdx !== -1) {
            // Find my index in the valid seats array
            const mySeatInSequence = serverSeats.indexOf(mySeatIdx);
            const playerSeatInSequence = serverSeats.indexOf(serverSeatIdx);

            // Rotate the physical spot based on the sequence
            const relativeSequenceIdx = (playerSeatInSequence - mySeatInSequence + 7) % 7;
            relativePos = physicalPositions[relativeSequenceIdx];
        } else {
            // Spectator mode: just use the map directly or map to physical spots
            const idx = serverSeats.indexOf(serverSeatIdx);
            relativePos = physicalPositions[idx % 7];
        }

        const styles = {
            0: { bottom: '0px', left: '50%', transform: 'translateX(-50%)' }, // ME (Bottom Edge)
            1: { bottom: '5%', left: '12%' }, // Bottom Left
            2: { top: '55%', left: '-35px', transform: 'translateY(-50%)' }, // Left
            3: { top: '15%', left: '10%' }, // Top Left
            4: { top: '-20px', left: '50%', transform: 'translateX(-50%)' }, // Dealer Spot
            5: { top: '15%', right: '10%' }, // Top Right
            6: { top: '55%', right: '-35px', transform: 'translateY(-50%)' }, // Right
            7: { bottom: '5%', right: '12%' } // Bottom Right
        };

        return styles[relativePos] || { display: 'none' };
    };

    return (
        <div ref={tableRef} className="flex flex-col h-full w-full max-w-7xl mx-auto glass-card p-4 relative bg-[#0f172a] overflow-hidden select-none">
            <style>{`
                @keyframes dealCard {
                    0% { transform: translateY(-300px) translateX(calc(50% - 50vw)) rotate(45deg) scale(0); opacity: 0; }
                    60% { opacity: 1; }
                    100% { transform: translateY(0) translateX(0) rotate(0) scale(1); opacity: 1; }
                }
                @keyframes winnerFlow {
                    0% { transform: translate(-50%, -50%) scale(0); top: 50%; left: 50%; opacity: 0; }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.5); top: 50%; left: 50%; }
                    80% { opacity: 1; transform: scale(1.2); }
                    100% { opacity: 0; transform: scale(1); }
                }
                @keyframes chipWin {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.8; top: -50px; }
                    100% { transform: scale(0.5); opacity: 0; top: -200px; left: 0; }
                }
                @keyframes raisePop {
                    0% { opacity: 0; transform: scale(0.5) translateY(20px); }
                    20% { opacity: 1; transform: scale(1.2) translateY(-20px); }
                    80% { opacity: 1; transform: scale(1.1) translateY(-30px); }
                    100% { opacity: 0; transform: scale(1) translateY(-50px); }
                }
                .winning-chips {
                    animation: chipWin 1.5s ease-out forwards;
                }
                .raise-anim {
                    animation: raisePop 2s ease-out forwards;
                }
            `}</style>
            {/* Top Bar */}
            <div className="flex justify-between items-center z-10 text-white">
                <button onClick={() => { sendAction('LEAVE'); onLeave(); }} className="btn-ghost text-sm flex items-center gap-1">
                    <ArrowLeft size={16} /> Leave
                </button>
                <div className="text-center">
                    {/* Hiding Table Name and Blinds as requested */}
                </div>
                <div className="flex gap-2">
                    {/* Highlight Toggle */}
                    <button
                        onClick={() => setHighlightEnabled(!highlightEnabled)}
                        className={`btn-xs border border-white/20 p-1 rounded hover:bg-white/10 flex items-center gap-1 ${highlightEnabled ? 'text-yellow-400' : 'text-gray-500'}`}
                        title={highlightEnabled ? "Hints On" : "Hints Off"}
                    >
                        {highlightEnabled ? <Lightbulb size={16} /> : <LightbulbOff size={16} />}
                    </button>

                    <div className="bg-black/50 border border-white/10 px-2 py-1 rounded flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 uppercase">Wallet</span>
                        <span className="text-sm font-bold text-yellow-500">${balance}</span>
                    </div>
                    <button onClick={() => sendAction('ADD_BOT')} className="btn-xs border border-white/20 p-1 rounded hover:bg-white/10 ml-2" title="Add Bot">
                        <Bot size={16} />
                    </button>
                    <button onClick={() => sendAction('REMOVE_BOT')} className="btn-xs border border-white/20 p-1 rounded hover:bg-white/10" title="Remove Bot">
                        <Trash2 size={16} />
                    </button>
                    <button onClick={toggleFullscreen} className="btn-ghost p-1">
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                </div>
            </div>

            {/* Chat / LOGS */}
            <div
                className={`absolute bottom-4 left-4 z-50 transition-all duration-700 ${(isChatVisible || isChatPinned) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                    } hover:opacity-100 hover:translate-y-0 hover:pointer-events-auto cursor-pointer`}
                onMouseEnter={() => setIsChatVisible(true)}
                onClick={() => setIsChatExpanded(!isChatExpanded)}
            >
                <div className={`w-80 ${isChatExpanded ? 'max-h-[60vh]' : 'max-h-24'} overflow-y-auto font-mono text-[10px] text-gray-400 bg-black/80 p-3 rounded-xl border border-white/10 shadow-2xl flex flex-col-reverse backdrop-blur-md transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-1 border-b border-white/5 pb-1">
                        <span className="text-[9px] uppercase font-bold text-yellow-500/80">
                            {isChatExpanded ? 'Full Game Log' : 'Game Log (Click to expand)'}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsChatPinned(!isChatPinned); }}
                            className={`text-[9px] px-2 py-0.5 rounded transition-colors ${isChatPinned ? 'bg-yellow-500 text-black font-bold' : 'bg-white/10 text-gray-400'}`}
                        >
                            {isChatPinned ? 'Pinned' : 'Pin'}
                        </button>
                    </div>
                    {gameState.logs && gameState.logs.slice().reverse().map((log, i) => (
                        <div key={i} className="mb-0.5 break-words transition-opacity duration-1000" style={{ opacity: isChatExpanded ? 1 : Math.max(0.3, 1 - (i * 0.15)) }}>
                            <span className="text-gray-600">[{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
                            <span className={log.msg.toLowerCase().includes('wins') ? "font-black text-yellow-500 drop-shadow-md text-sm" : "text-gray-300"}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hidden Chat Trigger (if hidden) */}
            {!isChatVisible && !isChatPinned && (
                <button
                    onClick={() => setIsChatVisible(true)}
                    className="absolute bottom-4 left-4 z-[45] bg-black/40 hover:bg-black/60 text-white/40 hover:text-white px-3 py-1 rounded-full text-[10px] font-bold border border-white/5 transition-all flex items-center gap-2"
                >
                    <Users size={12} /> Show Chat
                </button>
            )}

            {/* Table Area */}
            <div className="flex-1 relative my-4 flex items-center justify-center perspective-1000">

                {/* Dealer Avatar - Close Up */}
                <div
                    onClick={() => setDealerImageIdx(prev => (prev + 1) % dealerImages.length)}
                    className="absolute top-[-2%] left-1/2 transform -translate-x-1/2 z-[5] flex flex-col items-center opacity-95 transition-all duration-1000 hover:scale-105 cursor-pointer active:scale-95"
                >
                    <div className="relative w-48 h-48 rounded-full border-4 border-yellow-500/40 bg-black overflow-hidden shadow-[0_0_80px_rgba(234,179,8,0.3)] group">
                        <img
                            src={dealerImages[dealerImageIdx]}
                            className={`w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-110 ${dealerImages[dealerImageIdx].includes('zhirinovsky') ? 'animate-aggressive-breathing' : ''}`}
                            alt="Dealer"
                            onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    </div>
                    <div className="bg-black/80 backdrop-blur-xl px-6 py-1.5 rounded-full border-2 border-yellow-500/50 shadow-2xl -mt-8 z-10 scale-110">
                        <span className="text-sm font-black text-yellow-500 uppercase tracking-[0.4em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">The Dealer</span>
                    </div>
                </div>

                {/* Felt */}
                <div className="w-[90%] aspect-[2/1] bg-[#1a472a] rounded-[200px] border-[16px] border-[#2d2a26] shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] relative flex items-center justify-center z-0">

                    {/* Center Start Button */}
                    {gameState.state === 'WAITING' && (
                        <div className="absolute z-40 flex flex-col items-center justify-center gap-4">
                            {Object.keys(gameState.seats).length >= 2 ? (
                                <button onClick={() => sendAction('START')} className="group relative px-8 py-4 bg-red-600 rounded-full font-bold text-2xl text-white shadow-[0_0_50px_rgba(220,38,38,0.5)] hover:scale-110 transition-transform overflow-hidden border-4 border-red-800">
                                    <span className="relative z-10 flex items-center gap-2">START GAME <Play fill="white" /></span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </button>
                            ) : (
                                <div className="text-white text-xl font-bold bg-black/60 px-6 py-2 rounded-full border border-white/10 animate-pulse">
                                    Waiting for players...
                                </div>
                            )}
                        </div>
                    )}

                    {/* Community Cards */}
                    <div className="absolute top-[35%] flex gap-3 z-10">
                        {gameState.community_cards.map((c, i) => <div key={i}>{renderCard(c, i)}</div>)}
                        {Array(5 - gameState.community_cards.length).fill(0).map((_, i) => (
                            <div key={i} className="w-12 h-16 border-2 border-white/5 rounded m-1 bg-black/20"></div>
                        ))}
                    </div>

                    {/* Pot Display */}
                    <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center">
                        <ChipStack amount={gameState.pot} isPot={true} showLabel={true} />
                    </div>

                    {/* Seats (0-7, excluding 4 reserved for Dealer) */}
                    {[0, 1, 2, 3, 5, 6, 7].map(seatIdx => {
                        const player = gameState.seats[seatIdx];
                        const isActive = gameState.current_player_seat === seatIdx;
                        const posStyle = getSeatPosition(seatIdx);

                        // Calculate Blind Badges
                        const activeSeatKeys = Object.keys(gameState.seats).map(Number).sort((a, b) => a - b);
                        const dealerIdx = activeSeatKeys.indexOf(gameState.dealer_seat);
                        const sbSeat = dealerIdx !== -1 ? activeSeatKeys[(dealerIdx + 1) % activeSeatKeys.length] : -1;
                        const bbSeat = dealerIdx !== -1 ? activeSeatKeys[(dealerIdx + 2) % activeSeatKeys.length] : -1;

                        const isSB = seatIdx === sbSeat && gameState.state !== 'WAITING';
                        const isBB = seatIdx === bbSeat && gameState.state !== 'WAITING';

                        const isMe = player?.user_id === gameState.me?.user_id;

                        // Calculate Physical Position for Chip Logic
                        // Reuse logic from getSeatPosition (simplified)
                        const physicalPositions = [0, 1, 2, 3, 5, 6, 7];
                        const serverSeats = [0, 1, 2, 3, 5, 6, 7];
                        let relativePos = 0;
                        if (mySeatIdx !== -1) {
                            const mySeatInSequence = serverSeats.indexOf(mySeatIdx);
                            const playerSeatInSequence = serverSeats.indexOf(seatIdx);
                            const relativeSequenceIdx = (playerSeatInSequence - mySeatInSequence + 7) % 7;
                            relativePos = physicalPositions[relativeSequenceIdx];
                        } else {
                            const idx = serverSeats.indexOf(seatIdx);
                            relativePos = physicalPositions[idx % 7];
                        }

                        const isRightSide = [5, 6, 7].includes(relativePos);

                        // Chip Positioning Logic
                        // Me (0): Top-Left (custom)
                        // Right Side (5,6,7): Left of avatar
                        // Left Side (1,2,3): Right of avatar
                        let chipPosClass = "-top-12 -right-16"; // Default (Left side players)
                        if (isMe) {
                            chipPosClass = "-top-16 left-0";
                        } else if (isRightSide) {
                            chipPosClass = "-top-12 -left-16"; // Push to left (towards center)
                        }

                        return (
                            <div key={seatIdx} className={`absolute flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110 z-30' : 'z-20'}`} style={posStyle}>
                                {player ? (
                                    <div className={`flex items-center group relative ${isMe ? 'flex-row gap-4 items-end' : 'flex-col'}`}>
                                        {/* Timer / Active Indicator */}
                                        {isActive && (
                                            <>
                                                <div className="absolute w-[120%] h-[120%] -top-[10%] -left-[10%] border-4 border-yellow-500 rounded-full animate-pulse z-0 hidden"></div>
                                                {/* Hidden Pulse for ME in row mode is tricky, relying on avatar border mostly */}

                                                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full z-50 shadow-lg border-2 border-white whitespace-nowrap">
                                                    {getTimeRemaining()}s
                                                </div>
                                            </>
                                        )}

                                        {/* 1. Avatar & Info Group (Order 1 for ME, Order 2 for Others effectively by DOM order if we swap) */}
                                        {/* For ME: we want Avatar Left, Cards Right. 
                                            For Others: Cards Top, Avatar Bottom.
                                            We will use standard DOM order: Cards, then Avatar group.
                                            For ME: flex-row => Cards Left, Avatar Right? No, user wants Cards Right.
                                            So for ME: flex-row. We place Cards SECOND in DOM, or use 'order' classes.
                                            Let's use 'order' classes to keep logic simple.
                                        */}

                                        {/* Avatar + Info Container */}
                                        <div className={`flex flex-col items-center relative z-20 ${isMe ? 'order-1' : 'order-2'}`}>
                                            {/* Avatar at bottom */}
                                            <div className={`relative transition-all duration-500 ${isActive ? 'scale-110' : 'scale-90 opacity-80'}`}>
                                                <div
                                                    onClick={() => { if (isMe) setShowStandUpConfirm(true); }}
                                                    className={`w-16 h-16 rounded-full border-4 overflow-hidden z-20 bg-[#1a1a2e] ${isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : 'border-gray-600'} ${player.is_folded ? 'opacity-50 grayscale' : ''} relative ${isMe ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`}>
                                                    {player.avatar_url && player.avatar_url.length > 2 ? (
                                                        <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}` }} />
                                                    ) : (
                                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} className="w-full h-full object-cover" alt="avatar" />
                                                    )}
                                                    {player.is_folded && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white text-[10px] font-bold">FOLDED</div>}
                                                </div>

                                                {/* Dealer / Blind Buttons */}
                                                <div className="absolute top-0 right-0 flex flex-col gap-1 transform translate-x-3 -translate-y-2">
                                                    {gameState.dealer_seat === seatIdx && (
                                                        <div className="bg-white text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs border border-gray-400 shadow-md">D</div>
                                                    )}
                                                    {isSB && (
                                                        <div className="bg-blue-500 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-[10px] border border-blue-300 shadow-md">SB</div>
                                                    )}
                                                    {isBB && (
                                                        <div className="bg-orange-500 text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-[10px] border border-orange-300 shadow-md">BB</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Name & Chips UI Below Avatar */}
                                            <div className="mt-1 flex flex-col items-center z-30">
                                                <div className={`px-3 py-0.5 rounded-full ${isActive ? 'bg-yellow-500 text-black' : 'bg-black/60 text-white'} text-xs font-bold shadow-lg flex items-center gap-1 border border-white/10 whitespace-nowrap`}>
                                                    {player.name}
                                                    {player.is_bot && <Bot size={12} />}
                                                </div>
                                                {gameState.winners_ids && gameState.winners_ids.includes(player.user_id) && (
                                                    <div className="mt-1 bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] font-black animate-pulse border border-yellow-300">
                                                        WINNER
                                                    </div>
                                                )}
                                                <div className="mt-1 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded border border-yellow-500/30">
                                                    <Coins size={10} className="text-yellow-500" />
                                                    <span className="text-xs font-mono font-black text-yellow-400">${player.chips}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Cards Group (Order 2 for ME, Order 1 for Others) */}
                                        <div
                                            className={`${isMe ? 'order-2 mb-0' : 'order-1 mb-[-15px]'} z-[60] flex flex-col items-center ${isMe ? 'cursor-pointer hover:scale-105 transition-transform origin-left' : 'pointer-events-none'}`}
                                            onClick={() => {
                                                if (isMe) {
                                                    sendAction('REFRESH_HAND');
                                                    const el = document.getElementById('my-cards-container');
                                                    if (el) {
                                                        el.style.opacity = '0.5';
                                                        setTimeout(() => el.style.opacity = '1', 200);
                                                    }
                                                }
                                            }}
                                            id={isMe ? 'my-cards-container' : undefined}
                                        >
                                            <div className={`flex justify-center filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] scale-125 ${player.is_folded && isMe ? 'grayscale opacity-60' : ''}`}>
                                                {/* Show cards if NOT folded OR if it's ME (even if folded) */}
                                                {(!player.is_folded || isMe) &&
                                                    (isMe && gameState.me.hand[0]?.rank !== '?' ? gameState.me.hand : player.hand).map((c, i) => (
                                                        <div key={i} className={`transform ${i === 0 ? '-rotate-6 translate-x-2' : 'rotate-6 -translate-x-2'} origin-bottom transition-all ${player.is_folded && !isMe ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}>
                                                            {renderCard(c, i)}
                                                        </div>
                                                    ))}
                                            </div>
                                            {/* Hand Combination Name - Always show for ME */}
                                            {isMe && player.current_hand && (
                                                <div className={`mt-3 relative z-[70] px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 animate-in fade-in zoom-in duration-300 ${player.is_folded ? 'bg-gray-900 text-gray-500 border-gray-700' :
                                                    (player.current_hand.uses_my_cards
                                                        ? 'bg-yellow-500 text-black border-yellow-200'
                                                        : 'bg-gray-800 text-gray-300 border-gray-600')
                                                    }`}>
                                                    {player.current_hand.name}
                                                </div>
                                            )}
                                        </div>

                                        {/* Chips Bet Display (Shifted to side) */}
                                        {player.current_bet > 0 && (
                                            <div className={`absolute ${chipPosClass} z-40 transform scale-75 ${winnerAnim ? 'winning-chips' : ''}`}>
                                                <ChipStack amount={player.current_bet} showLabel={true} />
                                            </div>
                                        )}

                                        {/* Raise Animation Pop */}
                                        {raiseAnims[seatIdx] && (
                                            <div className="absolute -top-20 z-[100] pointer-events-none">
                                                <div className="raise-anim bg-yellow-500 text-black font-black text-xl px-4 py-2 rounded-full border-4 border-white shadow-[0_0_30px_rgba(234,179,8,0.8)] whitespace-nowrap">
                                                    RAISE 🚀
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => { setSelectedSeat(seatIdx); setBuyInAmount(1000); setShowBuyIn(true); }}
                                        className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs cursor-pointer hover:border-yellow-500 hover:text-yellow-500 hover:bg-white/5 transition-all"
                                    >
                                        Sit Here
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modals and HUD */}

            {/* Stand Up Confirmation Modal */}
            {showStandUpConfirm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="glass-card max-w-sm w-full p-6 bg-[#1a1a2e] border border-red-500/30 text-center">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500">
                            <ArrowLeft className="text-red-500 transform rotate-90" size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-white">Stand Up?</h3>
                        <p className="text-gray-400 text-sm mb-6">You will leave your seat and your chips will be returned to your wallet. You can continue watching as a spectator.</p>

                        <div className="flex gap-4">
                            <button onClick={() => setShowStandUpConfirm(false)} className="btn-ghost flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
                            <button
                                onClick={() => {
                                    sendAction('LEAVE');
                                    setShowStandUpConfirm(false);
                                }}
                                className="btn-primary flex-1 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-bold"
                            >
                                Stand Up
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Buy In Modal */}
            {showBuyIn && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in duration-300">
                    <div className="glass-card max-w-sm w-full p-6 bg-[#1a1a2e] border border-white/10">
                        <h3 className="text-2xl font-bold mb-4 text-white">Sit at Seat {selectedSeat}</h3>
                        <p className="text-gray-400 text-sm mb-6">Choose how much to bring to the table.</p>

                        <div className="mb-6">
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Buy-In Amount</label>
                            <input
                                type="number"
                                className="w-full bg-black/50 border border-white/10 rounded p-4 text-center text-3xl font-mono text-yellow-400 focus:outline-none focus:border-yellow-500 mb-2"
                                value={buyInAmount}
                                onChange={e => setBuyInAmount(parseInt(e.target.value) || 0)}
                            />
                            <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
                                <span>Min: ${gameState.big_blind * 20}</span>
                                <span>Balance: ${balance}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowBuyIn(false)} className="btn-ghost flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
                            <button
                                onClick={handleBuyInConfirm}
                                className="btn-primary flex-1 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold disabled:opacity-50"
                                disabled={buyInAmount < (gameState.big_blind * 20)}
                            >
                                Join Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Controls (Fixed HUD - Bottom Right) */}
            <div className={`fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 pointer-events-none transition-all duration-500 ${(['SHOWDOWN', 'WAITING'].includes(gameState.state)) ? 'opacity-0 translate-y-10 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'
                }`}>
                {myPlayer && (
                    <div
                        onMouseEnter={() => setIsActionPanelHovered(true)}
                        onMouseLeave={() => setIsActionPanelHovered(false)}
                        className="flex flex-col gap-3 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl pointer-events-auto items-end transition-all duration-300"
                    >

                        {/* Status Message */}
                        {isDealing ? (
                            <div className="text-[10px] text-yellow-500 uppercase tracking-widest mb-1 px-2 border-l-2 border-yellow-500 animate-pulse">
                                Dealing Cards...
                            </div>
                        ) : myPlayer.is_folded ? (
                            <div className="text-[10px] text-red-500 uppercase tracking-widest mb-1 px-2 border-l-2 border-red-500">
                                You Folded
                            </div>
                        ) : gameState.current_player_seat !== mySeatIdx && (
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 px-2 border-l-2 border-yellow-500">
                                {gameState.seats[gameState.current_player_seat]?.name || 'Player'}'s Turn
                            </div>
                        )}

                        <div className={`flex gap-3 items-end transition-all duration-300 ${myPlayer.is_folded ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>

                            {/* FOLD */}
                            <button
                                onClick={() => {
                                    if (isDealing) return;
                                    if (gameState.current_player_seat === mySeatIdx) sendAction('FOLD');
                                    else setPreAction(preAction === 'FOLD' ? null : 'FOLD');
                                }}
                                disabled={isDealing}
                                className={`group flex flex-col items-center gap-1 transition-all ${preAction === 'FOLD' ? 'scale-105' : ''} ${isDealing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`h-12 w-20 rounded-xl flex items-center justify-center transition-all border-b-4 shadow-lg active:border-b-0 active:translate-y-1 ${preAction === 'FOLD'
                                    ? 'bg-red-500 border-red-800 ring-2 ring-red-400'
                                    : (gameState.current_player_seat === mySeatIdx ? 'bg-red-600 hover:bg-red-500 border-red-900' : 'bg-gray-700/40 border-gray-900 opacity-60 hover:opacity-100')
                                    }`}>
                                    <span className="text-base font-bold uppercase text-white">FOLD</span>
                                </div>
                                <span className="text-[9px] uppercase font-bold text-gray-500">{preAction === 'FOLD' ? 'Selected' : 'Fold'}</span>
                            </button>

                            {/* CHECK / FOLD */}
                            <button
                                onClick={() => {
                                    if (isDealing) return;
                                    setPreAction(preAction === 'CHECK' ? null : 'CHECK');
                                }}
                                disabled={isDealing}
                                className={`group flex flex-col items-center gap-1 transition-all ${preAction === 'CHECK' ? 'scale-105' : ''} ${isDealing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`h-12 w-24 rounded-xl flex flex-col items-center justify-center transition-all border-b-4 shadow-xl active:border-b-0 active:translate-y-1 ${preAction === 'CHECK'
                                    ? 'bg-green-500 border-green-800 ring-2 ring-green-400'
                                    : 'bg-gray-700/40 border-gray-900 opacity-60 hover:opacity-100'
                                    }`}>
                                    <span className="text-base font-black uppercase text-white tracking-tight leading-none text-center">CHECK<br /><span className="text-[10px] font-normal opacity-70">FOLD</span></span>
                                </div>
                                <span className="text-[9px] uppercase font-bold text-gray-400">{preAction === 'CHECK' ? 'Selected' : 'Check/Fold'}</span>
                            </button>

                            {/* CALL PRE-ACTION */}
                            <button
                                onClick={() => {
                                    if (isDealing) return;
                                    const isSelected = preAction === 'CALL';
                                    setPreAction(isSelected ? null : 'CALL');
                                    setPreActionCallAmount(isSelected ? 0 : gameState.current_bet);
                                }}
                                disabled={isDealing}
                                className={`group flex flex-col items-center gap-1 transition-all ${preAction === 'CALL' ? 'scale-105' : ''} ${isDealing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`h-12 w-24 rounded-xl flex flex-col items-center justify-center transition-all border-b-4 shadow-xl active:border-b-0 active:translate-y-1 ${preAction === 'CALL'
                                    ? 'bg-blue-500 border-blue-800 ring-2 ring-blue-400'
                                    : 'bg-gray-700/40 border-gray-900 opacity-60 hover:opacity-100'
                                    }`}>
                                    <span className="text-xl font-black uppercase text-white tracking-tighter">
                                        CALL
                                    </span>
                                    {(gameState.current_bet > (myPlayer.current_bet || 0)) && (
                                        <div className="flex flex-col items-center -mt-1">
                                            <span className="text-sm font-mono font-bold text-blue-200">
                                                ${gameState.current_bet - (myPlayer.current_bet || 0)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[9px] uppercase font-bold text-gray-400">{preAction === 'CALL' ? 'Selected' : 'Call'}</span>
                            </button>

                            {/* RAISE SECTION */}
                            <div className={`flex flex-col items-center gap-1 ${gameState.current_player_seat !== mySeatIdx ? 'pointer-events-auto' : ''}`}>
                                {/* Pre-action Raise Indicator */}
                                {gameState.current_player_seat !== mySeatIdx && preAction === 'RAISE' && (
                                    <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full mb-1 animate-pulse border border-black/20">
                                        Plan: Raise ${preActionAmount}
                                    </div>
                                )}

                                <div className={`flex flex-col items-center gap-1 transition-all duration-300 overflow-hidden ${isActionPanelHovered ? 'max-h-40 opacity-100 mb-1' : 'max-h-0 opacity-0'}`}>
                                    {/* Quick Raise Buttons */}
                                    <div className="flex flex-wrap gap-1 justify-end max-w-[220px] mb-1">
                                        {[
                                            { l: 'Min', val: minRaiseAmount },
                                            { l: '2 BB', val: (gameState.limits?.bb || 0) * 2 },
                                            { l: '3 BB', val: (gameState.limits?.bb || 0) * 3 },
                                            { l: 'Pot', val: (gameState.current_bet || 0) + (gameState.pot || 0) },
                                            { l: 'Max', val: (myPlayer?.chips || 0) + (myPlayer?.current_bet || 0) }
                                        ].map((btn, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (isDealing) return;
                                                    const finalAmount = Math.max(btn.val, minRaiseAmount);
                                                    setBetAmount(finalAmount);
                                                    if (gameState.current_player_seat !== mySeatIdx) {
                                                        const isSame = preAction === 'RAISE' && preActionAmount === finalAmount;
                                                        setPreAction(isSame ? null : 'RAISE');
                                                        setPreActionAmount(isSame ? 0 : finalAmount);
                                                    }
                                                }}
                                                disabled={isDealing}
                                                className={`text-[10px] px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-gray-200 transition-all font-bold ${(preAction === 'RAISE' && preActionAmount === btn.val) || (gameState.current_player_seat === mySeatIdx && betAmount === btn.val)
                                                    ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400 scale-105 shadow-lg' : ''} ${isDealing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {btn.l}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-xl border border-white/20 shadow-inner">
                                        <button onClick={() => setBetAmount(prev => Math.max(minRaiseAmount, (prev || minRaiseAmount) - (gameState.limits?.bb || 10)))} className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm shadow-md">-</button>
                                        <input
                                            type="number"
                                            className="w-20 bg-transparent text-center font-mono font-black text-yellow-400 outline-none text-base"
                                            value={betAmount || minRaiseAmount || 0}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setBetAmount(isNaN(val) ? minRaiseAmount : Math.max(minRaiseAmount, val));
                                            }}
                                        />
                                        <button onClick={() => setBetAmount(prev => (prev || minRaiseAmount) + (gameState.limits?.bb || 10))} className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm shadow-md">+</button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (isDealing) return;
                                        const raiseVal = betAmount || minRaiseAmount;
                                        if (gameState.current_player_seat === mySeatIdx) {
                                            sendAction('RAISE', { amount: raiseVal });
                                        } else {
                                            setPreAction(preAction === 'RAISE' && preActionAmount === raiseVal ? null : 'RAISE');
                                            setPreActionAmount(preAction === 'RAISE' && preActionAmount === raiseVal ? 0 : raiseVal);
                                        }
                                    }}
                                    disabled={isDealing}
                                    className={`bg-yellow-600 hover:bg-yellow-500 border-b-4 border-yellow-900 text-white h-14 w-28 rounded-2xl flex flex-col items-center justify-center transition-all active:border-b-0 active:translate-y-1 shadow-xl ${gameState.current_player_seat !== mySeatIdx && preAction !== 'RAISE' ? 'opacity-60 grayscale' : 'hover:scale-105'} ${isDealing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="text-lg font-black uppercase tracking-tight">RAISE</span>
                                    <span className="text-[11px] font-mono font-bold leading-none text-yellow-200">
                                        ${(gameState.current_player_seat === mySeatIdx ? (betAmount || minRaiseAmount) : (preActionAmount || minRaiseAmount))}
                                    </span>
                                </button>
                                <span className="text-[10px] uppercase font-black text-gray-500 mt-1">{gameState.current_player_seat === mySeatIdx ? 'Send Now' : 'Wait for turn'}</span>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Error Toast */}
            {gameError && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300 pointer-events-none">
                    <div className="bg-red-600/90 text-white px-6 py-3 rounded-full border-2 border-red-400 shadow-[0_0_30px_rgba(220,38,38,0.5)] backdrop-blur-md flex items-center gap-2">
                        <AlertCircle size={20} />
                        <span className="font-bold tracking-tight">{gameError}</span>
                    </div>
                </div>
            )}

        </div>
    );
};

const Poker = () => {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [currentTableId, setCurrentTableId] = useState(() => localStorage.getItem('active_poker_table'));
    const [isLoading, setIsLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    // Persist table selection across refreshes
    useEffect(() => {
        if (currentTableId) {
            localStorage.setItem('active_poker_table', currentTableId);
        } else {
            localStorage.removeItem('active_poker_table');
        }
    }, [currentTableId]);

    const authFetch = useCallback(async (url, method = 'GET') => {
        const token = localStorage.getItem('monopoly_token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}${url}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return res;
    }, []);

    const fetchInfo = useCallback(async () => {
        setIsLoading(true);
        try {
            const [tRes, uRes] = await Promise.all([
                authFetch('/api/poker/tables'),
                authFetch('/api/users/me')
            ]);

            if (tRes.ok) {
                const tData = await tRes.json();
                setTables(tData);
            }
            if (uRes.ok) {
                const uData = await uRes.json();
                setUserBalance(uData.balance || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [authFetch]); // Dependencies for fetchInfo

    useEffect(() => {
        fetchInfo();
        const interval = setInterval(fetchInfo, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleJoinClick = (table) => {
        setCurrentTableId(table.id);
    };

    const handleLeave = useCallback(() => setCurrentTableId(null), []);

    if (currentTableId) {
        return (
            <div className="h-screen w-screen bg-[#0c0c14] overflow-hidden">
                <PokerTable
                    tableId={currentTableId}
                    balance={userBalance}
                    refreshBalance={fetchInfo}
                    onLeave={handleLeave}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen animated-bg p-6 text-white flex flex-col items-center">
            <div className="max-w-4xl w-full">
                <div className="flex justify-between items-center mb-8 glass-card p-6">
                    <button onClick={() => navigate('/')} className="btn-ghost flex items-center gap-2">
                        <ArrowLeft /> Back
                    </button>
                    <h1 className="text-3xl font-display font-bold text-yellow-400">TEXAS HOLD'EM</h1>
                    <div className="bg-black/40 px-4 py-2 rounded-lg border border-yellow-500/30 flex items-center gap-2">
                        <span className="text-xs text-gray-400 uppercase">Wallet Balance</span>
                        <span className="font-mono font-bold text-xl text-yellow-400">${userBalance}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tables.map(table => (
                        <div key={table.id} className="glass-card p-6 flex justify-between items-center group hover:bg-white/10 transition-all border border-white/10 hover:border-yellow-500/50">
                            <div>
                                <h3 className="text-xl font-bold mb-1">{table.name}</h3>
                                <div className="text-sm text-gray-400 flex items-center gap-4">
                                    <span className="flex items-center gap-1"><Users size={14} /> {table.players}/{table.max_seats}</span>
                                    <span className="flex items-center gap-1 text-yellow-500/70"><Trophy size={14} /> ${table.small_blind}/${table.big_blind}</span>
                                    <span className="text-xs text-gray-500">Min ${table.min_buy}</span>
                                </div>
                            </div>
                            <button onClick={() => handleJoinClick(table)} className="btn-primary">
                                Play
                            </button>
                        </div>
                    ))}

                    {tables.length === 0 && !isLoading && (
                        <div className="col-span-2 text-center py-10 text-gray-500">No tables found. Server error?</div>
                    )}
                </div>
            </div>

            {/* Modal Moved to Table */}
        </div>
    );
};

export default Poker;
