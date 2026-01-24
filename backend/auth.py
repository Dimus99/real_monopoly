"""
Authentication module for Political Monopoly.
Supports anonymous auth (dev) and Telegram WebApp auth (prod).
Uses PostgreSQL for persistent storage.
"""
import hashlib
import hmac
import secrets
import string
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import Header, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from database import db
from db.base import get_db
from db import service as db_service
from models import User, UserStats

# Security
security = HTTPBearer(auto_error=False)

# Bot token for Telegram validation (should be in env vars)
BOT_TOKEN: Optional[str] = None


def set_bot_token(token: str):
    """Set the bot token for Telegram auth."""
    global BOT_TOKEN
    BOT_TOKEN = token


def generate_token() -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


async def generate_friend_code(session: AsyncSession) -> str:
    """Generate a unique 6-character friend code."""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(secrets.choice(chars) for _ in range(6))
        # Check if code is unique
        existing = await db_service.get_user_by_friend_code(session, code)
        if not existing:
            return code


async def create_anonymous_user(session: AsyncSession, name: str) -> tuple[User, str]:
    """
    Create an anonymous user for dev/testing.
    Returns (User, token).
    """
    import uuid
    
    user_id = str(uuid.uuid4())
    token = f"anon_{generate_token()}"
    
    user_data = {
        "id": user_id,
        "name": name,
        "telegram_id": None,
        "avatar_url": None,
        "friend_code": await generate_friend_code(session)
    }
    
    user_db = await db_service.create_user(session, user_data)
    await db_service.create_session(session, token, user_id)
    
    # Convert to Pydantic model
    user = User(
        id=user_db.id,
        name=user_db.name,
        telegram_id=user_db.telegram_id,
        avatar_url=user_db.avatar_url,
        friend_code=user_db.friend_code,
        created_at=user_db.created_at,
        stats=UserStats(
            games_played=user_db.games_played,
            wins=user_db.wins,
            losses=user_db.losses,
            total_earnings=user_db.total_earnings,
            highest_net_worth=user_db.highest_net_worth
        )
    )
    return user, token


def validate_telegram_init_data(init_data: str) -> Optional[dict]:
    """
    Validate Telegram WebApp initData.
    Returns parsed user data if valid, None otherwise.
    
    See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not BOT_TOKEN:
        # If no bot token configured, skip validation (dev mode)
        # Parse the data anyway
        try:
            parsed = dict(parse_qsl(init_data, keep_blank_values=True))
            if "user" in parsed:
                import json
                return json.loads(parsed["user"])
            return None
        except Exception:
            return None
    
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        
        # Get the hash
        check_hash = parsed.pop("hash", None)
        if not check_hash:
            return None
        
        # Sort and create data-check-string
        data_check_arr = [f"{k}={v}" for k, v in sorted(parsed.items())]
        data_check_string = "\n".join(data_check_arr)
        
        # Create secret key
        secret_key = hmac.new(
            b"WebAppData",
            BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Validate
        if not hmac.compare_digest(calculated_hash, check_hash):
            return None
        
        # Check auth_date (optional: reject if too old)
        auth_date = int(parsed.get("auth_date", 0))
        if auth_date == 0:
            return None
        
        # Parse user
        if "user" in parsed:
            import json
            return json.loads(parsed["user"])
        
        return None
        
    except Exception as e:
        print(f"Telegram auth validation error: {e}")
        return None


def validate_telegram_widget_data(widget_data: dict) -> Optional[dict]:
    """
    Validate Telegram Login Widget data.
    Returns user data if valid, None otherwise.
    
    See: https://core.telegram.org/widgets/login#checking-authorization-data
    """
    if not BOT_TOKEN:
        # Dev mode: skip validation
        return widget_data
        
    try:
        data = widget_data.copy()
        check_hash = data.pop("hash", None)
        if not check_hash:
            return None
            
        # Data-check-string is alphabetical order of all remaining fields
        data_check_arr = [f"{k}={v}" for k, v in sorted(data.items())]
        data_check_string = "\n".join(data_check_arr)
        
        # Secret key for widget is just SHA256 of bot token
        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Validate
        if not hmac.compare_digest(calculated_hash, check_hash):
            return None
            
        return widget_data
    except Exception as e:
        print(f"Telegram widget validation error: {e}")
        return None


async def authenticate_telegram_user(
    session: AsyncSession, 
    init_data: Optional[str] = None,
    widget_data: Optional[dict] = None
) -> tuple[User, str]:
    """
    Authenticate or create user from Telegram initData or Widget data.
    Returns (User, token).
    """
    import uuid
    
    if init_data:
        user_data = validate_telegram_init_data(init_data)
    elif widget_data:
        user_data = validate_telegram_widget_data(widget_data)
    else:
        raise HTTPException(status_code=400, detail="No Telegram data provided")
        
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram auth data")
    
    telegram_id = user_data.get("id")
    if not telegram_id:
        raise HTTPException(status_code=401, detail="No Telegram user ID")
    
    # Check if user exists
    existing = await db_service.get_user_by_telegram_id(session, telegram_id)
    
    if existing:
        # Update user info
        name = user_data.get("first_name", "")
        if user_data.get("last_name"):
            name += f" {user_data['last_name']}"
        
        avatar_url = user_data.get("photo_url")
        
        await db_service.update_user(session, existing.id, {
            "name": name or existing.name,
            "avatar_url": avatar_url or existing.avatar_url
        })
        
        token = f"tg_{generate_token()}"
        await db_service.create_session(session, token, existing.id)
        
        updated = await db_service.get_user(session, existing.id)
        user = User(
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
        return user, token
    
    # Create new user
    user_id = str(uuid.uuid4())
    token = f"tg_{generate_token()}"
    
    name = user_data.get("first_name", "Player")
    if user_data.get("last_name"):
        name += f" {user_data['last_name']}"
    
    new_user_data = {
        "id": user_id,
        "name": name,
        "telegram_id": telegram_id,
        "avatar_url": user_data.get("photo_url"),
        "friend_code": await generate_friend_code(session)
    }
    
    user_db = await db_service.create_user(session, new_user_data)
    await db_service.create_session(session, token, user_id)
    
    user = User(
        id=user_db.id,
        name=user_db.name,
        telegram_id=user_db.telegram_id,
        avatar_url=user_db.avatar_url,
        friend_code=user_db.friend_code,
        created_at=user_db.created_at,
        stats=UserStats(
            games_played=user_db.games_played,
            wins=user_db.wins,
            losses=user_db.losses,
            total_earnings=user_db.total_earnings,
            highest_net_worth=user_db.highest_net_worth
        )
    )
    return user, token


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = credentials.credentials
    user_id = await db_service.get_session(session, token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_db = await db_service.get_user(session, user_id)
    if not user_db:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Update online status (in-memory)
    db.update_online_status(user_id)
    
    return User(
        id=user_db.id,
        name=user_db.name,
        telegram_id=user_db.telegram_id,
        avatar_url=user_db.avatar_url,
        friend_code=user_db.friend_code,
        created_at=user_db.created_at,
        stats=UserStats(
            games_played=user_db.games_played,
            wins=user_db.wins,
            losses=user_db.losses,
            total_earnings=user_db.total_earnings,
            highest_net_worth=user_db.highest_net_worth
        )
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to optionally get the current user (doesn't fail if not authenticated).
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, session)
    except HTTPException:
        return None
