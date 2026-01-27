"""
Database adapter for Political Monopoly.
Provides a compatibility layer between the old in-memory interface and new PostgreSQL backend.

Note: Game state is still kept in-memory for real-time performance.
      Only persistent data (users, friends, sessions) is stored in PostgreSQL.
"""
from typing import Dict, Set, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from db.base import async_session
from db import service as db_service


class Database:
    """
    Database singleton - now acts as a bridge to SQLAlchemy.
    
    Game state is kept in-memory for real-time performance.
    User/friend data is persisted to PostgreSQL.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # In-memory storage for real-time game state
        # (Games are complex objects with frequent updates - keep in RAM)
        self.games: Dict[str, dict] = {}
        
        # Online status (ephemeral, no need to persist)
        self.online_status: Dict[str, datetime] = {}
        
        self._initialized = True
    
    # ============== User Methods (PostgreSQL) ==============
    
    async def create_user_async(self, session: AsyncSession, user_data: dict) -> dict:
        """Create a new user in database."""
        user = await db_service.create_user(session, user_data)
        return user.to_dict()
    
    async def get_user_async(self, session: AsyncSession, user_id: str) -> Optional[dict]:
        """Get user by ID from database."""
        user = await db_service.get_user(session, user_id)
        return user.to_dict() if user else None
    
    async def get_user_by_telegram_id_async(self, session: AsyncSession, telegram_id: int) -> Optional[dict]:
        """Get user by Telegram ID from database."""
        user = await db_service.get_user_by_telegram_id(session, telegram_id)
        return user.to_dict() if user else None
    
    async def get_user_by_friend_code_async(self, session: AsyncSession, friend_code: str) -> Optional[dict]:
        """Get user by friend code from database."""
        user = await db_service.get_user_by_friend_code(session, friend_code)
        return user.to_dict() if user else None
    
    async def update_user_async(self, session: AsyncSession, user_id: str, updates: dict) -> Optional[dict]:
        """Update user data in database."""
        user = await db_service.update_user(session, user_id, updates)
        return user.to_dict() if user else None
    
    async def get_all_users_async(self, session: AsyncSession) -> list:
        """Get all users from database."""
        users = await db_service.get_all_users(session)
        return [u.to_dict() for u in users]
    
    async def increment_user_stats_async(self, user_id: str, is_winner: bool):
        """Increment win/loss stats for a user."""
        async with async_session() as session:
            async with session.begin():
                await db_service.increment_user_stats(session, user_id, is_winner)
    
    # ============== Friend Request Methods (PostgreSQL) ==============
    
    async def create_friend_request_async(self, session: AsyncSession, request_data: dict) -> dict:
        """Create a friend request in database."""
        request = await db_service.create_friend_request(session, request_data)
        return request.to_dict()
    
    async def get_friend_request_async(self, session: AsyncSession, request_id: str) -> Optional[dict]:
        """Get friend request by ID from database."""
        request = await db_service.get_friend_request(session, request_id)
        return request.to_dict() if request else None
    
    async def get_pending_requests_for_user_async(self, session: AsyncSession, user_id: str) -> list:
        """Get all pending friend requests for a user from database."""
        requests = await db_service.get_pending_requests_for_user(session, user_id)
        return [r.to_dict() for r in requests]
    
    async def get_sent_requests_by_user_async(self, session: AsyncSession, user_id: str) -> list:
        """Get all friend requests sent by a user from database."""
        requests = await db_service.get_sent_requests_by_user(session, user_id)
        return [r.to_dict() for r in requests]
    
    async def get_existing_request_async(self, session: AsyncSession, from_user_id: str, to_user_id: str) -> Optional[dict]:
        """Check if there's already a pending request between two users."""
        request = await db_service.get_existing_request(session, from_user_id, to_user_id)
        return request.to_dict() if request else None
    
    async def update_friend_request_async(self, session: AsyncSession, request_id: str, updates: dict) -> Optional[dict]:
        """Update friend request status in database."""
        request = await db_service.update_friend_request(session, request_id, updates)
        return request.to_dict() if request else None
    
    # ============== Friendship Methods (PostgreSQL) ==============
    
    async def add_friendship_async(self, session: AsyncSession, user_id_1: str, user_id_2: str):
        """Create bidirectional friendship in database."""
        await db_service.add_friendship(session, user_id_1, user_id_2)
    
    async def remove_friendship_async(self, session: AsyncSession, user_id_1: str, user_id_2: str):
        """Remove bidirectional friendship from database."""
        await db_service.remove_friendship(session, user_id_1, user_id_2)
    
    async def are_friends_async(self, session: AsyncSession, user_id_1: str, user_id_2: str) -> bool:
        """Check if two users are friends in database."""
        return await db_service.are_friends(session, user_id_1, user_id_2)
    
    async def get_friends_async(self, session: AsyncSession, user_id: str) -> list:
        """Get list of friend user objects from database."""
        friends = await db_service.get_friends(session, user_id)
        return [f.to_dict() for f in friends]
    
    # ============== Game Invite Methods (PostgreSQL) ==============
    
    async def create_game_invite_async(self, session: AsyncSession, invite_data: dict) -> dict:
        """Create a game invite in database."""
        invite = await db_service.create_game_invite(session, invite_data)
        return invite.to_dict()
    
    async def get_game_invite_async(self, session: AsyncSession, invite_id: str) -> Optional[dict]:
        """Get game invite by ID from database."""
        invite = await db_service.get_game_invite(session, invite_id)
        return invite.to_dict() if invite else None
    
    async def get_pending_invites_for_user_async(self, session: AsyncSession, user_id: str) -> list:
        """Get all pending game invites for a user from database."""
        invites = await db_service.get_pending_invites_for_user(session, user_id)
        return [i.to_dict() for i in invites]
    
    async def update_game_invite_async(self, session: AsyncSession, invite_id: str, updates: dict) -> Optional[dict]:
        """Update game invite status in database."""
        invite = await db_service.update_game_invite(session, invite_id, updates)
        return invite.to_dict() if invite else None
    
    # ============== Session Methods (PostgreSQL) ==============
    
    async def create_session_async(self, session: AsyncSession, token: str, user_id: str):
        """Create a new session in database."""
        await db_service.create_session(session, token, user_id)
    
    async def get_session_async(self, session: AsyncSession, token: str) -> Optional[str]:
        """Get user_id from session token in database."""
        return await db_service.get_session(session, token)
    
    async def delete_session_async(self, session: AsyncSession, token: str):
        """Delete a session from database."""
        await db_service.delete_session(session, token)
    
    # ============== Online Status (In-Memory - Ephemeral) ==============
    
    def update_online_status(self, user_id: str):
        """Update user's last seen timestamp."""
        self.online_status[user_id] = datetime.utcnow()
    
    def is_online(self, user_id: str, timeout_seconds: int = 60) -> bool:
        """Check if user is online (seen within timeout)."""
        if user_id not in self.online_status:
            return False
        last_seen = self.online_status[user_id]
        return (datetime.utcnow() - last_seen).total_seconds() < timeout_seconds
    
    # ============== Game State Methods (In-Memory for Performance) ==============
    
    def store_game(self, game_id: str, game_state: dict):
        """Store game state in memory."""
        self.games[game_id] = game_state
    
    def get_game(self, game_id: str) -> Optional[dict]:
        """Get game state from memory."""
        return self.games.get(game_id)
    
    def delete_game(self, game_id: str):
        """Delete game state from memory."""
        if game_id in self.games:
            del self.games[game_id]
    
    def get_all_games(self) -> Dict[str, dict]:
        """Get all games from memory."""
        return self.games


# Global database instance
db = Database()
