import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle, Play, Maximize2, Minimize2, Bot, Trash2 } from 'lucide-react';

const PokerTable = ({ tableId, onLeave, autoBuyIn, balance }) => {
    const [gameState, setGameState] = useState(null);
    const [socket, setSocket] = useState(null);
    const [betAmount, setBetAmount] = useState(0);
    const [connected, setConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showBuyIn, setShowBuyIn] = useState(false);
    const [buyInAmount, setBuyInAmount] = useState(1000);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [winnerAnim, setWinnerAnim] = useState(null);
    const [tick, setTick] = useState(0);
    const [preAction, setPreAction] = useState(null); // 'CHECK', 'FOLD', or 'RAISE'
    const [isDealing, setIsDealing] = useState(false); // New: prevents action buttons before cards
    const [preActionAmount, setPreActionAmount] = useState(0);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [isChatPinned, setIsChatPinned] = useState(false);
    const [gameError, setGameError] = useState(null);
    const [showStandUpConfirm, setShowStandUpConfirm] = useState(false);
    const messagesEndRef = useRef(null);
    const tableRef = useRef(null);
    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin);
    const wsBase = API_BASE.replace('http', 'ws');

    const handleBuyInConfirm = () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                action: 'JOIN',
                buy_in: buyInAmount,
                requested_seat: selectedSeat
            }));
            setShowBuyIn(false);
        }
    };

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
                setTimeout(() => setIsDealing(false), 1200); // Wait for cards to fly
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
        const token = localStorage.getItem('monopoly_token');
        const ws = new WebSocket(`${wsBase}/ws/poker/${tableId}?token=${token}`);

        ws.onopen = () => {
            console.log('Connected to Poker Table');
            setConnected(true);
            if (autoBuyIn) {
                // ws.send(JSON.stringify({ action: 'JOIN', buy_in: autoBuyIn }));
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') {
                setGameState(data.state);
            } else if (data.type === 'GAME_UPDATE') {
                setGameState(prev => {
                    const newState = { ...prev, ...data.state };

                    if (prev && prev.me && newState.seats) {
                        const myUserId = prev.me.user_id;
                        const mySeatKey = Object.keys(newState.seats).find(k => newState.seats[k].user_id === myUserId);
                        const currentMySeatIdx = mySeatKey ? parseInt(mySeatKey) : -1;

                        if (mySeatKey) {
                            // Restore cached hand if public update shows ?
                            if (prev.seats[mySeatKey]?.hand?.length && prev.seats[mySeatKey].hand[0].rank !== '?') {
                                if (newState.seats[mySeatKey].hand[0].rank === '?') {
                                    newState.seats[mySeatKey].hand = prev.seats[mySeatKey].hand;
                                }
                            }
                        }

                        // Pre-Action Execution Logic
                        if (newState.current_player_seat === currentMySeatIdx && preAction) {
                            const myPlayerNow = newState.seats[mySeatKey];
                            if (myPlayerNow && !myPlayerNow.is_folded) {
                                if (preAction === 'FOLD') {
                                    setTimeout(() => sendAction('FOLD'), 500);
                                } else if (preAction === 'CHECK') {
                                    if (newState.current_bet === (myPlayerNow.current_bet || 0)) {
                                        setTimeout(() => sendAction('CHECK'), 50);
                                    }
                                } else if (preAction === 'RAISE') {
                                    if (newState.current_bet < preActionAmount) {
                                        setTimeout(() => sendAction('RAISE', { amount: preActionAmount }), 50);
                                    } else {
                                        setGameError("Pre-Raise cancelled: bet equal/higher");
                                    }
                                }
                            }
                        }
                    }
                    return newState;
                });
            } else if (data.type === 'HAND_UPDATE') {
                setGameState(prev => {
                    if (!prev || !prev.me) return prev;

                    // Sync hand to both 'me' and the corresponding seat
                    const mySeatKey = Object.keys(prev.seats).find(k => prev.seats[k].user_id === prev.me.user_id);

                    const newMe = { ...prev.me, hand: data.hand };
                    const newSeats = { ...prev.seats };
                    if (mySeatKey) {
                        newSeats[mySeatKey] = { ...newSeats[mySeatKey], hand: data.hand };
                    }

                    return { ...prev, me: newMe, seats: newSeats };
                });
            } else if (data.type === 'ERROR') {
                setGameError(data.message);
                setPreAction(null); // Clear pre-action on error
            }
        };

        ws.onclose = () => {
            console.log('Disconnected');
            setConnected(false);
        };

        setSocket(ws);
        return () => ws.close();
    }, [tableId, preAction]);

    const sendAction = (action, data = {}) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ action, ...data }));
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            tableRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    if (!gameState) return <div className="text-center p-10 text-white">Loading Table...</div>;

    const mySeatEntry = Object.entries(gameState.seats).find(([k, v]) => v.user_id === gameState.me?.user_id);
    const mySeatIdx = mySeatEntry ? parseInt(mySeatEntry[0]) : -1;
    const myPlayer = mySeatEntry ? mySeatEntry[1] : null;

    const isWinningCard = (card) => {
        if (!card) return false;
        // 1. Showdown winning cards
        if (gameState.winning_cards?.length > 0) {
            return gameState.winning_cards.some(c => c.rank === card.rank && c.suit === card.suit);
        }
        // 2. Current hand cards for the player
        if (myPlayer?.current_hand?.cards) {
            return myPlayer.current_hand.cards.some(c => c.rank === card.rank && c.suit === card.suit);
        }
        return false;
    };

    const renderCard = (card, i) => {
        const winning = isWinningCard(card);
        const glowClass = winning ? "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.8)] z-50 scale-105" : "";

        if (!card) return <div className="w-10 h-14 bg-blue-900 border border-blue-500 rounded m-1"></div>;
        if (card.rank === '?') return <div className="w-10 h-14 bg-blue-800 border-2 border-blue-400 rounded m-1 flex items-center justify-center text-xs text-blue-200 shadow-md">?</div>;

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

    const ChipStack = ({ amount, isPot = false }) => {
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
                <div className="relative w-6 h-6 cursor-pointer transform hover:scale-110 transition-transform">
                    {/* Simulated Stack - 3 chips */}
                    <div className={`absolute top-0 left-0 w-full h-full rounded-full ${bgColor} border-2 ${borderColor} shadow-lg`}></div>
                    <div className={`absolute -top-0.5 left-0 w-full h-full rounded-full ${bgColor} border-2 ${borderColor} shadow-md`}></div>
                    <div className={`absolute -top-1 left-0 w-full h-full rounded-full ${bgColor} border-2 ${borderColor} shadow-inner flex items-center justify-center`}>
                        <div className={`w-4 h-4 rounded-full border border-white/30 border-dashed ${textColor} text-[8px] font-bold flex items-center justify-center font-mono`}>
                            $
                        </div>
                    </div>
                </div>
                {/* Tooltip Value */}
                <div className="bg-black/80 text-yellow-400 text-[9px] font-mono font-bold px-1 rounded mt-[-2px] border border-yellow-500/30 shadow-md backdrop-blur-sm z-50">
                    ${formatted}
                </div>
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
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.5); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
            {/* Top Bar */}
            <div className="flex justify-between items-center z-10 text-white">
                <button onClick={() => { sendAction('LEAVE'); onLeave(); }} className="btn-ghost text-sm flex items-center gap-1">
                    <ArrowLeft size={16} /> Leave
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-yellow-400">{gameState.name}</h2>
                    <div className="text-xs text-gray-400">Pot: {gameState.pot} • Blinds: {gameState.small_blind}/{gameState.big_blind}</div>
                </div>
                <div className="flex gap-2">
                    <div className="bg-black/50 border border-white/10 px-2 py-1 rounded flex items-center gap-2 mr-2">
                        <span className="text-[10px] text-gray-500 uppercase">Wallet</span>
                        <span className="text-sm font-bold text-yellow-500">${balance}</span>
                    </div>
                    <button onClick={() => sendAction('ADD_FUNDS')} className="btn-xs bg-green-900 border border-green-500/50 p-1 px-2 rounded hover:bg-green-800 text-green-200 font-mono font-bold" title="Cheat: Add $10k">
                        +10k
                    </button>
                    <button onClick={() => sendAction('ADD_BOT')} className="btn-xs border border-white/20 p-1 rounded hover:bg-white/10" title="Add Bot">
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
                    } hover:opacity-100 hover:translate-y-0 hover:pointer-events-auto`}
                onMouseEnter={() => setIsChatVisible(true)}
            >
                <div className="w-80 max-h-40 overflow-y-auto font-mono text-[10px] text-gray-400 bg-black/80 p-3 rounded-xl border border-white/10 shadow-2xl flex flex-col-reverse backdrop-blur-md">
                    <div className="flex justify-between items-center mb-1 border-b border-white/5 pb-1">
                        <span className="text-[9px] uppercase font-bold text-gray-500">Game Log</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsChatPinned(!isChatPinned); }}
                            className={`text-[9px] px-2 py-0.5 rounded transition-colors ${isChatPinned ? 'bg-yellow-500 text-black font-bold' : 'bg-white/10 text-gray-400'}`}
                        >
                            {isChatPinned ? 'Pinned' : 'Pin'}
                        </button>
                    </div>
                    {gameState.logs && gameState.logs.slice().reverse().map((log, i) => (
                        <div key={i} className="mb-0.5 break-words transition-opacity duration-1000" style={{ opacity: Math.max(0.3, 1 - (i * 0.15)) }}>
                            <span className="text-gray-600">[{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span> <span className="text-gray-300">{log.msg}</span>
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
                <div className="absolute top-[-2%] left-1/2 transform -translate-x-1/2 z-[5] flex flex-col items-center opacity-95 transition-all duration-1000 hover:scale-105">
                    <div className="relative w-48 h-48 rounded-full border-4 border-yellow-500/40 bg-black overflow-hidden shadow-[0_0_80px_rgba(234,179,8,0.3)] group">
                        <img
                            src="/assets/croupier.png"
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                            alt="Croupier"
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
                    <div className="absolute top-[60%] flex flex-col items-center gap-2 z-10">
                        <ChipStack amount={gameState.pot} isPot={true} />
                        <div className="text-yellow-400 font-mono font-bold bg-black/60 px-4 py-1 rounded-full text-lg border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                            Pot: ${gameState.pot}
                        </div>
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

                        return (
                            <div key={seatIdx} className={`absolute flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110 z-30' : 'z-20'}`} style={posStyle}>
                                {player ? (
                                    <div className="flex flex-col items-center group relative">
                                        {/* Timer / Active Indicator */}
                                        {isActive && (
                                            <>
                                                <div className="absolute w-[120%] h-[120%] -top-[10%] -left-[10%] border-4 border-yellow-500 rounded-full animate-pulse z-0"></div>
                                                <div className="absolute -top-10 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full z-50 shadow-lg border-2 border-white">
                                                    {getTimeRemaining()}s
                                                </div>
                                            </>
                                        )}

                                        <div className="relative flex flex-col items-center">
                                            {/* Cards ABOVE Avatar now - with better centering and overlap */}
                                            <div className="mb-[-15px] z-[60] flex flex-col items-center pointer-events-none">
                                                <div className="flex justify-center filter drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)] scale-125">
                                                    {(player.user_id === gameState.me?.user_id && gameState.me.hand[0]?.rank !== '?' ? gameState.me.hand : player.hand).map((c, i) => (
                                                        <div key={i} className={`transform ${i === 0 ? '-rotate-6 translate-x-2' : 'rotate-6 -translate-x-2'} origin-bottom transition-all`}>
                                                            {renderCard(c, i)}
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Hand Combination Name */}
                                                {player.user_id === gameState.me?.user_id && player.current_hand && !player.is_folded && (
                                                    <div className="mt-2 bg-yellow-500 text-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border-2 border-yellow-200/50 animate-in fade-in zoom-in duration-300">
                                                        {player.current_hand.name}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Avatar at bottom */}
                                            <div className={`relative transition-all duration-500 ${isActive ? 'scale-110' : 'scale-90 opacity-80'}`}>
                                                <div
                                                    onClick={() => { if (player.user_id === gameState.me?.user_id) setShowStandUpConfirm(true); }}
                                                    className={`w-16 h-16 rounded-full border-4 overflow-hidden z-20 bg-[#1a1a2e] ${isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)]' : 'border-gray-600'} ${player.is_folded ? 'opacity-50 grayscale' : ''} relative ${player.user_id === gameState.me?.user_id ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`}>
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
                                                <div className={`px-3 py-0.5 rounded-full ${isActive ? 'bg-yellow-500 text-black' : 'bg-black/60 text-white'} text-[10px] font-bold shadow-lg flex items-center gap-1 border border-white/10`}>
                                                    {player.name}
                                                    {player.is_bot && <Bot size={10} />}
                                                </div>
                                                <div className="mt-1 flex items-center gap-1 bg-black/80 px-2 py-0.5 rounded border border-yellow-500/30">
                                                    <Coins size={10} className="text-yellow-500" />
                                                    <span className="text-xs font-mono font-black text-yellow-400">${player.chips}</span>
                                                </div>
                                            </div>

                                            {/* Chips Bet Display (Shifted to side) */}
                                            {player.current_bet > 0 && (
                                                <div className="absolute -top-8 -right-16 z-40 transform scale-75">
                                                    <ChipStack amount={player.current_bet} />
                                                    <div className="text-[10px] font-bold text-yellow-400 bg-black/60 px-2 rounded-full mt-1">
                                                        ${player.current_bet}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Bubble */}
                                        {player.last_action && (
                                            <div className="absolute top-0 right-0 transform translate-x-full text-xs font-bold bg-blue-600 px-2 py-1 rounded text-white shadow-lg animate-bounce z-50 border border-blue-400">
                                                {player.last_action}
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

                                {winnerAnim && winnerAnim.includes(player?.user_id) && (
                                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-500">
                                        <div className="bg-yellow-500/20 rounded-full p-4 backdrop-blur-sm border-2 border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.6)] animate-bounce">
                                            <Trophy className="text-yellow-400 w-12 h-12" />
                                        </div>
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
                                className="btn-primary flex-1 py-2 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
                                disabled={buyInAmount > balance || buyInAmount < (gameState.big_blind * 20)}
                            >
                                Join Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Controls (Fixed HUD - Bottom Right) */}
            <div className={`fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 pointer-events-none transition-all duration-500 ${(['SHOWDOWN', 'WAITING'].includes(gameState.state) || isDealing) ? 'opacity-0 translate-y-10 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'
                }`}>
                {myPlayer && !myPlayer.is_folded && (
                    <div className="flex flex-col gap-3 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl pointer-events-auto items-end">

                        {/* Status Message */}
                        {gameState.current_player_seat !== mySeatIdx && (
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 px-2 border-l-2 border-yellow-500">
                                {gameState.seats[gameState.current_player_seat]?.name || 'Player'}'s Turn
                            </div>
                        )}

                        <div className="flex gap-3 items-end">
                            {/* FOLD / PASS */}
                            <button
                                onClick={() => {
                                    if (gameState.current_player_seat === mySeatIdx) sendAction('FOLD');
                                    else setPreAction(preAction === 'FOLD' ? null : 'FOLD');
                                }}
                                className={`group flex flex-col items-center gap-1 transition-all ${preAction === 'FOLD' ? 'scale-105' : ''}`}
                            >
                                <div className={`h-12 w-20 rounded-xl flex items-center justify-center transition-all border-b-4 shadow-lg active:border-b-0 active:translate-y-1 ${preAction === 'FOLD'
                                    ? 'bg-red-500 border-red-800 ring-2 ring-red-400'
                                    : (gameState.current_player_seat === mySeatIdx ? 'bg-red-600 hover:bg-red-500 border-red-900' : 'bg-gray-700/40 border-gray-900 opacity-60 hover:opacity-100')
                                    }`}>
                                    <span className="text-base font-bold uppercase text-white">Pass</span>
                                </div>
                                <span className="text-[9px] uppercase font-bold text-gray-500">{preAction === 'FOLD' ? 'Selected' : 'Fold'}</span>
                            </button>

                            {/* CHECK / CALL / HOLD */}
                            <button
                                onClick={() => {
                                    if (gameState.current_player_seat === mySeatIdx) {
                                        sendAction(gameState.current_bet > myPlayer.current_bet ? 'CALL' : 'CHECK');
                                    } else {
                                        if (gameState.current_bet === myPlayer.current_bet) {
                                            setPreAction(preAction === 'CHECK' ? null : 'CHECK');
                                        }
                                    }
                                }}
                                className={`group flex flex-col items-center gap-1 transition-all ${preAction === 'CHECK' ? 'scale-105' : ''} ${(gameState.current_player_seat !== mySeatIdx && gameState.current_bet > myPlayer.current_bet) ? 'opacity-30 pointer-events-none' : ''
                                    }`}
                            >
                                <div className={`h-12 w-24 rounded-xl flex flex-col items-center justify-center transition-all border-b-4 shadow-xl active:border-b-0 active:translate-y-1 ${preAction === 'CHECK'
                                    ? 'bg-green-500 border-green-800 ring-2 ring-green-400'
                                    : (gameState.current_player_seat === mySeatIdx ? 'bg-green-600 hover:bg-green-500 border-green-900' : 'bg-gray-700/40 border-gray-900 opacity-60 hover:opacity-100')
                                    }`}>
                                    <span className="text-xl font-black uppercase text-white tracking-tighter">
                                        {gameState.current_player_seat === mySeatIdx
                                            ? (gameState.current_bet > myPlayer.current_bet ? 'Call' : 'Hold')
                                            : 'Hold'}
                                    </span>
                                    {gameState.current_player_seat === mySeatIdx && gameState.current_bet > myPlayer.current_bet && (
                                        <div className="flex flex-col items-center -mt-1">
                                            <span className="text-3xl font-mono font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] scale-110 animate-bounce group-hover:animate-none">
                                                ${gameState.current_bet - myPlayer.current_bet}
                                            </span>
                                            <span className="text-[10px] font-bold text-yellow-200/60 uppercase">to match</span>
                                        </div>
                                    )}
                                </div>
                                <span className="text-[9px] uppercase font-bold text-gray-400">{preAction === 'CHECK' ? 'Selected' : 'Check'}</span>
                            </button>

                            {/* RAISE SECTION */}
                            <div className={`flex flex-col items-center gap-1 ${gameState.current_player_seat !== mySeatIdx ? 'pointer-events-auto' : ''}`}>
                                {/* Pre-action Raise Indicator */}
                                {gameState.current_player_seat !== mySeatIdx && preAction === 'RAISE' && (
                                    <div className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full mb-1 animate-pulse border border-black/20">
                                        Plan: Raise ${preActionAmount}
                                    </div>
                                )}

                                {/* Quick Raise Buttons */}
                                <div className="flex flex-wrap gap-1 justify-end max-w-[220px] mb-1">
                                    {[
                                        { l: 'Min', val: gameState.current_bet + gameState.min_raise },
                                        { l: '2x', val: Math.max((gameState.current_bet || gameState.big_blind) * 2, gameState.big_blind * 2) },
                                        { l: '3x', val: Math.max((gameState.current_bet || gameState.big_blind) * 3, gameState.big_blind * 3) },
                                        { l: '½ Pot', val: Math.floor(gameState.current_bet + gameState.pot / 2) },
                                        { l: 'Pot', val: gameState.current_bet + gameState.pot },
                                        { l: 'All-In', val: (myPlayer?.chips || 0) + (myPlayer?.current_bet || 0) }
                                    ].map((btn, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setBetAmount(btn.val);
                                                if (gameState.current_player_seat !== mySeatIdx) {
                                                    setPreAction(preAction === 'RAISE' && preActionAmount === btn.val ? null : 'RAISE');
                                                    setPreActionAmount(preAction === 'RAISE' && preActionAmount === btn.val ? 0 : btn.val);
                                                }
                                            }}
                                            className={`text-[10px] px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-gray-200 transition-all font-bold ${(preAction === 'RAISE' && preActionAmount === btn.val) || (gameState.current_player_seat === mySeatIdx && betAmount === btn.val)
                                                ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400 scale-105 shadow-lg' : ''}`}
                                        >
                                            {btn.l}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-xl mb-1 border border-white/20 shadow-inner">
                                    <button onClick={() => setBetAmount(Math.max((gameState.current_bet + gameState.min_raise), betAmount - gameState.big_blind))} className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm shadow-md">-</button>
                                    <input
                                        type="number"
                                        className="w-20 bg-transparent text-center font-mono font-black text-yellow-400 outline-none text-base"
                                        value={betAmount || (gameState.current_bet + gameState.min_raise)}
                                        onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                                    />
                                    <button onClick={() => setBetAmount(betAmount + gameState.big_blind)} className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm shadow-md">+</button>
                                </div>
                                <button
                                    onClick={() => {
                                        if (gameState.current_player_seat === mySeatIdx) {
                                            sendAction('RAISE', { amount: betAmount || (gameState.current_bet + gameState.min_raise) });
                                        } else {
                                            setIsChatVisible(true); // Hint
                                        }
                                    }}
                                    className={`bg-yellow-600 hover:bg-yellow-500 border-b-4 border-yellow-900 text-white h-14 w-28 rounded-2xl flex flex-col items-center justify-center transition-all active:border-b-0 active:translate-y-1 shadow-xl ${gameState.current_player_seat !== mySeatIdx ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105'}`}
                                >
                                    <span className="text-lg font-black uppercase tracking-tight">Raise</span>
                                    <span className="text-[11px] font-mono font-bold leading-none text-yellow-200">${betAmount || (gameState.current_bet + gameState.min_raise)}</span>
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

    const authFetch = async (url, method = 'GET') => {
        const token = localStorage.getItem('monopoly_token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}${url}`, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return res;
    };

    const fetchInfo = async () => {
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
    };

    useEffect(() => {
        fetchInfo();
        const interval = setInterval(fetchInfo, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleJoinClick = (table) => {
        setCurrentTableId(table.id);
    };

    if (currentTableId) {
        return (
            <div className="h-screen w-screen bg-[#0c0c14] overflow-hidden">
                <PokerTable
                    tableId={currentTableId}
                    balance={userBalance}
                    onLeave={() => setCurrentTableId(null)}
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
                        <span className="text-xs text-gray-400 uppercase">Balance</span>
                        <span className="font-mono font-bold text-xl text-yellow-400">${userBalance}</span>
                        <button
                            onClick={async () => {
                                try {
                                    const res = await authFetch('/api/users/bonus', { method: 'POST' });
                                    if (res.ok) {
                                        const data = await res.json();
                                        setUserBalance(data.new_balance);
                                        fetchInfo();
                                    }
                                } catch (e) { }
                            }}
                            className="ml-2 btn-xs bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded px-2 transition-colors text-[10px] font-bold"
                        >
                            +10k
                        </button>
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
