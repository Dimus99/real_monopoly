import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle, Play, Maximize2, Minimize2, Bot, Trash2 } from 'lucide-react';

const PokerTable = ({ tableId, onLeave, autoBuyIn }) => {
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
                    // Update public state
                    return { ...prev, ...data.state };
                });
            } else if (data.type === 'HAND_UPDATE') {
                // Update private hand
                setGameState(prev => ({
                    ...prev,
                    me: { ...prev.me, hand: data.hand },
                    seats: {
                        ...prev.seats,
                        // If we are seated, update our seat hand too
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

    const renderCard = (card) => {
        if (!card) return <div className="w-10 h-14 bg-blue-900 border border-blue-500 rounded m-1"></div>;
        if (card.rank === '?') return <div className="w-10 h-14 bg-blue-800 border-2 border-blue-400 rounded m-1 flex items-center justify-center text-xs">?</div>;

        const isRed = ['♥', '♦'].includes(card.suit);
        return (
            <div className={`w-12 h-16 bg-white ${isRed ? 'text-red-600' : 'text-black'} rounded m-1 flex flex-col items-center justify-center font-bold text-lg shadow-lg`}>
                <div>{card.rank}</div>
                <div className="text-xl leading-none">{card.suit}</div>
            </div>
        );
    };

    // Calculate time remaining if deadline exists
    const getTimeRemaining = () => {
        if (!gameState.turn_deadline) return 0;
        const total = Date.parse(gameState.turn_deadline) - Date.now();
        return Math.max(0, Math.floor(total / 1000));
    };

    return (
        <div ref={tableRef} className="flex flex-col h-full w-full max-w-7xl mx-auto glass-card p-4 relative bg-[#0f172a] overflow-hidden">
            {/* Top Bar */}
            <div className="flex justify-between items-center z-10">
                <button onClick={() => { sendAction('LEAVE'); onLeave(); }} className="btn-ghost text-sm flex items-center gap-1">
                    <ArrowLeft size={16} /> Leave
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-yellow-400">{gameState.name}</h2>
                    <div className="text-xs text-gray-400">Pot: {gameState.pot} • Blinds: {gameState.small_blind}/{gameState.big_blind}</div>
                </div>
                {/* Header Right */}
                <div className="flex gap-2">
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

            {/* Table Area */}
            <div className="flex-1 relative my-4 flex items-center justify-center">
                {/* Dealer Graphic - Absolute Top Center */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -mt-16 z-0 opacity-80 pointer-events-none">
                    <img src="https://i.ibb.co/60V0Gz8/poker-dealer-girl-1770264455831.png" className="w-64 h-64 object-contain filter drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]" alt="Dealer" />
                </div>

                {/* Felt */}
                <div className="w-[90%] aspect-[2/1] bg-[#1a472a] rounded-[200px] border-[12px] border-[#2d2a26] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] relative flex items-center justify-center">

                    {/* Community Cards */}
                    <div className="flex gap-2 mb-8">
                        {gameState.community_cards.map((c, i) => <div key={i}>{renderCard(c)}</div>)}
                        {Array(5 - gameState.community_cards.length).fill(0).map((_, i) => (
                            <div key={i} className="w-12 h-16 border-2 border-white/5 rounded m-1"></div>
                        ))}
                    </div>

                    {/* Pot Display */}
                    <div className="absolute top-[60%] flex flex-col items-center">
                        <div className="text-yellow-400 font-mono font-bold bg-black/60 px-4 py-1 rounded-full text-lg border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                            Pot: ${gameState.pot}
                        </div>
                    </div>

                    {/* Seats */}
                    {[0, 1, 2, 3, 4, 5].map(seatIdx => {
                        const player = gameState.seats[seatIdx];
                        const isMe = myPlayer && parseInt(mySeat[0]) === seatIdx;
                        const isActive = gameState.current_player_seat === seatIdx;

                        // Positioning
                        const positions = [
                            { top: 'auto', bottom: '-40px', left: '50%', transform: 'translateX(-50%)' }, // 0 (My Seat)
                            { top: 'auto', bottom: '15%', left: '-5%', transform: 'none' }, // 1 (Bottom Left)
                            { top: '15%', bottom: 'auto', left: '-5%', transform: 'none' }, // 2 (Top Left)
                            { top: '-40px', bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }, // 3 (Top)
                            { top: '15%', bottom: 'auto', right: '-5%', transform: 'none' }, // 4 (Top Right)
                            { top: 'auto', bottom: '15%', right: '-5%', transform: 'none' }, // 5 (Bottom Right)
                        ];

                        const pos = positions[seatIdx];

                        return (
                            <div key={seatIdx} className={`absolute flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-110 z-20' : 'z-10'}`} style={pos}>
                                {player ? (
                                    <div className="flex flex-col items-center group relative">
                                        {/* Timer Ring if Active */}
                                        {isActive && (
                                            <>
                                                <div className="absolute w-[115%] h-[115%] -top-[7.5%] -left-[7.5%] border-2 border-yellow-400 rounded-full animate-pulse z-0"></div>
                                                <div className="absolute -bottom-6 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-50 shadow-lg border border-yellow-200">
                                                    {getTimeRemaining()}s
                                                </div>
                                            </>
                                        )}

                                        {/* Cards */}
                                        <div className="flex -mb-6 z-10 filter drop-shadow-xl hover:-translate-y-2 transition-transform">
                                            {player.hand.map((c, i) => (
                                                <div key={i} className={`transform ${i === 0 ? '-rotate-6 translate-x-1' : 'rotate-6 -translate-x-1'} origin-bottom`}>
                                                    {renderCard(c)}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Avatar */}
                                        <div className={`w-20 h-20 rounded-full border-4 overflow-hidden z-20 bg-[#1a1a2e] ${isActive ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : 'border-[#2d2a26]'} ${player.is_folded ? 'opacity-50 grayscale' : ''} relative`}>
                                            {player.avatar_url && player.avatar_url.length > 2 ? (
                                                <img src={player.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">{player.is_bot ? '🤖' : '👤'}</div>
                                            )}

                                            {/* Dealer Button */}
                                            {gameState.dealer_seat === seatIdx && (
                                                <div className="absolute top-0 right-0 bg-white text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs border border-gray-400 shadow-md">D</div>
                                            )}
                                        </div>

                                        {/* Info Box */}
                                        <div className="bg-[#0f172a]/90 backdrop-blur px-4 py-2 rounded-xl text-center -mt-3 z-30 border border-white/10 min-w-[100px] shadow-xl">
                                            <div className="text-xs font-bold truncate max-w-[100px] text-gray-200">{player.name}</div>
                                            <div className="text-sm text-yellow-500 font-mono font-bold">${player.chips}</div>
                                        </div>

                                        {/* Action Balloon */}
                                        {player.last_action && (
                                            <div className="absolute -top-8 right-0 transform translate-x-1/2 text-xs font-bold bg-blue-600 px-3 py-1 rounded-full text-white shadow-lg animate-bounce whitespace-nowrap z-40 border border-blue-400">
                                                {player.last_action}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-white/10 text-xs hover:bg-white/5 transition-colors cursor-pointer">
                                        Empty
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Bar (Bottom) */}
            <div className="h-24 relative mt-auto z-40">
                {myPlayer && !myPlayer.is_folded && gameState.current_player_seat === parseInt(mySeat[0]) ? (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-end gap-3 bg-[#0f172a]/90 backdrop-blur p-4 rounded-2xl border border-white/10 shadow-2xl">
                        {/* Fold */}
                        <button onClick={() => sendAction('FOLD')} className="btn bg-red-600 hover:bg-red-500 border border-red-800 text-white h-16 w-32 rounded-lg flex flex-col items-center justify-center transition-all shadow-[0_5px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1">
                            <span className="text-sm font-bold uppercase tracking-widest">Fold</span>
                        </button>

                        {/* Check/Call */}
                        <button onClick={() => sendAction(gameState.current_bet > myPlayer.current_bet ? 'CALL' : 'CHECK')} className="btn bg-green-600 hover:bg-green-500 border border-green-800 text-white h-20 w-40 rounded-lg flex flex-col items-center justify-center transition-all shadow-[0_5px_0_rgb(22,101,52)] active:shadow-none active:translate-y-1 -mb-2">
                            <span className="text-sm font-bold uppercase tracking-widest">{gameState.current_bet > myPlayer.current_bet ? 'Call' : 'Check'}</span>
                            <span className="text-xl font-bold font-mono">
                                {gameState.current_bet > myPlayer.current_bet ? `$${gameState.current_bet - myPlayer.current_bet}` : '-'}
                            </span>
                        </button>

                        {/* Raise */}
                        <div className="flex flex-col gap-2 items-center">
                            <div className="flex items-center gap-2 bg-black/60 px-2 py-1 rounded-lg border border-white/10 shadow-inner">
                                <button onClick={() => setBetAmount(Math.max((gameState.current_bet + gameState.min_raise), betAmount - gameState.big_blind))} className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded text-white hover:bg-gray-600 font-bold">-</button>
                                <input
                                    type="number"
                                    className="w-24 bg-transparent text-yellow-400 text-center font-bold outline-none font-mono text-lg"
                                    value={betAmount || (gameState.current_bet + gameState.min_raise)}
                                    min={gameState.current_bet + gameState.min_raise}
                                    onChange={(e) => setBetAmount(parseInt(e.target.value))}
                                />
                                <button onClick={() => setBetAmount(betAmount + gameState.big_blind)} className="w-8 h-8 flex items-center justify-center bg-gray-700 rounded text-white hover:bg-gray-600 font-bold">+</button>
                            </div>
                            <button onClick={() => sendAction('RAISE', { amount: betAmount || (gameState.current_bet + gameState.min_raise) })} className="btn bg-yellow-600 hover:bg-yellow-500 border border-yellow-800 text-white h-16 w-32 rounded-lg flex flex-col items-center justify-center transition-all shadow-[0_5px_0_rgb(161,98,7)] active:shadow-none active:translate-y-1">
                                <span className="text-sm font-bold uppercase tracking-widest">Raise</span>
                                <span className="text-lg font-bold font-mono">↑</span>
                            </button>
                        </div>
                    </div>
                ) : myPlayer ? (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 px-6 py-2 rounded-full border border-white/10 backdrop-blur">
                        <span className="text-gray-400 font-bold animate-pulse">Waiting for opponents...</span>
                    </div>
                ) : (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-900/50 px-6 py-2 rounded-full border border-yellow-500/30 backdrop-blur">
                        <span className="text-yellow-500 font-bold">Spectator Mode</span>
                    </div>
                )
                }
            </div >

            {/* Start Button (Dev/Host) */}
            {
                gameState.state === 'WAITING' && Object.keys(gameState.seats).length >= 2 && (
                    <button onClick={() => sendAction('START')} className="absolute bottom-32 right-8 btn-sm bg-green-500 hover:bg-green-400 text-black font-bold flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-green-900/20 z-50 animate-bounce">
                        <Play size={16} fill="black" />
                        Start Hand
                    </button>
                )
            }
        </div >
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

    // Auth token helper
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
                    onLeave={() => setCurrentTableId(null)}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen animated-bg p-6 text-white flex flex-col items-center">
            <div className="max-w-4xl w-full">
                {/* Header */}
                <div className="flex justify-between items-center mb-8 glass-card p-6">
                    <button onClick={() => navigate('/')} className="btn-ghost flex items-center gap-2">
                        <ArrowLeft /> Back
                    </button>
                    <h1 className="text-3xl font-display font-bold text-yellow-400">TEXAS HOLD'EM</h1>
                    <div className="bg-black/40 px-4 py-2 rounded-lg border border-yellow-500/30 flex items-center gap-2 hidden">
                        <span className="text-xs text-gray-400 uppercase">Balance</span>
                        <span className="font-mono font-bold text-xl text-yellow-400">${userBalance}</span>
                    </div>
                </div>

                {/* Tables Grid */}
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

            {/* Buy In Modal */}
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
