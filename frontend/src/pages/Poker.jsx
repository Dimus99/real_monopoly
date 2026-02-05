import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle, Play, Maximize2, Minimize2, Bot, Trash2 } from 'lucide-react';

const PokerTable = ({ tableId, onLeave, autoBuyIn, balance }) => {
    const [gameState, setGameState] = useState(null);
    const [socket, setSocket] = useState(null);
    const [betAmount, setBetAmount] = useState(0);
    const [connected, setConnected] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [_, setTick] = useState(0); // Force re-render for timer
    const messagesEndRef = useRef(null);
    const tableRef = useRef(null);
    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin);
    const wsBase = API_BASE.replace('http', 'ws');

    // Timer ticker
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('monopoly_token');
        const ws = new WebSocket(`${wsBase}/ws/poker/${tableId}?token=${token}`);

        ws.onopen = () => {
            console.log('Connected to Poker Table');
            setConnected(true);
            if (autoBuyIn) {
                ws.send(JSON.stringify({ action: 'JOIN', buy_in: autoBuyIn }));
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') {
                setGameState(data.state);
            } else if (data.type === 'GAME_UPDATE') {
                setGameState(prev => {
                    const newState = { ...prev, ...data.state };
                    // Preserve my private hand logic
                    if (prev?.me?.user_id) {
                        const mySeatIdx = Object.keys(newState.seats).find(k => newState.seats[k].user_id === prev.me.user_id);
                        if (mySeatIdx && prev.seats[mySeatIdx]?.hand && prev.seats[mySeatIdx].hand.length > 0 && prev.seats[mySeatIdx].hand[0].rank !== '?') {
                            if (newState.seats[mySeatIdx]?.hand && (newState.seats[mySeatIdx].hand.length === 0 || newState.seats[mySeatIdx].hand[0].rank === '?')) {
                                if (newState.state !== 'SHOWDOWN') { // Don't overwrite if showdown might reveal something else, though usually consistent
                                    newState.seats[mySeatIdx].hand = prev.seats[mySeatIdx].hand;
                                    if (newState.me) newState.me.hand = prev.seats[mySeatIdx].hand;
                                }
                            }
                        }
                    }
                    return newState;
                });
            } else if (data.type === 'HAND_UPDATE') {
                setGameState(prev => ({
                    ...prev,
                    me: { ...prev.me, hand: data.hand },
                    seats: {
                        ...prev.seats,
                        [prev.seats && Object.keys(prev.seats).find(k => prev.seats[k].user_id === prev.me?.user_id)]: {
                            ...prev.seats[Object.keys(prev.seats).find(k => prev.seats[k].user_id === prev.me?.user_id)],
                            hand: data.hand
                        }
                    }
                }));
            } else if (data.type === 'ERROR') {
                alert(data.message);
            }
        };

        ws.onclose = () => {
            console.log('Disconnected');
            setConnected(false);
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [tableId]);

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

    const mySeat = Object.entries(gameState.seats).find(([k, v]) => v.user_id === gameState.me?.user_id);
    const myPlayer = mySeat ? mySeat[1] : null;

    const isWinningCard = (card) => {
        if (!gameState.winning_cards || !card) return false;
        return gameState.winning_cards.some(c => c.rank === card.rank && c.suit === card.suit);
    };

    const renderCard = (card, i) => {
        const winning = isWinningCard(card);
        const glowClass = winning ? "ring-4 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.8)] z-50 scale-110" : "";

        if (!card) return <div className="w-10 h-14 bg-blue-900 border border-blue-500 rounded m-1"></div>;
        if (card.rank === '?') return <div className="w-10 h-14 bg-blue-800 border-2 border-blue-400 rounded m-1 flex items-center justify-center text-xs text-blue-200 shadow-md">?</div>;

        const isRed = ['♥', '♦'].includes(card.suit);
        return (
            <div
                className={`w-12 h-16 bg-white ${isRed ? 'text-red-600' : 'text-black'} rounded m-1 flex flex-col items-center justify-center font-bold text-lg shadow-lg border border-gray-300 ${glowClass} transition-all duration-300 animate-in fade-in zoom-in`}
                style={{ animationDelay: `${i * 100}ms` }}
            >
                <div>{card.rank}</div>
                <div className="text-xl leading-none">{card.suit}</div>
            </div>
        );
    };

    const renderChips = (amount, isPot = false) => {
        if (!amount || amount === 0) return null;
        const formatted = amount >= 1000 ? (amount / 1000).toFixed(1) + 'k' : amount;
        return (
            <div className={`flex flex-col items-center ${isPot ? 'scale-125' : ''}`}>
                <div className="relative h-8 w-8">
                    <div className="absolute bottom-0 w-8 h-8 rounded-full border-4 border-dashed border-white/30 bg-yellow-500 shadow-lg animate-bounce-slight flex items-center justify-center text-[10px] font-bold text-black font-mono">
                        $
                    </div>
                </div>
                <div className="bg-black/60 text-yellow-400 text-[10px] font-mono font-bold px-1.5 rounded mt-1 border border-yellow-500/30">
                    ${formatted}
                </div>
            </div>
        );
    };

    const getTimeRemaining = () => {
        if (!gameState.turn_deadline) return 0;
        // Backend now returns ISO string with Z (UTC) or compatible
        const total = Date.parse(gameState.turn_deadline) - Date.now();
        return Math.max(0, Math.floor(total / 1000));
    };

    return (
        <div ref={tableRef} className="flex flex-col h-full w-full max-w-7xl mx-auto glass-card p-4 relative bg-[#0f172a] overflow-hidden">
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
            <div className="absolute bottom-4 left-4 z-50 w-64 max-h-48 overflow-y-auto font-mono text-xs text-gray-400 bg-black/60 p-2 rounded pointer-events-none fade-mask">
                {gameState.logs && gameState.logs.slice().reverse().map((log, i) => (
                    <div key={i} className="mb-1">
                        <span className="text-gray-600">[{new Date(log.time).toLocaleTimeString().split(' ')[0]}]</span> <span className="text-gray-300">{log.msg}</span>
                    </div>
                ))}
            </div>

            {/* Table Area */}
            <div className="flex-1 relative my-4 flex items-center justify-center perspective-1000">

                {/* Dealer Avatar (Top Center) */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-4 z-20 flex flex-col items-center">
                    <div className="relative w-24 h-24 rounded-full border-4 border-yellow-600 bg-black overflow-hidden shadow-2xl">
                        <img src="/assets/dealer.png" className="w-full h-full object-cover" onError={(e) => e.target.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dealer'} alt="Dealer" />
                    </div>
                    <div className="bg-black/80 px-3 py-1 rounded-full border border-yellow-600/50 -mt-3 z-30">
                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Croupier</span>
                    </div>
                </div>

                {/* Felt */}
                <div className="w-[90%] aspect-[2/1] bg-[#1a472a] rounded-[200px] border-[16px] border-[#2d2a26] shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] relative flex items-center justify-center">

                    {/* Center Start Button */}
                    {gameState.state === 'WAITING' && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-[180px]">
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
                        {renderChips(gameState.pot, true)}
                        <div className="text-yellow-400 font-mono font-bold bg-black/60 px-4 py-1 rounded-full text-lg border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                            Pot: ${gameState.pot}
                        </div>
                    </div>

                    {/* Seats */}
                    {[0, 1, 2, 4, 5].map(seatIdx => {
                        const player = gameState.seats[seatIdx];
                        const isMe = myPlayer && parseInt(mySeat[0]) === seatIdx;
                        const isActive = gameState.current_player_seat === seatIdx;

                        // Positioning
                        const positions = {
                            0: { bottom: '-40px', left: '50%', transform: 'translateX(-50%)' },
                            1: { bottom: '5%', left: '-40px' },
                            2: { top: '20%', left: '-40px' },
                            4: { top: '20%', right: '-40px' },
                            5: { bottom: '5%', right: '-40px' },
                        };

                        const pos = positions[seatIdx];
                        if (!pos) return null;

                        return (
                            <div key={seatIdx} className={`absolute flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110 z-30' : 'z-20'}`} style={pos}>
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

                                        {/* Avatar */}
                                        <div className={`w-24 h-24 rounded-full border-4 overflow-hidden z-20 bg-[#1a1a2e] ${isActive ? 'border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)]' : 'border-[#2d2a26]'} ${player.is_folded ? 'opacity-50 grayscale' : ''} relative`}>
                                            {player.avatar_url && player.avatar_url.length > 2 ? (
                                                <img src={player.avatar_url} className="w-full h-full object-cover" alt={player.name} onError={(e) => { e.target.onerror = null; e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}` }} />
                                            ) : (
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} className="w-full h-full object-cover" alt="avatar" />
                                            )}

                                            {/* Dealer Button */}
                                            {gameState.dealer_seat === seatIdx && (
                                                <div className="absolute top-0 right-0 bg-white text-black font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm border-2 border-gray-400 shadow-md transform translate-x-2 -translate-y-2">D</div>
                                            )}
                                        </div>

                                        {/* Player Info */}
                                        <div className="bg-[#0f172a]/95 backdrop-blur px-4 py-2 rounded-xl text-center -mt-4 z-30 border border-white/10 min-w-[120px] shadow-xl">
                                            <div className="text-sm font-bold truncate max-w-[120px] text-gray-200">{player.name}</div>
                                            <div className="text-lg text-yellow-500 font-mono font-bold">${player.chips}</div>
                                        </div>

                                        {/* Cards */}
                                        <div className="flex -mt-20 -z-10 filter drop-shadow-xl hover:-translate-y-6 transition-transform duration-300">
                                            {player.hand.map((c, i) => (
                                                <div key={i} className={`transform ${i === 0 ? '-rotate-6 translate-x-2' : 'rotate-6 -translate-x-2'} origin-bottom`}>
                                                    {renderCard(c, i)}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Chips Bet Display */}
                                        {player.current_bet > 0 && (
                                            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-20">
                                                {renderChips(player.current_bet)}
                                            </div>
                                        )}

                                        {/* Action Bubble */}
                                        {player.last_action && (
                                            <div className="absolute top-0 right-0 transform translate-x-full -translate-y-full text-sm font-bold bg-blue-600 px-4 py-2 rounded-xl text-white shadow-lg animate-bounce z-50 border-2 border-blue-400">
                                                {player.last_action}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs">
                                        Empty
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="h-28 relative z-50 flex items-center justify-center">
                {myPlayer && !myPlayer.is_folded && gameState.current_player_seat === parseInt(mySeat[0]) ? (
                    <div className="flex items-end gap-6 bg-[#0f172a]/95 backdrop-blur p-4 rounded-t-3xl border-t border-x border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-6 animate-in slide-in-from-bottom">

                        {/* FOLD / PASS */}
                        <button onClick={() => sendAction('FOLD')} className="group flex flex-col items-center gap-1">
                            <div className="btn bg-red-600 hover:bg-red-500 border-b-4 border-red-900 text-white h-16 w-32 rounded-xl flex items-center justify-center transition-all active:border-b-0 active:translate-y-1 shadow-lg">
                                <span className="text-xl font-bold uppercase">Pass</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Fold</span>
                        </button>

                        {/* CHECK / CALL / HOLD */}
                        <button onClick={() => sendAction(gameState.current_bet > myPlayer.current_bet ? 'CALL' : 'CHECK')} className="group flex flex-col items-center gap-1 -mt-4">
                            <div className="btn bg-green-600 hover:bg-green-500 border-b-4 border-green-900 text-white h-20 w-40 rounded-xl flex flex-col items-center justify-center transition-all active:border-b-0 active:translate-y-1 shadow-xl">
                                <span className="text-2xl font-bold uppercase">{gameState.current_bet > myPlayer.current_bet ? 'Call' : 'Hold'}</span>
                                {gameState.current_bet > myPlayer.current_bet && (
                                    <span className="text-sm font-mono opacity-80">${gameState.current_bet - myPlayer.current_bet}</span>
                                )}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{gameState.current_bet > myPlayer.current_bet ? 'Call' : 'Check'}</span>
                        </button>

                        {/* RAISE / POVYSIT */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg mb-2">
                                <button onClick={() => setBetAmount(Math.max((gameState.current_bet + gameState.min_raise), betAmount - gameState.big_blind))} className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold">-</button>
                                <input
                                    type="number"
                                    className="w-20 bg-transparent text-center font-mono font-bold text-yellow-400 outline-none"
                                    value={betAmount || (gameState.current_bet + gameState.min_raise)}
                                    onChange={(e) => setBetAmount(parseInt(e.target.value))}
                                />
                                <button onClick={() => setBetAmount(betAmount + gameState.big_blind)} className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 text-white font-bold">+</button>
                            </div>
                            <button onClick={() => sendAction('RAISE', { amount: betAmount || (gameState.current_bet + gameState.min_raise) })} className="btn bg-yellow-600 hover:bg-yellow-500 border-b-4 border-yellow-900 text-white h-16 w-32 rounded-xl flex items-center justify-center transition-all active:border-b-0 active:translate-y-1 shadow-lg">
                                <span className="text-xl font-bold uppercase">Raise</span>
                            </button>
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Raise</span>
                        </div>

                    </div>
                ) : (
                    null
                )}
            </div>

            {/* Buy In Modal (Handled in Parent usually, but redundancy check) */}
        </div>
    );
};

const Poker = () => {
    const navigate = useNavigate();
    const [tables, setTables] = useState([]);
    const [currentTableId, setCurrentTableId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [showBuyIn, setShowBuyIn] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [buyInAmount, setBuyInAmount] = useState(1000);

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
        setSelectedTable(table);
        setBuyInAmount(Math.max(table.min_buy || 100, Math.min(table.max_buy || 100000, 1000)));
        setShowBuyIn(true);
    };

    const confirmJoin = () => {
        setCurrentTableId(selectedTable.id);
        setShowBuyIn(false);
    };

    if (currentTableId) {
        return (
            <div className="h-screen w-screen bg-[#0c0c14] overflow-hidden">
                <PokerTable
                    tableId={currentTableId}
                    autoBuyIn={buyInAmount}
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

            {showBuyIn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="glass-card max-w-sm w-full p-6 animate-in zoom-in">
                        <h3 className="text-2xl font-bold mb-4">Buy In</h3>
                        <p className="text-gray-400 text-sm mb-6">Choose how much to bring to the table.</p>

                        <div className="mb-6">
                            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">Amount</label>
                            <input
                                type="number"
                                className="input-field text-center text-2xl font-mono text-yellow-400"
                                value={buyInAmount}
                                onChange={e => setBuyInAmount(Math.min(userBalance, Math.max(selectedTable.min_buy || 100, parseInt(e.target.value) || 0)))}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Min: ${selectedTable?.min_buy || 100}</span>
                                <span>Max: ${Math.min(userBalance, selectedTable?.max_buy || 100000)}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowBuyIn(false)} className="btn-ghost flex-1">Cancel</button>
                            <button onClick={confirmJoin} className="btn-primary flex-1" disabled={buyInAmount > userBalance || buyInAmount < (selectedTable?.min_buy || 100)}>
                                Sit Down
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Poker;
