import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, LogIn, Users, Play, Settings, CreditCard,
    MessageSquare, Music, Volume2, Shield, Search,
    UserPlus, UserCheck, X, RefreshCw, Camera, Smile, Check
} from 'lucide-react';
import CharacterSelection from '../components/CharacterSelection';
import TelegramLoginButton from '../components/TelegramLoginButton';

const WhoAmIAnimation = React.lazy(() => import('../components/WhoAmIAnimation'));

// Helper component
const Globe = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
);

// Character data constant
const LOBBY_CHARACTERS = [
    { id: 'Putin', name: 'Путин', avatar: '/avatars/putin.png', color: '#C41E3A', ability: 'ORESHNIK', abilityName: 'Орешник', country: 'RU', abilityDesc: 'Запустить ракету, уничтожающую клетку.' },
    { id: 'Trump', name: 'Трамп', avatar: '/avatars/trump.png', color: '#FF6B35', ability: 'BUYOUT', abilityName: 'Рейдерский Захват', country: 'USA', abilityDesc: 'Купить любую недвижимость, даже чужую.' },
    { id: 'Zelensky', name: 'Зеленский', avatar: '/avatars/zelensky.png', color: '#0057B8', ability: 'AID', abilityName: 'Помощь Запада', country: 'UA', abilityDesc: 'Собрать помощь со всех игроков.' },
    { id: 'Kim', name: 'Ким', avatar: '/avatars/kim.png', color: '#8B0000', ability: 'NUKE', abilityName: 'Ядерная Угроза', country: 'NK', abilityDesc: 'Ядерная угроза блокирует аренду.' },
    { id: 'Biden', name: 'Байден', avatar: '/avatars/biden.png', color: '#3C3B6E', ability: 'SANCTIONS', abilityName: 'Санкции', country: 'USA', abilityDesc: 'Заморозить оппонента: он пропустит следующий ход.' },
    { id: 'Xi', name: 'Си', avatar: '/avatars/xi.png', color: '#DE2910', ability: 'DEBT', abilityName: 'Пояс и Путь', country: 'CN', abilityDesc: 'Получить по $50 за каждый свой город.' },
    { id: 'Netanyahu', name: 'Нетаньяху', avatar: '/avatars/israel.png', color: '#0038b8', ability: 'TELEPORT', abilityName: 'Манёвры', country: 'IL', abilityDesc: 'Стратегический ход: перемещение в любую точку.' },
    { id: 'BinLaden', name: 'Бен Ладен', avatar: '/avatars/binladen.png', color: '#2F4F4F', ability: 'SEPTEMBER_11', abilityName: '11 Сентября', country: 'AF', abilityDesc: 'Уничтожить 2 соседних поля (Башни-близнецы).' }
];

const getApiBase = () => {
    let base = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin);
    if (base && !base.startsWith('http')) {
        base = `https://${base}`;
    }
    return base.replace(/\/$/, '');
};

