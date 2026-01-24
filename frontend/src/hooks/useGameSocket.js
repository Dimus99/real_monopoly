import { useEffect, useState, useRef, useCallback } from 'react';

const useGameSocket = (gameId, playerId) => {
    const [gameState, setGameState] = useState(null);
    const [lastAction, setLastAction] = useState(null);
    const [chatLogs, setChatLogs] = useState([]);
    const socketRef = useRef(null);

    useEffect(() => {
        if (!gameId || !playerId) return;

        const token = localStorage.getItem('monopoly_token');
        const ws = new WebSocket(`ws://localhost:8000/ws/${gameId}?player_id=${playerId}&token=${token}`);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to game socket");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("WS Msg:", data);

            // Update game state from any message that includes it
            if (data.game_state) {
                setGameState(data.game_state);
            }

            if (data.type) {
                setLastAction(data);

                // Handle chat messages - no need to manually update local state if backend sends game_state
                // But if backend doesn't send game_state, we might need it? 
                // We patched backend to send game_state.
                // Keeping this logic only if game_state is missing to be safe
                if (data.type === 'CHAT_MESSAGE' && !data.game_state) {
                    const chatMsg = `💬 ${data.player_name}: ${data.message}`;
                    setGameState(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            logs: [...(prev.logs || []), chatMsg]
                        };
                    });
                }

                // Handle bot actions - game_state is included
                if (data.type === 'BOT_ACTIONS' && data.game_state) {
                    setGameState(data.game_state);
                }

                // Handle ability used - may include game_state
                if (data.type === 'ABILITY_USED' && data.game_state) {
                    setGameState(data.game_state);
                }
            }
        };

        ws.onclose = () => {
            console.log("Disconnected");
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        return () => {
            if (ws) ws.close();
        };
    }, [gameId, playerId]);

    const sendAction = useCallback((action, payload = {}) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ action, data: payload }));
        }
    }, []);

    return { gameState, lastAction, sendAction, chatLogs };
};

export default useGameSocket;
