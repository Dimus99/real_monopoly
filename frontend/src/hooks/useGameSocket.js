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

            if (data.game_state) {
                setGameState(data.game_state);
            }

            if (data.type) {
                setLastAction(data);

                // Handle chat messages - add to logs
                if (data.type === 'CHAT_MESSAGE') {
                    const chatMsg = `💬 ${data.player_name}: ${data.message}`;
                    setGameState(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            logs: [...(prev.logs || []), chatMsg]
                        };
                    });
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