const Lobby = () => {
    const randomAnecdote = React.useMemo(() => {
        const quotes = [
            "Хочешь сделать хорошо? Сделай хреново, но переделывай до дедлайна.",
            "Деньги не пахнут, но их отсутствие воняет безысходностью.",
            "Купил биткоин по 69k? Молодец, теперь ты инвестор.",
            "Работа не волк, работа — это work.",
            "Если долго смотреть на коден, коден начинает смотреть на тебя.",
            "Главное в монополии — не победа, а чтобы друзья не побили.",
            "Заплатил налоги? А теперь заплати за то, что заплатил.",
            "В этой жизни ты либо акула, либо корм для рыбок.",
            "Счастье не в деньгах, а в их количестве на моем счету.",
            "Продам гараж. Дорого. Без документов."
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }, []);

    const API_BASE = React.useMemo(() => getApiBase(), []);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [mode, setMode] = useState('auth'); // Default to auth to force initialization
    const [isLoading, setIsLoading] = useState(false);
    const [showTelegramLogin, setShowTelegramLogin] = useState(false);
    const [showWhoAmI, setShowWhoAmI] = useState(false);

    // Check if we are in Mini App environment more robustly
    const [isMiniApp, setIsMiniApp] = useState(false);

    // Create Game State
    const [selectedMap, setSelectedMap] = useState('World');
    const [gameMode, setGameMode] = useState('abilities');
    const [maxPlayers, setMaxPlayers] = useState(6);
    const [turnTimer, setTurnTimer] = useState(90);



    // Join Game State
    const [gameIdInput, setGameIdInput] = useState('');
    const [character, setCharacter] = useState('Putin');
    const [activeGames, setActiveGames] = useState([]);
    const [profileName, setProfileName] = useState('');

    // Friends State
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [gameInvites, setGameInvites] = useState([]);
    const [friendCodeInput, setFriendCodeInput] = useState('');

    const [isInitializing, setIsInitializing] = useState(true);

    // Unified Login Handler
    const handleTelegramLogin = useCallback(async (data) => {
        if (!data) {
            console.warn("DEBUG AUTH: handleTelegramLogin called with no data");
            return;
        }
        setIsLoading(true);
        console.log("DEBUG AUTH: Starting handleTelegramLogin with payload:", data);

        try {
            const body = {};
            if (data.hash && data.id) {
                console.log("DEBUG AUTH: [handleTelegramLogin] Widget data format");
                body.widget_data = data;
            } else if (typeof data === 'string' || data.init_data) {
                console.log("DEBUG AUTH: [handleTelegramLogin] Mini App data format");
                body.init_data = typeof data === 'string' ? data : data.init_data;
            } else {
                console.error("DEBUG AUTH: [handleTelegramLogin] Unknown data format:", data);
                setIsLoading(false);
                return;
            }

            const endpoint = `${API_BASE}/api/auth/telegram`;
            console.log("DEBUG AUTH: [handleTelegramLogin] ATTEMPTING FETCH to:", endpoint);
            console.log("DEBUG AUTH: [handleTelegramLogin] Body keys:", Object.keys(body));

            let res;
            try {
                res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
            } catch (networkErr) {
                console.error("DEBUG AUTH: [handleTelegramLogin] FETCH FAILED completely:", networkErr);
                alert("Сетевая ошибка при запросе к серверу. Проверьте соединение.");
                throw networkErr;
            }

            console.log("DEBUG AUTH: [handleTelegramLogin] Server response status:", res.status);

            if (res.ok) {
                const authData = await res.json();
                console.log("DEBUG AUTH: [handleTelegramLogin] SUCCESS! User name:", authData.user.name);
                console.log("DEBUG AUTH: [handleTelegramLogin] Token stored in localStorage");
                localStorage.setItem('monopoly_token', authData.token);
                setProfileName(authData.user.name);
                setUser(authData.user);
                setMode('menu');
            } else {
                let errorData = {};
                try { errorData = await res.json(); } catch (e) { console.warn("DEBUG AUTH: Failed to parse error JSON"); }
                console.error(`DEBUG AUTH: [handleTelegramLogin] SERVER ERROR. Status: ${res.status}, Detail:`, errorData.detail || errorData);
                alert(`Ошибка (${res.status}): ${typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail) || 'Сервер отклонил вход'}`);
                setMode('auth');
            }
        } catch (err) {
            console.error("DEBUG AUTH: [handleTelegramLogin] Request error:", err);
            alert("Ошибка сети при входе: " + err.message);
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE]);

    const handleGuestLogin = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/guest`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('monopoly_token', data.token);
                setUser(data.user);
                setMode('menu');
            } else {
                alert("Вход гостем запрещен или не удался.");
            }
        } catch (e) {
            alert("Ошибка сети " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Telegram auth callback is handled by TelegramLoginButton component
    // through setting window.onTelegramAuth when it mounts.

    useEffect(() => {
        const init = async () => {
            console.log("DEBUG AUTH: [Init] Starting initialization...");

            // Check for Telegram WebApp
            const tg = window.Telegram?.WebApp;

            // Update Mini App status state
            if (tg && (tg.initData || tg.platform !== 'unknown')) {
                setIsMiniApp(true);
            }

            // --- 0. CHECK URL SCAN FOR REDIRECT AUTH ---
            const urlParams = new URLSearchParams(window.location.search);
            const tgId = urlParams.get('id');
            const tgHash = urlParams.get('hash');

            if (tgId && tgHash) {
                console.log("DEBUG AUTH: [Init] Detected redirect data in URL");
                const tgData = {};
                urlParams.forEach((value, key) => { tgData[key] = value; });
                window.history.replaceState({}, document.title, window.location.pathname);
                await handleTelegramLogin(tgData);
                setIsInitializing(false);
                return;
            }

            // --- 1. MINI APP AUTO-AUTH ---
            if (tg) {
                console.log("DEBUG AUTH: [Init] Telegram WebApp detected. Platform:", tg.platform);

                // Sometimes initData takes a moment to be available
                let initData = tg.initData;

                // Fallback: check the fragment manually if tg.initData is empty
                if (!initData && window.location.hash) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    initData = hashParams.get('tgWebAppData');
                    if (initData) console.log("DEBUG AUTH: [Init] Found initData in fragment fallback");
                }

                if (initData) {
                    console.log("DEBUG AUTH: [Init] Mini App initData found, authenticating...");
                    tg.ready();
                    tg.expand();
                    await handleTelegramLogin(initData);
                    setIsInitializing(false);
                    return;
                } else {
                    console.log("DEBUG AUTH: [Init] WebApp detected but no initData found yet");
                    // If it's a known telegram platform but no initData, we might want to wait a bit
                    if (tg.platform !== 'unknown') {
                        console.log("DEBUG AUTH: [Init] Known TG platform, waiting for initData...");
                        // Brief wait to see if it populates
                        await new Promise(r => setTimeout(r, 500));
                        if (tg.initData) {
                            console.log("DEBUG AUTH: [Init] initData populated after wait!");
                            tg.ready();
                            tg.expand();
                            await handleTelegramLogin(tg.initData);
                            setIsInitializing(false);
                            return;
                        }
                    }
                }
            }

            // --- 2. TOKEN VALIDATION ---
            const token = localStorage.getItem('monopoly_token');
            if (token) {
                try {
                    console.log("DEBUG AUTH: [Init] Found saved token, validating with /api/users/me");
                    const res = await fetch(`${API_BASE}/api/users/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        console.log("DEBUG AUTH: [Init] Token VALID! User:", data.name);
                        setUser(data);
                        setProfileName(data.name);
                        setMode('menu');
                        setIsInitializing(false);
                        return;
                    } else {
                        console.log("DEBUG AUTH: [Init] Token INVALID or EXPIRED (status:", res.status, ")");
                        localStorage.removeItem('monopoly_token');
                    }
                } catch (e) {
                    console.error("DEBUG AUTH: [Init] Network error during token validation:", e);
                }
            } else {
                console.log("DEBUG AUTH: [Init] No saved token in localStorage");
            }

            console.log("DEBUG AUTH: [Init] Final fallback: showing Auth Screen");
            setMode('auth');
            setIsInitializing(false);
        };

        if (isInitializing) {
            init();
        }
    }, [handleTelegramLogin, API_BASE]); // Initial init should only depend on basic auth setup

    // Handle Telegram Deep Links (Invites)
    useEffect(() => {
        if (user && (mode === 'menu' || mode === 'join')) {
            const tg = window.Telegram?.WebApp;
            const startParam = tg?.initDataUnsafe?.start_param;
            if (startParam && startParam !== window._handledStartParam) {
                console.log("DEBUG AUTH: Detected Telegram start_param:", startParam);
                window._handledStartParam = startParam;
                setGameIdInput(startParam.toUpperCase());
                setMode('join');
            }
        }
    }, [user, mode]);

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
            const [friendsRes, requestsRes, invitesRes] = await Promise.all([
                authFetch('/api/friends'),
                authFetch('/api/friends/requests'),
                authFetch('/api/games/invites/pending')
            ]);
            if (friendsRes.ok) setFriends(await friendsRes.json());
            if (requestsRes.ok) setFriendRequests(await requestsRes.json());
            if (invitesRes.ok) {
                const data = await invitesRes.json();
                setGameInvites(data.invites || []);
            }
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
        let interval;
        if (mode === 'menu' || mode === 'join') {
            fetchActiveGames();
            interval = setInterval(fetchActiveGames, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [mode]);

    useEffect(() => {
        if (mode === 'menu' || mode === 'friends' || mode === 'profile') {
            fetchFriendsData();
        }
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

            if (!createRes.ok) throw new Error('Не удалось создать игру');
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
                throw new Error(err.detail || "Не удалось войти");
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
                alert('Запрос отправлен!');
                setFriendCodeInput('');
            } else {
                const err = await res.json();
                alert(err.detail);
            }
        } catch (e) { alert('Ошибка отправки запроса'); }
    };

    const respondToFriendRequest = async (requestId, action) => {
        const endpoint = action === 'accept' ? 'accept' : 'reject';
        try {
            await authFetch(`/api/friends/requests/${requestId}/${endpoint}`, {
                method: 'POST'
            });
            fetchFriendsData();
        } catch (e) { console.error(e); }
    };

    const respondToGameInvite = async (inviteId, action) => {
        // Only valid for declining here since accepting involves joining
        if (action === 'accept') return;
        try {
            await authFetch(`/api/games/invites/${inviteId}/decline`, {
                method: 'POST'
            });
            fetchFriendsData();
        } catch (e) { console.error(e); }
    };

    const handleUpdateName = async (newName) => {
        const nameToSubmit = newName || profileName;
        if (!nameToSubmit || nameToSubmit.trim().length < 2) return;
        setIsLoading(true);
        try {
            const res = await authFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify({ name: nameToSubmit.trim() })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                setProfileName(updatedUser.name);
                alert('Имя обновлено!');
            } else {
                const err = await res.json();
                alert(err.detail || 'Ошибка при обновлении');
            }
        } catch (e) {
            alert('Ошибка при обновлении профиля');
        } finally {
            setIsLoading(false);
        }
    };



    const handleEmojiSelect = async (emoji) => {
        setIsLoading(true);
        try {
            const res = await authFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify({ avatar_url: emoji })
            });
            if (res.ok) {
                const updatedUser = await res.json();
                setUser(updatedUser);
                alert('Смайлик установлен!');
            }
        } catch (e) {
            alert('Ошибка при смене смайлика');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('monopoly_token');
        setUser(null);
        setMode('auth');
    };




    const handleLinkTelegram = useCallback(async (tgUser) => {
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
            alert('Ошибка сервера');
        } finally {
            setIsLoading(false);
        }
    }, [API_BASE]);

    if (isInitializing) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (mode === 'auth' || !user) {
        return (
            <div className="min-h-screen animated-bg flex items-center justify-center p-4">
                <div className="glass-card max-w-md w-full p-10 text-center space-y-8 animate-fadeIn">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-display font-black tracking-tighter italic">
                            MONOPOLY <span className="text-yellow-400">X</span>
                        </h1>
                        <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Сатирическое Издание</p>
                    </div>

                    <div className="space-y-6">
                        <div className={`flex flex-col items-center animate-in fade-in zoom-in duration-300 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                            <TelegramLoginButton
                                botName={import.meta.env.VITE_BOT_USERNAME || "monopoly_haha_bot"}
                                dataOnauth={handleTelegramLogin}
                            />

                            <div className="mt-6 flex flex-col items-center gap-3">
                                <div className="text-[11px] text-gray-500 font-mono tracking-widest uppercase text-center">
                                    {isLoading ? 'Авторизация...' : 'Безопасная авторизация через Telegram'}
                                </div>

                                {import.meta.env.DEV && (
                                    <button
                                        onClick={handleGuestLogin}
                                        className="text-xs text-yellow-500/50 hover:text-yellow-500 underline underline-offset-4 transition-colors font-mono uppercase"
                                    >
                                        [Отладка] Вход Гостем
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
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
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)] group-hover:scale-105 transition-transform bg-[#1a1a2e] flex items-center justify-center text-2xl">
                            {user.avatar_url && (user.avatar_url.startsWith('http') || user.avatar_url.startsWith('/')) ? (
                                <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <span>{user.avatar_url || '👤'}</span>
                            )}
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
                            КОД: <span className="text-white font-bold select-all">{user.friend_code}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-right hidden sm:block max-w-xs">
                        <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Анекдот</div>
                        <div className="text-sm font-mono font-bold text-green-400 leading-tight italic">"{randomAnecdote}"</div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
                {mode === 'menu' && (
                    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl px-4 items-start">
                        {/* LEFT SIDEBAR: Friends & Activity */}
                        <div className="hidden lg:flex flex-col gap-4 w-72 shrink-0 h-[calc(100vh-140px)] sticky top-6 overflow-y-auto scrollbar-hide pb-6 pl-1">

                            {/* 1. Requests */}
                            {friendRequests.length > 0 && (
                                <div className="glass-card p-4 animate-in fade-in slide-in-from-left-4 border border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/10">
                                    <h3 className="text-xs font-bold text-red-300 uppercase mb-3 flex items-center justify-between tracking-wider">
                                        Запросы <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] shadow">{friendRequests.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {friendRequests.map(req => (
                                            <div key={req.id} className="bg-black/40 p-2 rounded-lg flex items-center justify-between border border-white/5 backdrop-blur-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs border border-white/10">👤</div>
                                                    <span className="text-xs font-bold truncate text-gray-200">{req.from_user_name || 'Неизвестный'}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => respondToFriendRequest(req.id, 'accept')} className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors"><Check size={12} /></button>
                                                    <button onClick={() => respondToFriendRequest(req.id, 'reject')} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"><X size={12} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 2. Invites */}
                            {gameInvites.length > 0 && (
                                <div className="glass-card p-4 animate-in fade-in slide-in-from-left-4 border border-blue-500/30 bg-blue-500/5 shadow-lg shadow-blue-500/10">
                                    <h3 className="text-xs font-bold text-blue-300 uppercase mb-3 flex items-center justify-between tracking-wider">
                                        Приглашения <span className="bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px] shadow">{gameInvites.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {gameInvites.map(inv => (
                                            <div key={inv.id} className="bg-black/40 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                                                <div className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">🎮 От <span className="text-white font-bold">{inv.from_user_name}</span></div>
                                                <div className="font-mono font-bold text-blue-400 mb-2 bg-blue-500/10 px-2 py-1 rounded inline-block">#{inv.game_id.substring(0, 6)}...</div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setMode('join'); setGameIdInput(inv.game_id); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded text-xs font-bold transition-all shadow-lg shadow-blue-600/20">Войти</button>
                                                    <button onClick={() => respondToGameInvite(inv.id, 'decline')} className="px-2 hover:bg-white/10 text-gray-500 rounded transition-colors"><X size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 3. Friend Lobbies */}
                            {activeGames.filter(g => friends.some(f => f.id === g.host_id)).length > 0 && (
                                <div className="glass-card p-4 border border-purple-500/30 bg-purple-500/5 animate-in fade-in slide-in-from-left-4">
                                    <h3 className="text-xs font-bold text-purple-300 uppercase mb-3 flex items-center gap-2 tracking-wider">
                                        <Play size={12} /> Игры друзей
                                    </h3>
                                    <div className="space-y-2">
                                        {activeGames.filter(g => friends.some(f => f.id === g.host_id)).map(game => (
                                            <button key={game.game_id} onClick={() => { setMode('join'); setGameIdInput(game.game_id); }} className="w-full text-left bg-black/40 hover:bg-purple-500/10 p-2 rounded-lg border border-white/5 hover:border-purple-500/30 transition-all group shadow-md">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] border border-purple-500/30">👾</div>
                                                    <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">{game.host_name}</span>
                                                </div>
                                                <div className="flex justify-between items-end mt-1">
                                                    <span className="text-[10px] text-gray-500">{game.map_type}</span>
                                                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1 rounded">{game.player_count}/{game.max_players}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 4. Friends List */}
                            <div className="glass-card flex-1 p-4 min-h-[250px] flex flex-col border border-white/5">
                                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest flex justify-between items-center">
                                    Онлайн
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${friends.filter(f => f.is_online).length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-500'}`}>{friends.filter(f => f.is_online).length}</span>
                                </h3>

                                {friends.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 opacity-50 space-y-2">
                                        <Users size={24} className="mb-1 opacity-50" />
                                        <p className="text-[10px] uppercase tracking-widest">Список пуст</p>
                                        <button onClick={() => setMode('additional')} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">Добавить друга</button>
                                    </div>
                                ) : (
                                    <div className="space-y-1 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                                        {friends.sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0)).map(f => (
                                            <div key={f.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group transition-colors cursor-pointer">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-[#1a1a2e] border border-white/10 overflow-hidden flex items-center justify-center shadow-lg">
                                                        {f.avatar_url && f.avatar_url.length > 2 ? <img src={f.avatar_url} className="w-full h-full object-cover" /> : <span className="text-xs">👤</span>}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0c0c14] transition-all ${f.is_online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] scale-110' : 'bg-gray-600'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">{f.name}</div>
                                                    <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                                                        {f.is_online ? <span className="text-green-500/70 font-medium">В меню</span> : 'Оффлайн'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Main Content */}
                        <div className="flex-1 min-w-0 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <button onClick={() => setMode('create')} className="group relative h-64 glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl border border-white/10 hover:border-purple-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-20 h-20 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                        <Plus size={40} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">Создать игру</h3>
                                        <p className="text-sm text-gray-400">Начать новую партию</p>
                                    </div>
                                </button>

                                <button onClick={() => setMode('additional')} className="group relative h-64 glass-card hover:bg-white/5 transition-all duration-300 rounded-2xl border border-white/10 hover:border-pink-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-rose-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-20 h-20 bg-pink-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(236,72,153,0.3)]">
                                        <Smile size={40} className="text-pink-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold mb-2">Дополнительно</h3>
                                        <p className="text-sm text-gray-400">Друзья, Мини-игры, Вход</p>
                                    </div>
                                </button>
                            </div>

                            {/* Open Lobbies Panel (New Feature) */}
                            <div className="glass-card p-6 mt-4">
                                {/* My Active Games Section */}
                                {myGames.length > 0 && (
                                    <div className="mb-8 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-purple-300">
                                            <Play size={20} /> Ваши активные игры
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {myGames.map(game => (
                                                <div key={game.game_id} className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/50 p-4 rounded-xl flex justify-between items-center">
                                                    <div>
                                                        <div className="font-mono font-bold text-lg text-white">#{game.game_id.substring(0, 6)}</div>
                                                        <div className="text-xs text-purple-200 mt-1">Ход: {game.turn} • {game.status}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => navigate(`/game/${game.game_id}/${game.player_id}`)}
                                                        className="btn-sm btn-primary"
                                                    >
                                                        Продолжить
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Globe size={20} className="text-blue-400" /> Открытые лобби</h3>
                                    <button onClick={fetchActiveGames} className="p-2 hover:bg-white/10 rounded-full"><RefreshCw size={16} /></button>
                                </div>

                                {activeGames.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Нет активных публичных игр. Создайте свою!</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {activeGames.map(game => (
                                            <div key={game.game_id} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all flex justify-between items-center group relative overflow-hidden">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/40 flex-shrink-0 flex items-center justify-center relative">
                                                        {game.host_avatar && (game.host_avatar.startsWith('http') || game.host_avatar.startsWith('/')) ? (
                                                            <img src={game.host_avatar} className="w-full h-full object-cover" alt="Avatar" />
                                                        ) : game.host_avatar ? (
                                                            <span className="text-xl select-none">{game.host_avatar}</span>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white/20 text-xl select-none">👤</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-mono font-bold text-lg text-purple-400 leading-tight">#{game.game_id.substring(0, 6)}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mb-1 truncate max-w-[120px]">
                                                            Создатель: {game.host_name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500">{game.map_type} • {game.player_count}/{game.max_players}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {myGames.some(mg => mg.game_id === game.game_id) ? (
                                                        <button
                                                            onClick={() => {
                                                                const mg = myGames.find(m => m.game_id === game.game_id);
                                                                navigate(`/game/${mg.game_id}/${mg.player_id}`);
                                                            }}
                                                            className="btn-sm btn-purple opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            Продолжить
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setMode('join'); setGameIdInput(game.game_id); }}
                                                            className="btn-sm btn-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            Войти
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Telegram Bot Link (Browser Only, Main Menu Only) */}
                {(!window.Telegram?.WebApp?.initData && mode === 'menu') && (
                    <div className="mt-8 max-w-4xl w-full mx-auto px-4">
                        <a
                            href="https://t.me/monopoly_haha_bot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full bg-[#24A1DE]/20 hover:bg-[#24A1DE]/30 border border-[#24A1DE]/50 rounded-xl p-4 transition-all group relative overflow-hidden text-center"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-2xl">✈️</span>
                                <h3 className="text-[#24A1DE] font-bold text-lg uppercase tracking-wider">Открыть в Telegram</h3>
                                <p className="text-gray-400 text-xs max-w-md">
                                    Для полного погружения и уведомлений рекомендуем играть через нашего официального бота
                                </p>
                            </div>
                        </a>
                    </div>
                )}

                {/* Create Mode */}
                {mode === 'create' && (
                    <div className="glass-card max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold font-display">Создание игры</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost p-2 rounded-full hover:bg-white/10"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Выберите карту</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { id: 'World', name: 'Мировая карта' },
                                        { id: 'Ukraine', name: 'Украина' },
                                        { id: 'Mukhosransk', name: 'Мухосранск' }
                                    ].map(m => (
                                        <button key={m.id} onClick={() => setSelectedMap(m.id)} className={`p-4 rounded-xl border text-sm font-bold transition-all ${selectedMap === m.id ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Режим игры</label>
                                <div className="flex gap-4">
                                    <button onClick={() => setGameMode('abilities')} className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${gameMode === 'abilities' ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-gray-400'}`}>Способности</button>
                                    <button onClick={() => setGameMode('oreshnik_all')} className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${gameMode === 'oreshnik_all' ? 'bg-red-600/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] text-red-400' : 'bg-white/5 border-white/10 text-gray-400'}`}>Все с Орешником</button>
                                    <button onClick={() => setGameMode('classic')} className={`flex-1 p-3 rounded-lg border text-xs font-bold transition-all ${gameMode === 'classic' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400'}`}>Классика</button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="label">Таймер хода</label>
                            <div className="flex gap-4">
                                {[
                                    { val: 60, label: '60с' },
                                    { val: 90, label: '90с' },
                                    { val: 0, label: 'Без лимита' }
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
                            <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Выберите лидера</label>
                            <CharacterSelection characters={LOBBY_CHARACTERS} selectedId={character} onSelect={setCharacter} />
                        </div>

                        <button onClick={createGame} disabled={isLoading} className="btn-primary w-full py-4 text-xl font-bold shadow-lg shadow-purple-900/20">
                            {isLoading ? 'Создание...' : 'Запустить игру'}
                        </button>
                    </div>
                )}

                {/* Additional Mode (Fun & Games) */}
                {mode === 'additional' && (
                    <div className="glass-card max-w-4xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-bold font-display">Дополнительно</h2>
                                <p className="text-gray-400">Мини-игры и развлечения</p>
                            </div>
                            <button onClick={() => setMode('menu')} className="btn-ghost p-2 rounded-full hover:bg-white/10"><X /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Hearthstone Card moved here */}
                            <button onClick={() => navigate('/hearthstone')} className="group relative h-64 glass-card bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl border border-white/10 hover:border-yellow-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-20 h-20 bg-yellow-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                                    <span className="text-4xl filter drop-shadow-lg">🐲</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Hearthstone</h3>
                                    <p className="text-sm text-gray-400">Battlegrounds Lite</p>
                                </div>
                            </button>

                            {/* Friend Button Moved Here */}
                            <button onClick={() => setMode('friends')} className="group relative h-64 glass-card bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl border border-white/10 hover:border-green-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                                {(friendRequests.length > 0 || gameInvites.length > 0) && (
                                    <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-lg shadow-red-500/50">
                                        {friendRequests.length + gameInvites.length}
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                                    <Users size={40} className="text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Друзья</h3>
                                    <p className="text-sm text-gray-400">Управление друзьями</p>
                                </div>
                            </button>

                            {/* Join Button Moved Here */}
                            <button onClick={() => setMode('join')} className="group relative h-64 glass-card bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl border border-white/10 hover:border-blue-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                    <LogIn size={40} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Присоединиться</h3>
                                    <p className="text-sm text-gray-400">Войти по коду лобби</p>
                                </div>
                            </button>

                            {/* Anecdote Button */}
                            <button onClick={() => setShowWhoAmI(true)} className="group relative h-64 glass-card bg-white/5 hover:bg-white/10 transition-all duration-300 rounded-2xl border border-white/10 hover:border-indigo-500/50 overflow-hidden flex flex-col items-center justify-center gap-4 text-center p-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                                    <span className="text-4xl filter drop-shadow-lg">🔮</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Анекдот</h3>
                                    <p className="text-sm text-gray-400">Случайная мудрость</p>
                                </div>
                            </button>

                            {/* Placeholder for future games */}
                            <div className="group relative h-64 glass-card bg-white/5 opacity-50 rounded-2xl border border-white/5 border-dashed flex flex-col items-center justify-center gap-4 text-center p-6 cursor-not-allowed">
                                <div className="w-20 h-20 bg-gray-500/20 rounded-2xl flex items-center justify-center">
                                    <span className="text-2xl opacity-50">🔜</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1 text-gray-500">Скоро...</h3>
                                    <p className="text-xs text-gray-600">Новые игры в разработке</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Render the animation */}
                {showWhoAmI && (
                    <React.Suspense fallback={null}>
                        <WhoAmIAnimation isVisible={true} onClose={() => setShowWhoAmI(false)} />
                    </React.Suspense>
                )}

                {/* Join Mode */}
                {mode === 'join' && (
                    <div className="glass-card max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-bold font-display">Войти в игру</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost"><X /></button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label">ID Игры</label>
                                <input
                                    value={gameIdInput}
                                    onChange={e => setGameIdInput(e.target.value.toUpperCase())}
                                    className="input-field text-center font-mono text-2xl tracking-widest uppercase"
                                    placeholder="ABCD123"
                                    maxLength={8}
                                />
                            </div>

                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Выберите лидера</label>
                                <CharacterSelection characters={LOBBY_CHARACTERS} selectedId={character} onSelect={setCharacter} />
                            </div>

                            <button
                                onClick={() => {
                                    const existingGame = myGames.find(mg => mg.game_id === gameIdInput);
                                    if (existingGame) {
                                        navigate(`/game/${existingGame.game_id}/${existingGame.player_id}`);
                                    } else {
                                        joinGame(gameIdInput);
                                    }
                                }}
                                disabled={isLoading || !gameIdInput}
                                className="btn-primary w-full py-4 text-xl font-bold"
                            >
                                {isLoading ? 'Вход...' : (myGames.some(mg => mg.game_id === gameIdInput) ? 'Продолжить' : 'Войти в лобби')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Friends Mode */}
                {mode === 'friends' && (
                    <div className="glass-card max-w-2xl w-full p-8 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold font-display">Центр друзей</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost"><X /></button>
                        </div>

                        <div className="flex gap-2 mb-8">
                            <input
                                value={friendCodeInput}
                                onChange={e => setFriendCodeInput(e.target.value.toUpperCase())}
                                placeholder="Код друга (например A1B2C3)"
                                className="input-field flex-1 font-mono uppercase"
                                maxLength={6}
                            />
                            <button onClick={sendFriendRequest} className="btn-primary px-6"><UserPlus size={20} /></button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {friendRequests.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-2 font-bold text-[10px]">Запросы в друзья</h3>
                                    {friendRequests.map(req => (
                                        <div key={req.id} className="bg-white/10 p-3 rounded-lg flex justify-between items-center border border-purple-500/30 mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                    {req.from_user?.avatar_url && (req.from_user.avatar_url.startsWith('http') || req.from_user.avatar_url.startsWith('/')) ? (
                                                        <img src={req.from_user.avatar_url} className="w-full h-full object-cover" />
                                                    ) : req.from_user?.avatar_url ? (
                                                        <span className="text-lg">{req.from_user.avatar_url}</span>
                                                    ) : (
                                                        req.from_user?.name?.[0] || '?'
                                                    )}
                                                </div>
                                                <div className="font-bold">{req.from_user?.name}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => authFetch(`/api/friends/requests/${req.id}/accept`, { method: 'POST' }).then(fetchFriendsData)} className="p-1 bg-green-500 rounded hover:bg-green-600"><UserCheck size={16} /></button>
                                                <button onClick={() => authFetch(`/api/friends/requests/${req.id}/reject`, { method: 'POST' }).then(fetchFriendsData)} className="p-1 bg-red-500 rounded hover:bg-red-600"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {gameInvites.length > 0 && (
                                <div className="mb-4">
                                    <h3 className="text-sm text-yellow-400 uppercase tracking-widest mb-2 font-bold text-[10px]">Приглашения в игру</h3>
                                    {gameInvites.map(inv => (
                                        <div key={inv.id} className="bg-yellow-500/10 p-4 rounded-lg flex justify-between items-center border border-yellow-500/30 mb-2 group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                    {inv.from_user?.avatar_url && (inv.from_user.avatar_url.startsWith('http') || inv.from_user.avatar_url.startsWith('/')) ? (
                                                        <img src={inv.from_user.avatar_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Play className="text-yellow-500" size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-sm">{inv.from_user?.name} приглашает!</div>
                                                    <div className="text-[10px] text-gray-400 font-mono">Карта: {inv.map_type} • {inv.player_count} чел.</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setGameIdInput(inv.game_id);
                                                        setMode('join');
                                                    }}
                                                    className="btn-sm btn-primary bg-yellow-500 hover:bg-yellow-600 text-black border-none"
                                                >
                                                    Принять
                                                </button>
                                                <button
                                                    onClick={() => authFetch(`/api/games/invites/${inv.id}/decline`, { method: 'POST' }).then(fetchFriendsData)}
                                                    className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-2">Мои друзья</h3>
                            {friends.length === 0 ? <div className="text-gray-500 text-center py-4">Нет друзей. Добавьте кого-нибудь!</div> :
                                friends.map(f => (
                                    <div key={f.id} className="bg-white/5 p-3 rounded-lg flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                {f.avatar_url && (f.avatar_url.startsWith('http') || f.avatar_url.startsWith('/')) ? (
                                                    <img src={f.avatar_url} className="w-full h-full object-cover" />
                                                ) : f.avatar_url ? (
                                                    <span className="text-lg">{f.avatar_url}</span>
                                                ) : (
                                                    f.name[0]
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">{f.name}</div>
                                                <div className="text-[10px] text-gray-500 font-mono">#{f.friend_code}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {f.is_online ? (
                                                <div className="text-xs text-green-400 mr-2 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                    Онлайн
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-500 mr-2">Оффлайн</div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Удалить из друзей?')) {
                                                        authFetch(`/api/friends/${f.id}`, { method: 'DELETE' }).then(fetchFriendsData);
                                                    }
                                                }}
                                                className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded transition-colors"
                                                title="Удалить из друзей"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
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
                            <h2 className="text-3xl font-bold font-display">Профиль</h2>
                            <button onClick={() => setMode('menu')} className="btn-ghost"><X /></button>
                        </div>

                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500 shadow-2xl mb-4 bg-[#1a1a2e] flex items-center justify-center text-4xl">
                                    {user.avatar_url && (user.avatar_url.startsWith('http') || user.avatar_url.startsWith('/')) ? (
                                        <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user.avatar_url || '👤'}</span>
                                    )}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold">{user.name}</h3>
                            <p className="text-gray-500 text-xs font-mono uppercase tracking-widest">#{user.friend_code}</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-3 block">Выберите эмодзи</label>
                                <div className="grid grid-cols-6 gap-2 p-3 bg-white/5 rounded-xl border border-white/10 mb-4">
                                    {['😎', '🦾', '🤡', '🤑', '🦁', '👑', '🤌', '🤝', '🚀', '🎯', '🎰', '💎'].map(emoji => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleEmojiSelect(emoji)}
                                            className="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white/10"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="label uppercase text-[10px] tracking-widest text-gray-400 font-bold mb-2 block">Отображаемое имя</label>
                                <input
                                    type="text"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    className="input-field"
                                    placeholder="Введите имя..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleUpdateName();
                                        }
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Победы</div>
                                    <div className="text-2xl font-mono font-bold text-yellow-500">{user.stats?.wins}</div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Игры</div>
                                    <div className="text-2xl font-mono font-bold text-blue-500">{user.stats?.games_played}</div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleUpdateName()}
                                className="btn-primary w-full py-4 font-bold"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                            </button>

                            {!user.telegram_id && (
                                <div className="mt-8 p-6 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center">
                                    <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Привязать Telegram</h4>
                                    <p className="text-xs text-gray-400 mb-6">Привяжите аккаунт, чтобы сохранять прогресс и играть через Telegram Mini App.</p>
                                    <div className="flex justify-center">
                                        <TelegramLoginButton
                                            botName={import.meta.env.VITE_BOT_USERNAME || "monopoly_haha_bot"}
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

                            {!isMiniApp && (
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-4 mt-8 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/20 font-bold transition-all"
                                >
                                    <X size={20} /> Выйти из аккаунта
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};



export default Lobby;
