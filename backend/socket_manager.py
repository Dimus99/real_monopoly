"""
WebSocket connection manager for real-time game updates.
"""
from fastapi import WebSocket
from typing import Dict, List, Optional, Set
import json
import asyncio


class ConnectionManager:
    """Manages WebSocket connections for games and users."""
    
    def __init__(self):
        # game_id -> set of WebSocket connections
        self.game_connections: Dict[str, Set[WebSocket]] = {}
        
        # user_id -> WebSocket connection (for direct messages)
        self.user_connections: Dict[str, WebSocket] = {}
        
        # websocket -> (game_id, user_id) for cleanup
        self.connection_info: Dict[WebSocket, tuple] = {}
    
    async def connect(
        self, 
        websocket: WebSocket, 
        game_id: str, 
        user_id: Optional[str] = None
    ):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Add to game connections
        if game_id not in self.game_connections:
            self.game_connections[game_id] = set()
        self.game_connections[game_id].add(websocket)
        
        # Add to user connections if provided
        if user_id:
            self.user_connections[user_id] = websocket
        
        # Track for cleanup
        self.connection_info[websocket] = (game_id, user_id)
        
        print(f"WebSocket connected: game={game_id}, user={user_id}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        info = self.connection_info.get(websocket)
        if not info:
            return
        
        game_id, user_id = info
        
        # Remove from game connections
        if game_id in self.game_connections:
            self.game_connections[game_id].discard(websocket)
            if not self.game_connections[game_id]:
                del self.game_connections[game_id]
        
        # Remove from user connections
        if user_id and user_id in self.user_connections:
            if self.user_connections[user_id] == websocket:
                del self.user_connections[user_id]
        
        # Remove tracking
        del self.connection_info[websocket]
        
        print(f"WebSocket disconnected: game={game_id}, user={user_id}")
    
    async def broadcast(self, game_id: str, message: dict):
        """Broadcast a message to all connections in a game."""
        if game_id not in self.game_connections:
            return
        
        from fastapi.encoders import jsonable_encoder
        json_message = jsonable_encoder(message)
        
        # Create tasks for all sends
        dead_connections = []
        
        for connection in self.game_connections[game_id]:
            try:
                await connection.send_json(json_message)
            except Exception as e:
                print(f"Failed to send to connection: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user."""
        connection = self.user_connections.get(user_id)
        if connection:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Failed to send to user {user_id}: {e}")
                self.disconnect(connection)
    
    async def broadcast_except(self, game_id: str, message: dict, exclude_user_id: str):
        """Broadcast to all except one user."""
        if game_id not in self.game_connections:
            return
        
        for connection in self.game_connections[game_id]:
            info = self.connection_info.get(connection)
            if info and info[1] == exclude_user_id:
                continue
            
            try:
                await connection.send_json(message)
            except Exception:
                pass
    
    def get_game_connections_count(self, game_id: str) -> int:
        """Get number of connections for a game."""
        return len(self.game_connections.get(game_id, set()))
    
    def is_user_connected(self, user_id: str) -> bool:
        """Check if a user is connected."""
        return user_id in self.user_connections


# Global manager instance
manager = ConnectionManager()
