import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, LogIn, Users, Play, Settings, CreditCard,
    MessageSquare, Music, Volume2, Shield, Search,
    UserPlus, UserCheck, X, RefreshCw
} from 'lucide-react';
import CharacterSelection from '../components/CharacterSelection';
import TelegramLoginButton from '../components/TelegramLoginButton';

const Lobby = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [mode, setMode] = useState('menu'); // menu, create, join, friends, settings
    const [isLoading, setIsLoading] = useState(false);
    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

    // Create Game State
    const [selectedMap, setSelectedMap] = useState('World');
    const [gameMode, setGameMode] = useState('abilities');
    const [maxPlayers, setMaxPlayers] = useState(6);
    const [turnTimer, setTurnTimer] = useState(90);

    // Characters
    const CHARACTERS = [
        { id: 'Putin', name: 'Putin', avatar: '/avatars/putin.png', color: '#C41E3A', ability: 'ORESHNIK', country: 'RU', abilityDesc: 'Launch a rocket that destroys a tile.' },
        { id: 'Trump', name: 'Trump', avatar: '/avatars/trump.png', color: '#FF6B35', ability: 'BUYOUT', country: 'USA', abilityDesc: 'Buy any property even if owned.' },
        { id: 'Zelensky', name: 'Zelensky', avatar: '/avatars/zelensky.png', color: '#0057B8', ability: 'AID', country: 'UA', abilityDesc: 'Collect aid from all players.' },
        { id: 'Kim', name: 'Kim', avatar: '/avatars/kim.png', color: '#8B0000', ability: 'NUKE', country: 'NK', abilityDesc: 'Nuke threat to block rent.' },
        { id: 'Biden', name: 'Biden', avatar: '/avatars/biden.png', color: '#3C3B6E', ability: 'SANCTIONS', country: 'USA', abilityDesc: 'Freeze enemy property profits.' },
        { id: 'Xi', name: 'Xi', avatar: '/avatars/xi.png', color: '#DE2910', ability: 'DEBT', country: 'CN', abilityDesc: 'Ensnare opponent in debt trap.' }
    ];

    // Join Game State
    const [gameIdInput, setGameIdInput] = useState('');
    const [character, setCharacter] = useState('Putin');
    const [activeGames, setActiveGames] = useState([]);

    // Friends State
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friendCodeInput, setFriendCodeInput] = useState('');

    useEffect(() => {
        // --- Telegram Mini App Auto-Auth ---
        const tg = window.Telegram?.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();

            if (tg.initData && !localStorage.getItem('monopoly_token')) {
                console.log("Telegram WebApp detected, attempting auto-auth...");
                setIsLoading(true);
                fetch(`${API_BASE}/api/auth/telegram`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ init_data: tg.initData })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.token) {
                            localStorage.setItem('monopoly_token', data.token);
                            setUser(data.user);
                            setMode('menu');
                        } else {
                            setMode('auth');
                        }
                    })
                    .catch(err => {
                        console.error("Telegram auth failed", err);
                        setMode('auth');
                    })
                    .finally(() => setIsLoading(false));
                return;
            }
        }

        const token = localStorage.getItem('monopoly_token');
        if (!token) {
            setMode('auth');
            return;
        }

        const fetchUser = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    if (mode === 'auth') setMode('menu');
                } else {
                    localStorage.removeItem('monopoly_token');
                    setMode('auth');
                }
            } catch (e) {
                setMode('auth');
            }
        };
        fetchUser();
    }, [navigate, mode]);

    const authFetch = async (url, options = {}) => {
        const token = localStorage.getItem('monopoly_token');
        const res = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return res;
    };

    const fetchFriendsData = async () => {
        try {
            const [friendsRes, requestsRes] = await Promise.all([
                authFetch('/api/friends'),
                authFetch('/api/friends/requests')
            ]);
            if (friendsRes.ok) setFriends(await friendsRes.json());
            if (requestsRes.ok) setFriendRequests(await requestsRes.json());
        } catch (e) { console.error(e); }
    };

    const fetchActiveGames = async () => {
        try {
            const res = await authFetch('/api/games?status=waiting');
            if (res.ok) {
                const data = await res.json();
                setActiveGames(data.games || []);
            }
        } catch (e) { }
    };

    // Resume active games
    const [myGames, setMyGames] = useState([]);
    const fetchMyGames = async () => {
        try {
            // Assuming backend supports filtering or returns my games
            // I will use a dedicated endpoint or parameter
            const res = await authFetch('/api/games/my-active');
            if (res.ok) {
                const data = await res.json();
                setMyGames(data.games || []);
            }
        } catch (e) { }
    };

    useEffect(() => {
        if (mode === 'friends') fetchFriendsData();
        if (mode === 'join' || mode === 'menu') {
            fetchActiveGames();
            fetchMyGames();
        }

        const interval = setInterval(() => {
            if (mode === 'join' || mode === 'menu') {
                fetchActiveGames();
                // fetchMyGames(); // Don't poll my games too often to avoid freeze
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [mode]);

    const createGame = async () => {
        setIsLoading(true);
        try {
            // 1. Create Game
            const createRes = await authFetch('/api/games', {
                method: 'POST',
                body: JSON.stringify({
                    map_type: selectedMap,
                    game_mode: gameMode,
                    max_players: maxPlayers,
                    turn_timer: turnTimer,
                    starting_money: 1500
                })
            });

            if (!createRes.ok) throw new Error('Failed to create game');
            const data = await createRes.json();

            // 2. Join as Host
            await joinGame(data.game_id);

        } catch (err) {
            alert(err.message);
            setIsLoading(false);
        }
    };

    const joinGame = async (gameId) => {
        setIsLoading(true);
        try {
            const res = await authFetch(`/api/games/${gameId}/join`, {
                method: 'POST',
                body: JSON.stringify({ character })
            });

            if (!res.ok) {
                const err = await res.json();
                // Check if already joined (400) -> Just navigate
                if (err.detail === 'Already in this game') {
                    navigate(`/game/${gameId}/${res.ok ? (await res.json()).player_id : ''}`); // Need player ID?
                    // If already in game, we need to find our player ID. 
                    // Usually the backend join response would give it, but if error...
                    // We should just navigate and let GameRoom handle reconnection? 
                    // But GameRoom needs playerId.
                    // Let's assume joining works first time.
                    alert(err.detail);
                    setIsLoading(false);
                    return;
                }
                throw new Error(err.detail || "Failed to join");
            }

            const data = await res.json();
            navigate(`/game/${gameId}/${data.player_id}`);
        } catch (err) {
            alert(err.message);
            setIsLoading(false);
        }
    };

    const sendFriendRequest = async () => {
        if (!friendCodeInput) return;
        try {
            const res = await authFetch('/api/friends/request', {
                method: 'POST',
                body: JSON.stringify({ friend_code: friendCodeInput })
            });
            if (res.ok) {
                alert('Friend request sent!');
                setFriendCodeInput('');
            } else {
                const err = await res.json();
                alert(err.detail);
            }
        } catch (e) { alert('Error sending request'); }
    };

    const handleUpdateProfile = async (newName) => {
        if (!newName || newName.trim().length < 2) return;
        setIsLoading(true);
        try {
            const res = await authFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify({ name: newName.trim() })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                setMode('menu');
                alert('Профиль обновлен!');
            }
        } catch (e) {
            alert('Ошибка при обновлении профиля');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAuth = async (name) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/anonymous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('monopoly_token', data.token);
                setUser(data.user);
                setMode('menu');
            } else {
                alert('Login failed');
            }
        } catch (e) {
            alert('Server error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTelegramLogin = async (tgUser) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/telegram`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ widget_data: tgUser })
            });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('monopoly_token', data.token);
                setUser(data.user);
                setMode('menu');
            } else {
                alert('Telegram login failed');
            }
        } catch (e) {
            alert('Server error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkTelegram = async (tgUser) => {
        setIsLoading(true);
        try {
            const res = await authFetch('/api/auth/link-telegram', {
                method: 'POST',
                body: JSON.stringify({ widget_data: tgUser })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                alert('Telegram аккаунт успешно привязан!');
            } else {
                const data = await res.json();
                alert(data.detail || 'Ошибка при привязке Telegram');
            }
        } catch (e) {
            alert('Server error');
        } finally {
            setIsLoading(false);
        }
    };

    if (mode === 'auth' || !user) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center p-4">
                <div className="glass-card max-w-md w-full p-10 text-center space-y-8 animate-fadeIn">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-display font-black tracking-tighter italic">
                            MONOPOLY <span className="text-yellow-400">X</span>
                        </h1>
                        <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Satire Edition</p>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                            <p className="text-yellow-500 font-mono text-sm animate-pulse">AUTHENTICATING...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block text-left ml-2">Leader Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your name..."
                                    className="input-premium w-full text-center"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            handleAuth(e.target.value.trim());
                                        }
                                    }}
                                />
                            </div>

                            <button
                                onClick={(e) => {
                                    const input = e.target.previousSibling.querySelector('input') || e.target.parentElement.querySelector('input');
                                    if (input && input.value.trim()) handleAuth(input.value.trim());
                                }}
                                className="btn-primary w-full py-4 text-xl"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Entering...' : 'Enter Arena'}
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#1a1a2e] px-2 text-gray-500">Or</span></div>
                            </div>

                            <div className="flex justify-center">
                                <TelegramLoginButton
                                    botName={import.meta.env.VITE_BOT_USERNAME || "PoliticalMonopolyBot"}
                                    dataOnauth={handleTelegramLogin}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#0c0c14] text-white flex flex-col font-sans overflow-hidden relative">
            {/* Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1a1a2e_0%,_#000000_100%)] z-0" />
            <div className="absolute inset-0 opacity-20 z-0 pointer-events-none" style={{ backgroundImage: 'url("/grid-pattern.png")', backgroundSize: '50px 50px' }} />

            {/* Header */}
            <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 glass-card mx-4 mt-4 rounded-xl">
                <div className="flex items-center gap-4">
                    <button onClick={() => setMode('profile')} className="group relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform">
                            <img src={user.avatar_url || "/api/placeholder/48/48"} alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Settings size={10} />
                        </div>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold font-display tracking-wide flex items-center gap-2">
                            {user.name}
                            <button onClick={() => setMode('profile')} className="text-gray-500 hover:text-white transition-colors">
                                <Settings size={14} />
                            </button>
                        </h2>
                        <div className="text-xs text-purple-400 font-mono tracking-wider flex items-center gap-2">
                            CODE: <span className="text-white font-bold select-all">{user.friend_code}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Earnings</div>
                        <div className="text-xl font-mono font-bold text-green-400">${user.stats?.total_earnings?.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                {mode === 'menu' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                        <button onClick={() => setMode('create')} className="group relative h-64 glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl border border-white/10 hover:border-purple-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                <Plus size={40} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Create Game</h3>
                                <p className="text-sm text-gray-400">Host a new match active diplomacy</p>
                            </div>
                        </button>

                        <button onClick={() => setMode('join')} className="group relative h-64 glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl border border-white/10 hover:border-blue-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                <LogIn size={40} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Join Game</h3>
                                <p className="text-sm text-gray-400">Enter code to join lobby</p>
                            </div>
                        </button>

                        <button onClick={() => setMode('friends')} className="group relative h-64 glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl border border-white/10 hover:border-green-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                            {friendRequests.length > 0 && (
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                                    {friendRequests.length}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                <Users size={40} className="text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Friends</h3>
                                <p className="text-sm text-gray-400">Manage friends & invites</p>
                            </div>
                        </button>

                        {/* Open Lobbies Panel (New Feature) */}
                        <div className="col-span-1 md:col-span-3 glass-card p-6 mt-4">
                            {/* My Active Games Section */}
                            {myGames.length > 0 && (
                                <div className="mb-8 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                                    <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-purple-300">
                                        <Play size={20} /> Your Active Matches
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {myGames.map(game => (
                                            <div key={game.game_id} className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/50 p-4 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <div className="font-mono font-bold text-lg text-white">#{game.game_id.substring(0, 6)}</div>
                                                    <div className="text-xs text-purple-200 mt-1">Turn: {game.turn} • {game.status}</div>
                                                </div>
                                                <button
                                                    onClick={() => navigate(`/game/${game.game_id}/${user.id}`)} // Assuming user.id is correct player_id link? 
                                                    // Wait, player_id in game is NOT user.id usually (it's random ID or mapped).
                                                    // I need to know the PLAYER ID for this game.
                                                    // Backend /api/games/my should return { game_id, player_id }?
                                                    // I'll assume game object has 'my_player_id' field injected by backend.
                                                    className="btn-sm btn-primary"
                                                >
                                                    Resume
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2"><Globe size={20} className="text-blue-400" /> Open Public Lobbies</h3>
                                <button onClick={fetchActiveGames} className="p-2 hover:bg-white/10 rounded-full"><RefreshCw size={16} /></button>
                            </div>

                            {activeGames.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">No active public games found. Create one!</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {activeGames.map(game => (
                                        <div key={game.game_id} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all flex justify-between items-center group">
                                            <div>
                                                <div className="font-mono font-bold text-lg text-purple-400">#{game.game_id.substring(0, 6)}</div>
                                                <div className="text-xs text-gray-400 mt-1">{game.map_type} • {game.player_count}/{game.max_players} Players</div>
                                            </div>
                                            <button
                                                onClick={() => { setMode('join'); setGameIdInput(game.game_id); }}
                                                className="btn-sm btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                Join
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Create Mode */}
                {mode === 'create' && (
                    <div className="glass-card max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold font-display">Create Match</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost p-2 rounded-full hover:bg-white/10"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Выберите карту</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'World', name: 'Мировая карта' },
                                        { id: 'Ukraine', name: 'Украина' },
                                        { id: 'Monopoly1', name: 'Монополия One' }
                                    ].map(m => (
                                        <button key={m.id} onClick={() => setSelectedMap(m.id)} className={`p-4 rounded-xl border text-sm font-bold transition-all ${selectedMap === m.id ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Game Mode</label>
                                <div className="flex gap-4">
                                    <button onClick={() => setGameMode('abilities')} className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${gameMode === 'abilities' ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-gray-400'}`}>Abilities</button>
                                    <button onClick={() => setGameMode('oreshnik_all')} className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${gameMode === 'oreshnik_all' ? 'bg-red-600/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] text-red-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>Oreshnik All</button>
                                    <button onClick={() => setGameMode('classic')} className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${gameMode === 'classic' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>Classic</button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="label">Turn Timer</label>
                            <div className="flex gap-4">
                                {[
                                    { val: 60, label: '60s' },
                                    { val: 90, label: '90s' },
                                    { val: 0, label: 'No Limit' }
                                ].map(opt => (
                                    <button
                                        key={opt.val}
                                        onClick={() => setTurnTimer(opt.val)}
                                        className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${turnTimer === opt.val ? 'bg-yellow-600/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-white/5 border-white/10 text-gray-400'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Choose Your Leader</label>
                            <CharacterSelection characters={CHARACTERS} selectedId={character} onSelect={setCharacter} />
                        </div>

                        <button onClick={createGame} disabled={isLoading} className="btn-primary w-full py-4 text-xl font-bold shadow-lg shadow-purple-900/20">
                            {isLoading ? 'Creating...' : 'Launch Game'}
                        </button>
                    </div>
                )}

                {/* Join Mode */}
                {mode === 'join' && (
                    <div className="glass-card max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold font-display">Join Game</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label">Game ID</label>
                                <input
                                    value={gameIdInput}
                                    onChange={e => setGameIdInput(e.target.value.toUpperCase())}
                                    className="input-field text-center font-mono text-2xl tracking-widest uppercase"
                                    placeholder="ABCD123"
                                    maxLength={8}
                                />
                            </div>

                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Select Leader</label>
                                <CharacterSelection characters={CHARACTERS} selectedId={character} onSelect={setCharacter} />
                            </div>

                            <button onClick={() => joinGame(gameIdInput)} disabled={isLoading || !gameIdInput} className="btn-primary w-full py-4 text-xl font-bold">
                                {isLoading ? 'Joining...' : 'Enter Lobby'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Friends Mode */}
                {mode === 'friends' && (
                    <div className="glass-card max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold font-display">Friends Center</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost"><X /></button>
                        </div>

                        <div className="flex gap-2 mb-8">
                            <input
                                value={friendCodeInput}
                                onChange={e => setFriendCodeInput(e.target.value.toUpperCase())}
                                placeholder="Enter Friend Code (e.g. A1B2C3)"
                                className="input-field flex-1 font-mono uppercase"
                                maxLength={6}
                            />
                            <button onClick={sendFriendRequest} className="btn-primary px-6"><UserPlus size={20} /></button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {friendRequests.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-2">Requests</h3>
                                    {friendRequests.map(req => (
                                        <div key={req.id} className="bg-white/10 p-3 rounded-lg flex justify-between items-center border border-purple-500/30">
                                            <div className="font-bold">{req.from_user?.name}</div>
                                            <div className="flex gap-2">
                                                <button onClick={() => authFetch(`/api/friends/requests/${req.id}/accept`, { method: 'POST' }).then(fetchFriendsData)} className="p-1 bg-green-500 rounded hover:bg-green-600"><UserCheck size={16} /></button>
                                                <button onClick={() => authFetch(`/api/friends/requests/${req.id}/reject`, { method: 'POST' }).then(fetchFriendsData)} className="p-1 bg-red-500 rounded hover:bg-red-600"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-2">My Friends</h3>
                            {friends.length === 0 ? <div className="text-gray-500 text-center py-4">No friends yet. Add someone!</div> :
                                friends.map(f => (
                                    <div key={f.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs">{f.name[0]}</div>
                                            <div>
                                                <div className="font-bold text-sm">{f.name}</div>
                                                <div className="text-[10px] text-gray-500 font-mono">#{f.friend_code}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-green-400">Online</div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* Profile Mode */}
                {mode === 'profile' && (
                    <div className="glass-card max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold font-display">Profile</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost"><X /></button>
                        </div>

                        <div className="flex flex-col items-center mb-8">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500 shadow-2xl mb-4">
                                <img src={user.avatar_url || "/api/placeholder/96/96"} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold">{user.name}</h3>
                            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">#{user.friend_code}</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Display Name</label>
                                <input
                                    type="text"
                                    defaultValue={user.name}
                                    className="input-field"
                                    placeholder="Enter new name..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            handleUpdateProfile(e.target.value.trim());
                                        }
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Wins</div>
                                    <div className="text-2xl font-mono font-bold text-yellow-500">{user.stats?.wins}</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Games</div>
                                    <div className="text-2xl font-mono font-bold text-blue-500">{user.stats?.games_played}</div>
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    const input = e.target.parentElement.querySelector('input');
                                    handleUpdateProfile(input.value);
                                }}
                                className="btn-primary w-full py-4 font-bold"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </button>

                            {!user.telegram_id && (
                                <div className="mt-8 p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center">
                                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Привязать Telegram</h4>
                                    <p className="text-xs text-gray-400 mb-6">Привяжите аккаунт, чтобы сохранять прогресс и играть через Telegram Mini App.</p>
                                    <div className="flex justify-center">
                                        <TelegramLoginButton
                                            botName={import.meta.env.VITE_BOT_USERNAME || "PoliticalMonopolyBot"}
                                            dataOnauth={handleLinkTelegram}
                                        />
                                    </div>
                                </div>
                            )}

                            {user.telegram_id && (
                                <div className="mt-8 p-6 bg-green-500/10 rounded-2xl border border-green-500/20 flex items-center justify-center gap-2">
                                    <UserCheck className="text-green-400" size={20} />
                                    <span className="text-sm font-bold text-green-400">Telegram привязан</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

// Simple globe icon mock
const Globe = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);

export default Lobby;
