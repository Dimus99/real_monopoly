"""
Database service layer for Political Monopoly.
Provides async CRUD operations for all models.
"""
from typing import Optional, List
from datetime import datetime
from sqlalchemy import select, or_, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.models import (
    UserDB, FriendshipDB, FriendRequestDB, GameDB, GamePlayerDB,
    GameInviteDB, SessionDB, FriendRequestStatus, GameInviteStatus,
    GameStatus
)


# ============== User Operations ==============

async def create_user(session: AsyncSession, user_data: dict) -> UserDB:
    """Create a new user."""
    user = UserDB(
        id=user_data["id"],
        name=user_data["name"],
        telegram_id=user_data.get("telegram_id"),
        avatar_url=user_data.get("avatar_url"),
        friend_code=user_data.get("friend_code"),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_user(session: AsyncSession, user_id: str) -> Optional[UserDB]:
    """Get user by ID."""
    result = await session.execute(select(UserDB).where(UserDB.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_telegram_id(session: AsyncSession, telegram_id: int) -> Optional[UserDB]:
    """Get user by Telegram ID."""
    result = await session.execute(
        select(UserDB).where(UserDB.telegram_id == telegram_id)
    )
    return result.scalar_one_or_none()


async def get_user_by_friend_code(session: AsyncSession, friend_code: str) -> Optional[UserDB]:
    """Get user by friend code."""
    result = await session.execute(
        select(UserDB).where(UserDB.friend_code == friend_code)
    )
    return result.scalar_one_or_none()


async def update_user(session: AsyncSession, user_id: str, updates: dict) -> Optional[UserDB]:
    """Update user data."""
    user = await get_user(session, user_id)
    if not user:
        return None
    
    for key, value in updates.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    await session.commit()
    await session.refresh(user)
    return user


async def get_all_users(session: AsyncSession) -> List[UserDB]:
    """Get all users."""
    result = await session.execute(select(UserDB))
    return list(result.scalars().all())


async def increment_user_stats(session: AsyncSession, user_id: str, is_winner: bool = False):
    """Increment games played and win/loss count."""
    user = await get_user(session, user_id)
    if user:
        user.games_played += 1
        if is_winner:
            user.wins += 1
        else:
            user.losses += 1
        await session.commit()
        await session.refresh(user)
    return user


async def add_user_balance(session: AsyncSession, user_id: str, amount: int) -> Optional[UserDB]:
    """Add funds to user balance."""
    user = await get_user(session, user_id)
    if user:
        user.balance = (user.balance or 0) + amount
        await session.commit()
        await session.refresh(user)
    return user


async def claim_daily_bonus(session: AsyncSession, user_id: str, bonus_amount: int = 5000) -> dict:
    """Claim daily bonus if available."""
    user = await get_user(session, user_id)
    if not user:
        return {"success": False, "error": "User not found"}
    
    now = datetime.utcnow()
    if user.last_bonus_at:
        # Check if 24 hours passed
        delta = now - user.last_bonus_at
        if delta.total_seconds() < 24 * 3600:
            remaining_seconds = int(24 * 3600 - delta.total_seconds())
            return {
                "success": False, 
                "error": "Bonus already claimed", 
                "remaining_seconds": remaining_seconds
            }
    
    # Award bonus
    user.balance = (user.balance or 0) + bonus_amount
    user.last_bonus_at = now
    await session.commit()
    await session.refresh(user)
    
    return {
        "success": True, 
        "new_balance": user.balance, 
        "message": f"Получено ${bonus_amount}!"
    }


# ============== Friend Request Operations ==============

async def create_friend_request(session: AsyncSession, request_data: dict) -> FriendRequestDB:
    """Create a friend request."""
    request = FriendRequestDB(
        id=request_data["id"],
        from_user_id=request_data["from_user_id"],
        to_user_id=request_data["to_user_id"],
        status=FriendRequestStatus.PENDING,
    )
    session.add(request)
    await session.commit()
    await session.refresh(request)
    return request


async def get_friend_request(session: AsyncSession, request_id: str) -> Optional[FriendRequestDB]:
    """Get friend request by ID."""
    result = await session.execute(
        select(FriendRequestDB).where(FriendRequestDB.id == request_id)
    )
    return result.scalar_one_or_none()


async def get_pending_requests_for_user(session: AsyncSession, user_id: str) -> List[FriendRequestDB]:
    """Get all pending friend requests for a user."""
    result = await session.execute(
        select(FriendRequestDB)
        .where(
            FriendRequestDB.to_user_id == user_id,
            FriendRequestDB.status == FriendRequestStatus.PENDING
        )
    )
    return list(result.scalars().all())


async def get_sent_requests_by_user(session: AsyncSession, user_id: str) -> List[FriendRequestDB]:
    """Get all friend requests sent by a user."""
    result = await session.execute(
        select(FriendRequestDB).where(FriendRequestDB.from_user_id == user_id)
    )
    return list(result.scalars().all())


async def get_existing_request(
    session: AsyncSession, 
    from_user_id: str, 
    to_user_id: str
) -> Optional[FriendRequestDB]:
    """Check if there's already a pending request between two users."""
    result = await session.execute(
        select(FriendRequestDB).where(
            FriendRequestDB.status == FriendRequestStatus.PENDING,
            or_(
                and_(
                    FriendRequestDB.from_user_id == from_user_id,
                    FriendRequestDB.to_user_id == to_user_id
                ),
                and_(
                    FriendRequestDB.from_user_id == to_user_id,
                    FriendRequestDB.to_user_id == from_user_id
                )
            )
        )
    )
    return result.scalar_one_or_none()


async def update_friend_request(
    session: AsyncSession, 
    request_id: str, 
    updates: dict
) -> Optional[FriendRequestDB]:
    """Update friend request status."""
    request = await get_friend_request(session, request_id)
    if not request:
        return None
    
    for key, value in updates.items():
        if hasattr(request, key):
            if key == "status" and isinstance(value, str):
                value = FriendRequestStatus(value)
            setattr(request, key, value)
    
    await session.commit()
    await session.refresh(request)
    return request


# ============== Friendship Operations ==============

async def add_friendship(session: AsyncSession, user_id_1: str, user_id_2: str) -> FriendshipDB:
    """Create bidirectional friendship."""
    # Normalize order to prevent duplicates
    if user_id_1 > user_id_2:
        user_id_1, user_id_2 = user_id_2, user_id_1
    
    friendship = FriendshipDB(user_id_1=user_id_1, user_id_2=user_id_2)
    session.add(friendship)
    await session.commit()
    return friendship


async def remove_friendship(session: AsyncSession, user_id_1: str, user_id_2: str):
    """Remove bidirectional friendship."""
    # Normalize order
    if user_id_1 > user_id_2:
        user_id_1, user_id_2 = user_id_2, user_id_1
    
    await session.execute(
        delete(FriendshipDB).where(
            FriendshipDB.user_id_1 == user_id_1,
            FriendshipDB.user_id_2 == user_id_2
        )
    )
    await session.commit()


async def are_friends(session: AsyncSession, user_id_1: str, user_id_2: str) -> bool:
    """Check if two users are friends."""
    # Normalize order
    if user_id_1 > user_id_2:
        user_id_1, user_id_2 = user_id_2, user_id_1
    
    result = await session.execute(
        select(FriendshipDB).where(
            FriendshipDB.user_id_1 == user_id_1,
            FriendshipDB.user_id_2 == user_id_2
        )
    )
    return result.scalar_one_or_none() is not None


async def get_friends(session: AsyncSession, user_id: str) -> List[UserDB]:
    """Get list of friend user objects."""
    # Get friendships where user is either user_1 or user_2
    result = await session.execute(
        select(FriendshipDB).where(
            or_(
                FriendshipDB.user_id_1 == user_id,
                FriendshipDB.user_id_2 == user_id
            )
        )
    )
    friendships = result.scalars().all()
    
    # Extract friend IDs
    friend_ids = []
    for f in friendships:
        friend_id = f.user_id_2 if f.user_id_1 == user_id else f.user_id_1
        friend_ids.append(friend_id)
    
    if not friend_ids:
        return []
    
    # Get user objects
    users_result = await session.execute(
        select(UserDB).where(UserDB.id.in_(friend_ids))
    )
    return list(users_result.scalars().all())


# ============== Game Invite Operations ==============

async def create_game_invite(session: AsyncSession, invite_data: dict) -> GameInviteDB:
    """Create a game invite."""
    invite = GameInviteDB(
        id=invite_data["id"],
        game_id=invite_data["game_id"],
        from_user_id=invite_data["from_user_id"],
        to_user_id=invite_data["to_user_id"],
        status=GameInviteStatus.PENDING,
    )
    session.add(invite)
    await session.commit()
    await session.refresh(invite)
    return invite


async def get_game_invite(session: AsyncSession, invite_id: str) -> Optional[GameInviteDB]:
    """Get game invite by ID."""
    result = await session.execute(
        select(GameInviteDB).where(GameInviteDB.id == invite_id)
    )
    return result.scalar_one_or_none()


async def get_pending_invites_for_user(session: AsyncSession, user_id: str) -> List[GameInviteDB]:
    """Get all pending game invites for a user."""
    result = await session.execute(
        select(GameInviteDB).where(
            GameInviteDB.to_user_id == user_id,
            GameInviteDB.status == GameInviteStatus.PENDING
        )
    )
    return list(result.scalars().all())


async def update_game_invite(
    session: AsyncSession, 
    invite_id: str, 
    updates: dict
) -> Optional[GameInviteDB]:
    """Update game invite status."""
    invite = await get_game_invite(session, invite_id)
    if not invite:
        return None
    
    for key, value in updates.items():
        if hasattr(invite, key):
            if key == "status" and isinstance(value, str):
                value = GameInviteStatus(value)
            setattr(invite, key, value)
    
    await session.commit()
    await session.refresh(invite)
    return invite


# ============== Session Operations ==============

async def create_session(session: AsyncSession, token: str, user_id: str) -> SessionDB:
    """Create a new session."""
    db_session = SessionDB(token=token, user_id=user_id)
    session.add(db_session)
    await session.commit()
    return db_session


async def get_session(session: AsyncSession, token: str) -> Optional[str]:
    """Get user_id from session token."""
    result = await session.execute(
        select(SessionDB).where(SessionDB.token == token)
    )
    db_session = result.scalar_one_or_none()
    return db_session.user_id if db_session else None


async def delete_session(session: AsyncSession, token: str):
    """Delete a session."""
    await session.execute(delete(SessionDB).where(SessionDB.token == token))
    await session.commit()


# ============== Game Operations ==============

async def create_game(session: AsyncSession, game_data: dict) -> GameDB:
    """Create a new game."""
    from db.models import MapType, GameStatus
    
    game = GameDB(
        id=game_data["game_id"],
        host_id=game_data.get("host_id"),
        map_type=MapType(game_data.get("map_type", "World")),
        starting_money=game_data.get("starting_money", 1500),
        max_players=game_data.get("max_players", 6),
        status=GameStatus(game_data.get("game_status", "waiting")),
        state_json=game_data.get("state_json"),
    )
    session.add(game)
    await session.commit()
    await session.refresh(game)
    return game


async def get_game(session: AsyncSession, game_id: str) -> Optional[GameDB]:
    """Get game by ID."""
    result = await session.execute(
        select(GameDB).where(GameDB.id == game_id)
    )
    return result.scalar_one_or_none()


async def update_game(session: AsyncSession, game_id: str, updates: dict) -> Optional[GameDB]:
    """Update game data."""
    game = await get_game(session, game_id)
    if not game:
        return None
    
    for key, value in updates.items():
        if hasattr(game, key):
            if key == "status" and isinstance(value, str):
                from db.models import GameStatus
                value = GameStatus(value)
            setattr(game, key, value)
    
    await session.commit()
    await session.refresh(game)
    return game


async def get_active_games(session: AsyncSession) -> List[GameDB]:
    """Get all active/waiting games."""
    result = await session.execute(
        select(GameDB).where(
            GameDB.status.in_([GameStatus.WAITING, GameStatus.ACTIVE])
        )
    )
    return list(result.scalars().all())
