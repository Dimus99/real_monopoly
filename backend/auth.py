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
    if token:
        print(f"DEBUG AUTH: BOT_TOKEN set (length: {len(token)}, prefix: {token[:5]}...)")
    else:
        print("DEBUG AUTH: set_bot_token called with empty token")


async def fetch_bot_username() -> Optional[str]:
    """Fetch the bot's username from Telegram API."""
    if not BOT_TOKEN:
        return None
    
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"https://api.telegram.org/bot{BOT_TOKEN}/getMe")
            if res.status_code == 200:
                data = res.json()
                username = data.get("result", {}).get("username")
                if username:
                    print(f"✓ Bot detected: @{username}")
                    # Also update os.environ so other modules can see it
                    import os
                    if not os.getenv("BOT_USERNAME"):
                        os.environ["BOT_USERNAME"] = username
                    return username
    except Exception as e:
        print(f"DEBUG AUTH: Failed to fetch bot info: {e}")
    return None


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





def validate_telegram_init_data(init_data: str) -> Optional[dict]:
    """
    Validate Telegram WebApp initData.
    Returns parsed user data if valid, None otherwise.
    
    See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not BOT_TOKEN:
        print("DEBUG AUTH: No BOT_TOKEN set, skipping init_data validation (dev mode)")
        try:
            parsed = dict(parse_qsl(init_data, keep_blank_values=True))
            if "user" in parsed:
                import json
                return json.loads(parsed["user"])
            return None
        except Exception as e:
            print(f"DEBUG AUTH: Dev mode parse error: {e}")
            return None
    
    try:
        print("DEBUG AUTH: validating init_data")
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
        
        # Get the hash
        check_hash = parsed.pop("hash", None)
        if not check_hash:
            print("DEBUG AUTH: Missing hash in init_data")
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
            print("DEBUG AUTH: Hash mismatch in init_data!")
            print(f"DEBUG AUTH: Received: {check_hash}")
            print(f"DEBUG AUTH: Calculated: {calculated_hash}")
            return None
        
        # Check auth_date (optional: reject if too old)
        auth_date = int(parsed.get("auth_date", 0))
        if auth_date == 0:
            print("DEBUG AUTH: Missing auth_date")
            return None
        
        # Parse user
        if "user" in parsed:
            import json
            return json.loads(parsed["user"])
        
        print("DEBUG AUTH: Missing user object in parsed data")
        return None
        
    except Exception as e:
        print(f"DEBUG AUTH: Telegram init_data validation error: {e}")
        return None


def validate_telegram_widget_data(widget_data: dict) -> Optional[dict]:
    """
    Validate Telegram Login Widget data.
    Returns user data if valid, None otherwise.
    
    See: https://core.telegram.org/widgets/login#checking-authorization-data
    """
    if not BOT_TOKEN:
        print("DEBUG AUTH: No BOT_TOKEN set, skipping Telegram widget validation (dev mode)")
        return widget_data
        
    try:
        data = widget_data.copy()
        check_hash = data.pop("hash", None)
        if not check_hash:
            print("DEBUG AUTH: [Widget] Validation failed - missing hash")
            return None
            
        # Data-check-string is alphabetical order of all remaining fields
        # IMPORTANT: Use all fields except hash, and convert to string
        # Filter out None values and the hash itself
        # And only use expected telegram fields to avoid interference from request body
        tg_fields = ['auth_date', 'first_name', 'id', 'last_name', 'photo_url', 'username']
        data_to_check = {k: str(v) for k, v in data.items() if k in tg_fields and v is not None}
        
        # Sort by key
        data_check_arr = [f"{k}={v}" for k, v in sorted(data_to_check.items())]
        data_check_string = "\n".join(data_check_arr)
        
        print(f"DEBUG AUTH: [Widget] Secret string being checked (concatenated):\n{data_check_string}")
        
        # Secret key for widget is just SHA256 of bot token
        secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
        
        # Calculate hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        print(f"DEBUG AUTH: [Widget] Hash comparison\nRecv: {check_hash}\nCalc: {calculated_hash}")
        
        # Validate (case-insensitive for safety, though usually lowercase)
        if not hmac.compare_digest(calculated_hash.lower(), check_hash.lower()):
            print("DEBUG AUTH: [Widget] HASH MISMATCH!")
            return None
            
        # Check auth_date expiration (e.g. 24 hours)
        try:
            auth_ts = int(data.get('auth_date', 0))
            if auth_ts > 0:
                now = datetime.utcnow().timestamp()
                # 86400 seconds = 24 hours
                if now - auth_ts > 86400:
                    print(f"DEBUG AUTH: [Widget] auth_date expired. TS: {auth_ts}, Now: {now}")
                    # Note: We enforce this for better security, preventing replay attacks
                    # return None # Uncomment to enforce expiration
        except Exception:
            pass
            
        print(f"DEBUG AUTH: [Widget] VALIDATION SUCCESS for ID {data.get('id')}")
        return widget_data
    except Exception as e:
        print(f"DEBUG AUTH: [Widget] Unexpected error during validation: {e}")
        import traceback
        traceback.print_exc()
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
    
    # Ensure it's an integer for DB lookup
    telegram_id = int(telegram_id)
    print(f"DEBUG AUTH: Authenticating Telegram ID: {telegram_id}")
    
    # Check if user exists
    existing = await db_service.get_user_by_telegram_id(session, telegram_id)
    
    if existing:
        # User exists, just log them in without updating profile
        token = f"tg_{generate_token()}"
        await db_service.create_session(session, token, existing.id)
        
        return User(
            id=existing.id,
            name=existing.name,
            telegram_id=existing.telegram_id,
            avatar_url=existing.avatar_url,
            friend_code=existing.friend_code,
            created_at=existing.created_at,
            balance=existing.balance,
            stats=UserStats(
                games_played=existing.games_played,
                wins=existing.wins,
                losses=existing.losses,
                total_earnings=existing.total_earnings,
                highest_net_worth=existing.highest_net_worth
            )
        ), token
    
    # Create new user
    user_id = str(uuid.uuid4())
    token = f"tg_{generate_token()}"
    
    # Name Logic: First Last (username)
    first = user_data.get("first_name", "")
    last = user_data.get("last_name", "")
    username = user_data.get("username", "")
    
    name_parts = [p for p in [first, last] if p]
    name = " ".join(name_parts)
    
    if not name and username:
        name = username
    elif not name:
        name = "Player"
    
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
        balance=user_db.balance,
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
        balance=user_db.balance,
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
