"""
User and authentication routes.
Uses PostgreSQL for persistent storage.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from database import db
from db.base import get_db
from db import service as db_service
from models import (
    User, UserPublic, UserStats,
    AnonymousAuthRequest, TelegramAuthRequest, AuthResponse,
    UpdateUserRequest
)
from auth import (
    create_anonymous_user, 
    authenticate_telegram_user, 
    get_current_user,
    validate_telegram_init_data,
    validate_telegram_widget_data
)

router = APIRouter(prefix="/api", tags=["users"])


# ============== Authentication ==============

@router.post("/auth/anonymous", response_model=AuthResponse)
async def anonymous_auth(
    request: AnonymousAuthRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Create an anonymous user for dev/testing.
    Returns a token for subsequent requests.
    """
    if not request.name or len(request.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    
    if len(request.name) > 32:
        raise HTTPException(status_code=400, detail="Name must be at most 32 characters")
    
    user, token = await create_anonymous_user(session, request.name.strip())
    return AuthResponse(token=token, user=user)


@router.post("/auth/telegram", response_model=AuthResponse)
async def telegram_auth(
    request: TelegramAuthRequest,
    session: AsyncSession = Depends(get_db)
):
    """
    Authenticate via Telegram WebApp initData or Widget data.
    Creates user if first time, otherwise returns existing user.
    """
    user, token = await authenticate_telegram_user(
        session, 
        init_data=request.init_data,
        widget_data=request.widget_data
    )
    return AuthResponse(token=token, user=user)


@router.post("/auth/link-telegram", response_model=User)
async def link_telegram(
    request: TelegramAuthRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Link a Telegram account to an existing user profile.
    """
    if current_user.telegram_id:
        raise HTTPException(status_code=400, detail="User already has a Telegram account linked")

    if request.init_data:
        tg_user = validate_telegram_init_data(request.init_data)
    elif request.widget_data:
        tg_user = validate_telegram_widget_data(request.widget_data)
    else:
        raise HTTPException(status_code=400, detail="No Telegram data provided")

    if not tg_user:
        raise HTTPException(status_code=401, detail="Invalid Telegram data")

    telegram_id = tg_user.get("id")
    
    # Check if this telegram_id is already linked to ANOTHER user
    existing = await db_service.get_user_by_telegram_id(session, telegram_id)
    if existing:
        raise HTTPException(status_code=400, detail="This Telegram account is already linked to another user")

    # Update user
    name = tg_user.get("first_name", "")
    if tg_user.get("last_name"):
        name += f" {tg_user['last_name']}"
    
    avatar_url = tg_user.get("photo_url")
    
    updates = {
        "telegram_id": telegram_id,
        "avatar_url": avatar_url or current_user.avatar_url
    }
    # Update name only if current name is like 'Player' or similar? 
    # Or just keep current name. Let's keep current name but update if it was anonymous-like.
    
    updated = await db_service.update_user(session, current_user.id, updates)
    
    return User(
        id=updated.id,
        name=updated.name,
        telegram_id=updated.telegram_id,
        avatar_url=updated.avatar_url,
        friend_code=updated.friend_code,
        created_at=updated.created_at,
        stats=UserStats(
            games_played=updated.games_played,
            wins=updated.wins,
            losses=updated.losses,
            total_earnings=updated.total_earnings,
            highest_net_worth=updated.highest_net_worth
        )
    )


# ============== User Management ==============

@router.get("/users/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.put("/users/me", response_model=User)
async def update_me(
    request: UpdateUserRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    updates = {}
    
    if request.name is not None:
        if len(request.name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        if len(request.name) > 32:
            raise HTTPException(status_code=400, detail="Name must be at most 32 characters")
        updates["name"] = request.name.strip()
    
    if request.avatar_url is not None:
        updates["avatar_url"] = request.avatar_url
    
    if updates:
        updated = await db_service.update_user(session, current_user.id, updates)
        return User(
            id=updated.id,
            name=updated.name,
            telegram_id=updated.telegram_id,
            avatar_url=updated.avatar_url,
            friend_code=updated.friend_code,
            created_at=updated.created_at,
            stats=UserStats(
                games_played=updated.games_played,
                wins=updated.wins,
                losses=updated.losses,
                total_earnings=updated.total_earnings,
                highest_net_worth=updated.highest_net_worth
            )
        )
    
    return current_user


@router.get("/users/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get user by ID (public info only)."""
    user_db = await db_service.get_user(session, user_id)
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPublic(
        id=user_db.id,
        name=user_db.name,
        avatar_url=user_db.avatar_url,
        friend_code=user_db.friend_code,
        stats=UserStats(
            games_played=user_db.games_played,
            wins=user_db.wins,
            losses=user_db.losses,
            total_earnings=user_db.total_earnings,
            highest_net_worth=user_db.highest_net_worth
        )
    )


@router.get("/users/by-code/{friend_code}", response_model=UserPublic)
async def get_user_by_friend_code(
    friend_code: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Find user by their friend code."""
    friend_code = friend_code.upper()
    
    user_db = await db_service.get_user_by_friend_code(session, friend_code)
    if not user_db:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserPublic(
        id=user_db.id,
        name=user_db.name,
        avatar_url=user_db.avatar_url,
        friend_code=user_db.friend_code,
        stats=UserStats(
            games_played=user_db.games_played,
            wins=user_db.wins,
            losses=user_db.losses,
            total_earnings=user_db.total_earnings,
            highest_net_worth=user_db.highest_net_worth
        )
    )


# ============== Leaderboard ==============

@router.get("/leaderboard/wins", response_model=List[UserPublic])
async def get_leaderboard_wins(
    limit: int = 10,
    session: AsyncSession = Depends(get_db)
):
    """Get top players by wins."""
    users = await db_service.get_all_users(session)
    sorted_users = sorted(users, key=lambda u: u.wins, reverse=True)
    
    return [
        UserPublic(
            id=u.id,
            name=u.name,
            avatar_url=u.avatar_url,
            friend_code=u.friend_code,
            stats=UserStats(
                games_played=u.games_played,
                wins=u.wins,
                losses=u.losses,
                total_earnings=u.total_earnings,
                highest_net_worth=u.highest_net_worth
            )
        )
        for u in sorted_users[:limit]
    ]


@router.get("/leaderboard/games", response_model=List[UserPublic])
async def get_leaderboard_games(
    limit: int = 10,
    session: AsyncSession = Depends(get_db)
):
    """Get top players by games played."""
    users = await db_service.get_all_users(session)
    sorted_users = sorted(users, key=lambda u: u.games_played, reverse=True)
    
    return [
        UserPublic(
            id=u.id,
            name=u.name,
            avatar_url=u.avatar_url,
            friend_code=u.friend_code,
            stats=UserStats(
                games_played=u.games_played,
                wins=u.wins,
                losses=u.losses,
                total_earnings=u.total_earnings,
                highest_net_worth=u.highest_net_worth
            )
        )
        for u in sorted_users[:limit]
    ]


@router.get("/leaderboard/earnings", response_model=List[UserPublic])
async def get_leaderboard_earnings(
    limit: int = 10,
    session: AsyncSession = Depends(get_db)
):
    """Get top players by total earnings."""
    users = await db_service.get_all_users(session)
    sorted_users = sorted(users, key=lambda u: u.total_earnings, reverse=True)
    
    return [
        UserPublic(
            id=u.id,
            name=u.name,
            avatar_url=u.avatar_url,
            friend_code=u.friend_code,
            stats=UserStats(
                games_played=u.games_played,
                wins=u.wins,
                losses=u.losses,
                total_earnings=u.total_earnings,
                highest_net_worth=u.highest_net_worth
            )
        )
        for u in sorted_users[:limit]
    ]
