from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal

from database import db
from db.base import get_db
from db import service as db_service
from models import User
from auth import get_current_user

router = APIRouter(prefix="/api/shop", tags=["shop"])

@router.post("/buy-currency")
async def buy_currency(
    amount: int = Body(..., embed=True),
    cost_stars: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Buy in-game currency.
    For now, this is a mock endpoint that trusts the client's 'cost_stars'.
    In production, this should verify a Telegram Payment provider payload.
    """
    # Simulate payment verification
    # if not verify_telegram_payment(payment_id): raise ...
    
    # Add balance
    new_balance = current_user.balance + amount
    await db_service.update_user(session, current_user.id, {"balance": new_balance})
    
    return {"success": True, "new_balance": new_balance, "message": f"Added ${amount} to balance"}

@router.post("/buy-vip")
async def buy_vip(
    days: int = Body(..., embed=True),
    cost_stars: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Buy VIP status.
    """
    # Calculate expiration
    now = datetime.utcnow()
    # If already VIP and not expired, extend it
    current_expiry = current_user.vip_expires_at
    if current_user.is_vip and current_expiry and current_expiry > now:
        new_expiry = current_expiry + timedelta(days=days)
    else:
        new_expiry = now + timedelta(days=days)
    
    await db_service.update_user(session, current_user.id, {
        "is_vip": True, 
        "vip_expires_at": new_expiry
    })
    
    return {
        "success": True, 
        "is_vip": True, 
        "vip_expires_at": new_expiry.isoformat(),
        "message": f"VIP activated for {days} days"
    }

@router.post("/select-token")
async def select_token(
    token: Literal["avatar", "car", "billionaire"] = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Select a token for the game board.
    VIP only for 'car' and 'billionaire'.
    """
    if token in ["car", "billionaire"] and not current_user.is_vip:
        # Check if VIP is expired
        if not current_user.vip_expires_at or current_user.vip_expires_at < datetime.utcnow():
             raise HTTPException(status_code=403, detail="VIP status required for this token")

    await db_service.update_user(session, current_user.id, {"selected_token": token})
    
    return {"success": True, "selected_token": token}
