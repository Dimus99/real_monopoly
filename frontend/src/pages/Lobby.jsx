import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Globe, MapPin, Users, Gamepad2, Plus, ArrowRight, LogOut,
    Sparkles, UserPlus, User, MessageCircle, X, Check,
    Copy, Send, Crown, Star, Settings, Bell, Clock
} from 'lucide-react';
import CharacterSelection from '../components/CharacterSelection';

// Character data with abilities
const CHARACTERS = [
    { id: 'Putin', name: 'Putin', country: 'Russia', ability: 'ORESHNIK', abilityDesc: 'Destroy any city', avatar: '/avatars/putin.png', color: '#C41E3A' },
    { id: 'Trump', name: 'Trump', country: 'USA', ability: 'BUYOUT', abilityDesc: 'Hostile takeover', avatar: '/avatars/trump.png', color: '#FF6B35' },
    { id: 'Zelensky', name: 'Zelensky', country: 'Ukraine', ability: 'AID', abilityDesc: 'Collect from all', avatar: '/avatars/zelensky.png', color: '#0057B8' },
    { id: 'Kim', name: 'Kim', country: 'N. Korea', ability: 'NUKE', abilityDesc: 'Threaten neighbors', avatar: '/avatars/kim.png', color: '#8B0000' },
    { id: 'Biden', name: 'Biden', country: 'USA', ability: 'SANCTIONS', abilityDesc: 'Freeze assets', avatar: '/avatars/biden.png', color: '#3C3B6E' },
    { id: 'Xi', name: 'Xi', country: 'China', ability: 'DEBT TRAP', abilityDesc: 'Collect interest', avatar: '/avatars/xi.png', color: '#DE2910' }
];

const MAPS = [
    { id: 'World', name: 'World', icon: Globe, gradient: 'from-blue-600 to-purple-600' },
    { id: 'Ukraine', name: 'Ukraine', icon: MapPin, gradient: 'from-blue-500 to-yellow-400' },
    { id: 'Monopoly1', name: 'Monopoly-One', icon: Gamepad2, gradient: 'from-orange-500 to-red-600' }
];

const MODES = [
    { id: 'abilities', name: 'Способности', icon: Sparkles, desc: 'У каждого героя свои уникальные навыки' },
    { id: 'classic', name: 'Классика', icon: Gamepad2, desc: 'Честная игра без суперспособностей' },
    { id: 'oreshnik_all', name: 'Мир в труху', icon: Send, desc: 'У каждого игрока есть ракета Орешник' }
];

// Friends storage helper
const getFriends = () => JSON.parse(localStorage.getItem('monopoly_friends') || '[]');
const saveFriends = (friends) => localStorage.setItem('monopoly_friends', JSON.stringify(friends));
const getFriendRequests = () => JSON.parse(localStorage.getItem('monopoly_friend_requests') || '[]');
const saveFriendRequests = (requests) => localStorage.setItem('monopoly_friend_requests', JSON.stringify(requests));

