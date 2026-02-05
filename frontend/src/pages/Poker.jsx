import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trophy, Users, AlertCircle, Play } from 'lucide-react';

const PokerTable = ({ tableId, onLeave, autoBuyIn }) => {
    const [gameState, setGameState] = useState(null);
    const [socket, setSocket] = useState(null);
    const [betAmount, setBetAmount] = useState(0);
    const [connected, setConnected] = useState(false);
    const messagesEndRef = useRef(null);
    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin);
    const wsBase = API_BASE.replace('http', 'ws');

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

    if (!gameState) return <div className="text-center p-10 text-white">Loading Table...</div>;

    const mySeat = Object.entries(gameState.seats).find(([k, v]) => v.user_id === gameState.me?.user_id);
    const myPlayer = mySeat ? mySeat[1] : null;

    const renderCard = (card) => {
        if (!card) return <div className="w-8 h-12 bg-blue-900 border border-blue-500 rounded m-1"></div>;
        if (card.rank === '?') return <div className="w-8 h-12 bg-blue-800 border-2 border-blue-400 rounded m-1 flex items-center justify-center text-xs">?</div>;

        const isRed = ['♥', '♦'].includes(card.suit);
        return (
            <div className={`w-10 h-14 bg-white ${isRed ? 'text-red-600' : 'text-black'} rounded m-1 flex flex-col items-center justify-center font-bold text-sm shadow-lg`}>
                <div>{card.rank}</div>
                <div className="text-lg leading-none">{card.suit}</div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full max-w-6xl mx-auto glass-card p-4 relative">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => { sendAction('LEAVE'); onLeave(); }} className="btn-ghost text-sm flex items-center gap-1">
                    <ArrowLeft size={16} /> Leave
                </button>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-yellow-400">{gameState.name}</h2>
                    <div className="text-xs text-gray-400">Pot: {gameState.pot} • Blinds: {gameState.small_blind}/{gameState.big_blind}</div>
                </div>
                <div className="w-20"></div>
            </div>

            {/* Table Area */}
            <div className="flex-1 relative bg-green-900/40 rounded-full border-4 border-green-800 my-8 shadow-inner flex items-center justify-center min-h-[400px]">
                {/* Community Cards */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
                    {gameState.community_cards.map((c, i) => <div key={i}>{renderCard(c)}</div>)}
                    {gameState.community_cards.length === 0 && <span className="text-green-500/20 font-bold uppercase tracking-widest">Community Cards</span>}
                </div>

                {/* Pot */}
                <div className="absolute top-[40%] text-yellow-400 font-mono font-bold bg-black/50 px-3 py-1 rounded-full text-xs">
                    POT: {gameState.pot}
                </div>

                {/* Seats */}
                {[0, 1, 2, 3, 4, 5].map(seatIdx => {
                    const player = gameState.seats[seatIdx];
                    const isMe = myPlayer && parseInt(mySeat[0]) === seatIdx;
                    const isActive = gameState.current_player_seat === seatIdx;

                    // Simple positioning (approximate circle)
                    const positions = [
                        { top: 'auto', bottom: '-40px', left: '50%', transform: 'translateX(-50%)' }, // 0 (Bottom - Me mostly)
                        { top: 'auto', bottom: '20px', left: '10px', transform: 'none' }, // 1 (Bottom Left)
                        { top: '20px', bottom: 'auto', left: '10px', transform: 'none' }, // 2 (Top Left)
                        { top: '-40px', bottom: 'auto', left: '50%', transform: 'translateX(-50%)' }, // 3 (Top)
                        { top: '20px', bottom: 'auto', right: '10px', transform: 'none' }, // 4 (Top Right)
                        { top: 'auto', bottom: '20px', right: '10px', transform: 'none' }, // 5 (Bottom Right)
                    ];

                    const pos = positions[seatIdx]; // This needs improved mapping to ensure "Me" is always bottom if we want advanced UI, but simple fixed seats ok.

                    return (
                        <div key={seatIdx} className={`absolute flex flex-col items-center ${isActive ? 'scale-110 z-10' : ''}`} style={pos}>
                            {player ? (
                                <div className={`flex flex-col items-center group relative`}>
                                    {/* Cards */}
                                    <div className="flex -mb-4 z-0">
                                        {player.hand.map((c, i) => <div key={i} className={`transform ${i === 0 ? '-rotate-6' : 'rotate-6'}`}>{renderCard(c)}</div>)}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-16 h-16 rounded-full border-4 overflow-hidden z-10 bg-gray-900 ${isActive ? 'border-yellow-400 shadow-[0_0_15px_yellow]' : 'border-gray-600'} ${player.is_folded ? 'opacity-50 grayscale' : ''}`}>
                                        {player.avatar_url && player.avatar_url.length > 2 ? <img src={player.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                                    </div>

                                    {/* Info */}
                                    <div className="bg-black/80 px-3 py-1 rounded text-center -mt-2 z-20 border border-white/10 min-w-[80px]">
                                        <div className="text-xs font-bold truncate max-w-[80px]">{player.name}</div>
                                        <div className="text-xs text-yellow-400 font-mono">${player.chips}</div>
                                    </div>

                                    {/* Action Text */}
                                    {player.last_action && (
                                        <div className="absolute top-0 right-0 transform translate-x-full text-xs font-bold bg-blue-600 px-2 py-0.5 rounded text-white shadow animate-bounce">
                                            {player.last_action}
                                        </div>
                                    )}

                                    {/* Dealer Button */}
                                    {gameState.dealer_seat === seatIdx && (
                                        <div className="absolute top-0 left-0 bg-white text-black font-bold rounded-full w-5 h-5 flex items-center justify-center text-xs border border-gray-400 shadow-md transform -translate-x-1/2 -translate-y-1/2">D</div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/20 text-xs">Empty</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Logs */}
            <div className="h-24 overflow-y-auto bg-black/30 rounded p-2 text-[10px] text-gray-400 font-mono mb-4 custom-scrollbar">
                {gameState.logs.map((l, i) => (
                    <div key={i}><span className="text-gray-600">[{l.time.split('T')[1].split('.')[0]}]</span> {l.msg}</div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Controls */}
            {myPlayer && !myPlayer.is_folded && gameState.current_player_seat === parseInt(mySeat[0]) ? (
                <div className="flex gap-2 justify-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <button onClick={() => sendAction('FOLD')} className="btn-sm bg-red-600 hover:bg-red-500 text-white font-bold">FOLD</button>
                    <button onClick={() => sendAction('CHECK')} className="btn-sm bg-blue-600 hover:bg-blue-500 text-white font-bold">CHECK</button>
                    <button onClick={() => sendAction('CALL')} className="btn-sm bg-green-600 hover:bg-green-500 text-white font-bold">CALL</button>

                    <div className="flex items-center gap-2 bg-black/40 px-2 rounded">
                        <input
                            type="number"
                            className="w-20 bg-transparent text-white text-center font-bold outline-none"
                            value={betAmount || (gameState.current_bet + gameState.min_raise)}
                            min={gameState.current_bet + gameState.min_raise}
                            onChange={(e) => setBetAmount(parseInt(e.target.value))}
                        />
                        <button onClick={() => sendAction('RAISE', { amount: betAmount })} className="btn-sm bg-yellow-600 hover:bg-yellow-500 text-white font-bold">RAISE</button>
                    </div>
                </div>
            ) : myPlayer ? (
                <div className="text-center font-bold text-gray-500 p-2">Waiting for turn...</div>
            ) : (
                <div className="text-center p-2 text-yellow-500">Spectating Mode (Join via Lobby to play)</div>
            )}

            {/* Start Button (Dev/Host) */}
            {gameState.state === 'WAITING' && Object.keys(gameState.seats).length >= 2 && (
                <button onClick={() => sendAction('START')} className="absolute bottom-4 right-4 btn-sm bg-green-500 text-black font-bold flex items-center gap-1">
                    <Play size={12} /> Start Hand
                </button>
            )}
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
        setShowBuyIn(true);
    };

    const confirmJoin = () => {
        // We actually establish the WS connection first then send JOIN, but logic is inside PokerTable.
        // But PokerTable assumes it's already connected.
        // Actually, logic: Connect WS -> Receive CONNECTED -> Send JOIN action.
        // So we just set currentTableId, and PokerTable handles the WS.
        // But how do we pass buy-in? 
        // We'll pass `initialBuyIn` prop to PokerTable and it will auto-send JOIN?
        // Or better: PokerTable renders. User is 'spectator' initially. Then user sends JOIN via a button inside?
        // User requested "Choose balance when sitting".
        // Let's pass the chosen buy-in to the PokerTable so it can send JOIN command immediately.
        setCurrentTableId(selectedTable.id);
        setShowBuyIn(false);
    };

    // Auto-join wrapper
    const AutoJoinPokerTable = ({ tableId, buyIn, onLeave }) => {
        const [ws, setWs] = useState(null);
        // We need to inject the JOIN message once connected
        // This logic is tricky to standard component. 
        // Simplified: The PokerTable component above waits for connection.
        // We can modify PokerTable to take an optional 'autoJoinBuyIn' prop.

        // Let's modify PokerTable inside the file context (it's in the same file).
        // I will add useEffect to PokerTable to send JOIN if autoJoinBuyIn is present and connected.
        // Actually simplest way is passing it down.
        return <PokerTable tableId={tableId} onLeave={onLeave} />;
    };

    if (currentTableId) {
        return (
            <div className="min-h-screen bg-[#0c0c14] flex items-center justify-center p-4">
                {/* Injecting JOIN logic via a small refactor or just expectation that user clicks? 
                     User said: "Choose balance when connectiong to table". 
                     So connection = Sitting.
                     I need to ensure PokerTable sends JOIN. 
                     I'll edit PokerTable above to handle this.
                 */}
                <PokerTableWithAutoJoin
                    tableId={currentTableId}
                    buyIn={buyInAmount}
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
                    <div className="bg-black/40 px-4 py-2 rounded-lg border border-yellow-500/30 flex items-center gap-2">
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
                                onChange={e => setBuyInAmount(Math.min(userBalance, Math.max(1000, parseInt(e.target.value) || 0)))}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Min: $1000</span>
                                <span>Max: ${userBalance}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setShowBuyIn(false)} className="btn-ghost flex-1">Cancel</button>
                            <button onClick={confirmJoin} className="btn-primary flex-1" disabled={buyInAmount > userBalance || buyInAmount < 1000}>
                                Sit Down
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal wrapper to handle auto-join logic
const PokerTableWithAutoJoin = ({ tableId, buyIn, onLeave }) => {
    const [sentJoin, setSentJoin] = useState(false);

    // We attach a ref to access the socket from parent? No, we modify PokerTable.
    // Let's just Paste PokerTable code here again but slightly modified?
    // No, duplicate code is bad.
    // I can assume PokerTable is smart enough. I will modify the PokerTable definition above to accept buyIn prop.
    // Ah, I cannot modify the definition since I wrote it in the same file block.
    // I will rewrite the PokerTable component in the same file to handle `buyIn`.

    // Re-defining PokerTable for the file content...
    return <PokerTable tableId={tableId} onLeave={onLeave} autoBuyIn={buyIn} />;
};

export default Poker;
