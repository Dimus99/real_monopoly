import { useEffect, useState, useRef, useCallback } from 'react';

const useGameSocket = (gameId, playerId) => {
    const [gameState, setGameState] = useState(null);
    const [lastAction, setLastAction] = useState(null);
    const [chatLogs, setChatLogs] = useState([]);
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const pingIntervalRef = useRef(null);

    const connect = useCallback(() => {
        if (!gameId || !playerId) return;

        const token = localStorage.getItem('monopoly_token');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host;
        const ws = new WebSocket(`${protocol}//${host}/ws/${gameId}?player_id=${playerId}&token=${token}`);

        socketRef.current = ws;

        ws.onopen = () => {
            console.log("Connected to game socket");
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }

            // Start heartbeat
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ action: 'PING' }));
                }
            }, 15000);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') return; // Ignore heartbeat responses

            console.log("WS Msg:", data);

            if (data.game_state) {
                setGameState(data.game_state);
            }

            if (data.type) {
                setLastAction(data);
            }
        };

        ws.onclose = (event) => {
            console.log("Disconnected. Reason:", event.status, event.reason);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

            // Attempt to reconnect after delay
            if (!reconnectTimeoutRef.current) {
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectTimeoutRef.current = null;
                    connect();
                }, 3000);
            }
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            ws.close();
        };
    }, [gameId, playerId]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) socketRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        };
    }, [connect]);

    const sendAction = useCallback((action, payload = {}) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ action, data: payload }));
        }
    }, []);

    return { gameState, lastAction, sendAction, chatLogs };
};

export default useGameSocket;