const Lobby = () => {
    const navigate = useNavigate();

    // Auth State
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('monopoly_user')) || null);
    const [nameInput, setNameInput] = useState('');

    // Navigation State
    const [activeTab, setActiveTab] = useState('play'); // play, friends
    const [mode, setMode] = useState('menu'); // menu, create, join

    // Game Setup State
    const [character, setCharacter] = useState('Putin');
    const [mapType, setMapType] = useState('World');
    const [gameMode, setGameMode] = useState('abilities');
    const [joinId, setJoinId] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Friends State
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [friendIdInput, setFriendIdInput] = useState('');
    const [myActiveGames, setMyActiveGames] = useState([]);
    const [copied, setCopied] = useState(false);

    // Load friends on mount
    useEffect(() => {
        if (user) {
            // Check for token from new auth system
            if (!localStorage.getItem('monopoly_token')) {
                handleLogout();
                return;
            }
            setFriends(getFriends());
            setFriendRequests(getFriendRequests());
            fetchMyGames();
        }
    }, [user]);

    const fetchMyGames = async () => {
        try {
            const token = localStorage.getItem('monopoly_token');
            if (!token) return;

            const res = await fetch('http://localhost:8000/api/games/my-active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMyActiveGames(data.games || []);
            }
        } catch (e) {
            console.error("Failed to fetch active games", e);
        }
    };

    useEffect(() => {
        if (user) {
            const interval = setInterval(fetchMyGames, 5000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleAuth = async () => {
        if (!nameInput.trim()) return;
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:8000/api/auth/anonymous', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nameInput.trim() })
            });

            if (!res.ok) throw new Error('Auth failed');

            const data = await res.json();
            setUser(data.user);
            localStorage.setItem('monopoly_user', JSON.stringify(data.user));
            localStorage.setItem('monopoly_token', data.token);
        } catch (e) {
            console.error(e);
            alert("Ошибка входа. Проверьте сервер.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('monopoly_user');
        localStorage.removeItem('monopoly_token');
        setMode('menu');
        setActiveTab('play');
    };

    // Add friend by code
    const addFriend = () => {
        if (!friendIdInput.trim()) return;

        // Simulate adding friend (in real app, this would be an API call)
        const newFriend = {
            id: 'friend_' + Math.random().toString(36).substring(7),
            name: 'Player ' + friendIdInput.toUpperCase(),
            friendCode: friendIdInput.toUpperCase(),
            addedAt: Date.now(),
            online: Math.random() > 0.5
        };

        const updatedFriends = [...friends, newFriend];
        setFriends(updatedFriends);
        saveFriends(updatedFriends);
        setFriendIdInput('');
        setShowAddFriend(false);
    };

    // Remove friend
    const removeFriend = (friendId) => {
        const updatedFriends = friends.filter(f => f.id !== friendId);
        setFriends(updatedFriends);
        saveFriends(updatedFriends);
    };

    // Copy friend code
    const copyFriendCode = () => {
        navigator.clipboard.writeText(user?.friendCode || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const createGame = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('monopoly_token');
        try {
            const res = await fetch('http://localhost:8000/api/games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    map_type: mapType,
                    game_mode: gameMode
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Create failed');
            }

            const data = await res.json();
            await joinGame(data.game_id);
        } catch (e) {
            console.error(e);
            alert(`Ошибка создания игры: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const joinGame = async (gameId) => {
        setIsLoading(true);
        const token = localStorage.getItem('monopoly_token');
        try {
            const joinRes = await fetch(`http://localhost:8000/api/games/${gameId}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    character
                })
            });

            if (!joinRes.ok) {
                const err = await joinRes.json();
                // If already in game, just navigate
                if (err.detail === "Already in this game") {
                    const userId = user.id;
                    // We need to fetch game state to get player ID, or just redirect and let GameRoom handle it
                    // But GameRoom needs playerId. 
                    // Let's assume we can fetch game state to find our player ID.
                    const gameRes = await fetch(`http://localhost:8000/api/games/${gameId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const gameData = await gameRes.json();
                    const player = Object.values(gameData.game_state.players).find(p => p.user_id === userId);
                    if (player) {
                        navigate(`/game/${gameId}/${player.id}`);
                        return;
                    }
                }
                throw new Error(err.detail || "Failed to join");
            }

            const joinData = await joinRes.json();
            navigate(`/game/${gameId}/${joinData.player_id}`);
        } catch (e) {
            console.error(e);
            alert(`Ошибка подключения к игре: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };



    // Friend Card Component
    const FriendCard = ({ friend, onRemove, onInvite }) => (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
        >
            <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {friend.name.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${friend.online ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{friend.name}</div>
                <div className="text-xs text-gray-400">
                    {friend.online ? '🟢 В сети' : '⚫ Не в сети'}
                </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onInvite(friend)}
                    className="btn btn-success btn-sm btn-circle"
                    title="Пригласить в игру"
                >
                    <Gamepad2 size={16} />
                </button>
                <button
                    onClick={() => onRemove(friend.id)}
                    className="btn btn-danger btn-sm btn-circle"
                    title="Удалить"
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );

    // --- Auth Screen ---
    if (!user) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 max-w-sm w-full text-center"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl"
                    >
                        <Crown size={40} className="text-white" />
                    </motion.div>

                    <h1 className="font-display text-3xl font-bold text-white mb-1">
                        POLITICAL MONOPOLY
                    </h1>
                    <p className="text-gray-400 text-sm mb-6">Satire Edition</p>

                    <input
                        type="text"
                        className="input-premium w-full mb-4 text-center"
                        placeholder="Введите ваше имя..."
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAuth()}
                        maxLength={16}
                    />

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAuth}
                        className="btn-primary w-full"
                        disabled={!nameInput.trim()}
                    >
                        Начать игру
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    // --- Main Menu ---
    return (
        <div className="min-h-screen animated-bg p-4">
            <div className="max-w-lg mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-6"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-bold text-white">{user.name}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                <Star size={10} className="text-yellow-400" />
                                World Leader
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="btn-ghost"
                    >
                        <LogOut size={20} />
                    </button>
                </motion.div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8 p-1.5 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                    <button
                        onClick={() => { setActiveTab('play'); setMode('menu'); }}
                        className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'play'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg scale-[1.02]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Gamepad2 size={24} />
                        Играть
                    </button>
                    <button
                        onClick={() => setActiveTab('friends')}
                        className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'friends'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-[1.02]'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Users size={24} />
                        Друзья
                        {friends.length > 0 && (
                            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-extrabold shadow-sm ml-2">
                                {friends.length}
                            </span>
                        )}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {/* PLAY TAB */}
                    {activeTab === 'play' && (
                        <motion.div
                            key="play"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            {/* Menu */}
                            {mode === 'menu' && (
                                <div className="space-y-6">
                                    <motion.button
                                        whileHover={{ scale: 1.03, translateY: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setMode('create')}
                                        className="w-full p-8 glass-card flex items-center gap-6 text-left group hover:border-green-400/50 transition-all shadow-card hover:shadow-green-500/20"
                                    >
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <Plus size={40} className="text-white drop-shadow-md" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-2xl font-display font-bold text-white mb-1 group-hover:text-green-300 transition-colors">Создать игру</div>
                                            <div className="text-base text-gray-300">Пригласите друзей</div>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                                            <ArrowRight size={24} className="text-gray-400 group-hover:text-white" />
                                        </div>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.03, translateY: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setMode('join')}
                                        className="w-full p-8 glass-card flex items-center gap-6 text-left group hover:border-blue-400/50 transition-all shadow-card hover:shadow-blue-500/20"
                                    >
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                            <Users size={40} className="text-white drop-shadow-md" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-2xl font-display font-bold text-white mb-1 group-hover:text-blue-300 transition-colors">Присоединиться</div>
                                            <div className="text-base text-gray-300">Введите код игры</div>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <ArrowRight size={24} className="text-gray-400 group-hover:text-white" />
                                        </div>
                                    </motion.button>
                                </div>
                            )}

                            {/* Create Game */}
                            {mode === 'create' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-5"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <button
                                            onClick={() => setMode('menu')}
                                            className="btn-ghost"
                                        >
                                            <ArrowRight size={20} className="rotate-180" />
                                        </button>
                                        <h2 className="text-xl font-bold text-white">Аватар</h2>
                                    </div>

                                    <CharacterSelection
                                        characters={CHARACTERS}
                                        selectedId={character}
                                        onSelect={setCharacter}
                                    />

                                    <div className="pt-2">
                                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Карта</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {MAPS.map(map => (
                                                <motion.button
                                                    key={map.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setMapType(map.id)}
                                                    className={`p-4 rounded-xl flex items-center gap-3 transition-all ${mapType === map.id
                                                        ? `bg-gradient-to-br ${map.gradient} text-white shadow-lg`
                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <map.icon size={24} />
                                                    <span className="font-semibold">{map.name}</span>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Режим игры</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {MODES.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setGameMode(m.id)}
                                                    className={`p-4 rounded-xl flex items-center gap-4 border-2 transition-all text-left ${gameMode === m.id
                                                        ? 'bg-white/10 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]'
                                                        : 'bg-white/5 border-transparent hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${gameMode === m.id ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400'}`}>
                                                        <m.icon size={20} />
                                                    </div>
                                                    <div>
                                                        <div className={`font-bold ${gameMode === m.id ? 'text-white' : 'text-gray-300'}`}>{m.name}</div>
                                                        <div className="text-xs text-gray-500">{m.desc}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={createGame}
                                        disabled={isLoading}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                                            />
                                        ) : (
                                            <>
                                                <Gamepad2 size={22} />
                                                Создать игру
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            )}

                            {/* Join Game */}
                            {mode === 'join' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-5"
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <button
                                            onClick={() => setMode('menu')}
                                            className="btn-ghost"
                                        >
                                            <ArrowRight size={20} className="rotate-180" />
                                        </button>
                                        <h2 className="text-xl font-bold text-white">Код игры</h2>
                                    </div>

                                    <input
                                        type="text"
                                        className="input-premium w-full text-center text-2xl tracking-[0.3em] uppercase font-mono"
                                        placeholder="XXXXXXXX"
                                        value={joinId}
                                        onChange={e => setJoinId(e.target.value.toUpperCase())}
                                        maxLength={8}
                                    />

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-400 mb-3">Ваш аватар</h3>
                                        <CharacterSelection
                                            characters={CHARACTERS}
                                            selectedId={character}
                                            onSelect={setCharacter}
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => joinGame(joinId)}
                                        disabled={isLoading || joinId.length < 8}
                                        className="btn-success w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                                            />
                                        ) : (
                                            <>
                                                <Users size={22} />
                                                Присоединиться
                                            </>
                                        )}
                                    </motion.button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* FRIENDS TAB */}
                    {activeTab === 'friends' && (
                        <motion.div
                            key="friends"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {/* Your Friend Code */}
                            <div className="glass-card p-4">
                                <div className="text-sm text-gray-400 mb-2">Ваш код для друзей</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-black/30 rounded-lg px-4 py-3 font-mono text-xl tracking-widest text-yellow-400">
                                        {user.friendCode}
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={copyFriendCode}
                                        className="btn-ghost"
                                    >
                                        {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                                    </motion.button>
                                </div>
                            </div>

                            {/* Add Friend Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddFriend(true)}
                                className="btn btn-purple w-full py-4 text-base"
                            >
                                <UserPlus size={20} />
                                Добавить друга
                            </motion.button>

                            {/* Friends List */}
                            <div className="space-y-2">
                                <div className="text-sm text-gray-400 mb-2">
                                    Друзья ({friends.length})
                                </div>

                                {friends.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                                        <div>Пока нет друзей</div>
                                        <div className="text-sm">Добавьте друзей по коду</div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {friends.map(friend => (
                                            <FriendCard
                                                key={friend.id}
                                                friend={friend}
                                                onRemove={removeFriend}
                                                onInvite={(f) => {
                                                    setActiveTab('play');
                                                    setMode('create');
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Friend Modal */}
                <AnimatePresence>
                    {showAddFriend && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                            onClick={() => setShowAddFriend(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                onClick={e => e.stopPropagation()}
                                className="glass-card p-6 max-w-sm w-full"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold text-white">Добавить друга</h3>
                                    <button
                                        onClick={() => setShowAddFriend(false)}
                                        className="btn-ghost"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <p className="text-gray-400 text-sm mb-4">
                                    Введите код друга для добавления
                                </p>

                                <input
                                    type="text"
                                    className="input-premium w-full text-center uppercase tracking-widest font-mono text-lg mb-4"
                                    placeholder="XXXXXX"
                                    value={friendIdInput}
                                    onChange={e => setFriendIdInput(e.target.value.toUpperCase())}
                                    maxLength={6}
                                />

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={addFriend}
                                    disabled={friendIdInput.length < 4}
                                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <UserPlus size={18} />
                                    Добавить
                                </motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {myActiveGames.length > 0 && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-white/10 p-4 z-[40] flex flex-col items-center"
                    >
                        <div className="w-full max-w-lg">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <span className="text-xs text-gray-400 uppercase tracking-widest font-black flex items-center gap-2">
                                    <Clock size={14} className="text-yellow-500" /> Активные партии
                                </span>
                                <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full uppercase font-bold">
                                    {myActiveGames.length}
                                </span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar-none mask-fade-sides">
                                {myActiveGames.map(g => (
                                    <motion.button
                                        key={g.game_id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate(`/game/${g.game_id}/${g.player_id}`)}
                                        className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all min-w-[200px] text-left group"
                                    >
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                                <Globe size={20} className="text-blue-400" />
                                            </div>
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-white truncate uppercase tracking-tight">{g.map_type}</div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase">Ход {g.turn} • {g.players_count} игрок.</div>
                                        </div>
                                        <ArrowRight size={16} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </div >
        </div >
    );
};

export default Lobby;
