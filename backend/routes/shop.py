from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Literal, Optional
import httpx
import os

from database import db
from db.base import get_db
from db import service as db_service
from models import User
import auth
from auth import get_current_user

router = APIRouter(prefix="/api/shop", tags=["shop"])

# Shop items configuration
CURRENCY_PACKS = {
    "small": {"amount": 10000, "stars": 9, "title": "10,000 Монет", "description": "Стартовый капитал"},
    "large": {"amount": 100000, "stars": 39, "title": "100,000 Монет", "description": "Для серьезных игроков"},
    "vip_1": {"amount": 0, "stars": 9, "title": "VIP Статус (1 день)", "description": "Попробовать все фишки", "days": 1},
    "vip_7": {"amount": 0, "stars": 49, "title": "VIP Статус (7 дней)", "description": "Для активной игры", "days": 7},
    "vip": {"amount": 0, "stars": 149, "title": "VIP Статус (30 дней)", "description": "Эксклюзивные аватары и бонусы", "days": 30}
}

@router.post("/daily-bonus")
async def get_daily_bonus(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Claim daily bonus of 5,000."""
    result = await db_service.claim_daily_bonus(session, current_user.id, 5000)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result

@router.post("/create-stars-invoice")
async def create_stars_invoice(
    item_id: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Create a Telegram Stars invoice link for shop items."""
    if not auth.BOT_TOKEN:
        # Dev mode mock
        return {"success": True, "invoice_url": f"https://t.me/invoice/mock_{item_id}", "is_mock": True}
    
    item = CURRENCY_PACKS.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # In Telegram Mini Apps, for digital goods we use createInvoiceLink
    # https://core.telegram.org/bots/api#createinvoicelink
    
    payload = {
        "title": item["title"],
        "description": item["description"],
        "payload": f"shop_{item_id}_{current_user.id}",
        "provider_token": "", # Empty for XTR (Telegram Stars)
        "currency": "XTR",
        "prices": [{"label": item["title"], "amount": item["stars"]}]
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{auth.BOT_TOKEN}/createInvoiceLink",
            json=payload
        )
        data = resp.json()
        if not data.get("ok"):
            print(f"DEBUG SHOP: Invoice error: {data}")
            raise HTTPException(status_code=500, detail="Failed to create invoice")
        
        return {"success": True, "invoice_url": data["result"]}

@router.post("/buy-currency")
async def buy_currency(
    amount: int = Body(..., embed=True),
    cost_stars: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """
    Deprecated/Dev: Manual buy. 
    In production, this is handled via telegram webhook.
    """
    if auth.BOT_TOKEN:
        raise HTTPException(status_code=400, detail="Use /create-stars-invoice in production")
        
    new_user = await db_service.add_user_balance(session, current_user.id, amount)
    return {"success": True, "new_balance": new_user.balance, "message": f"Added ${amount} to balance (Dev Mode)"}

@router.post("/buy-vip")
async def buy_vip(
    days: int = Body(..., embed=True),
    cost_stars: Optional[int] = Body(None, embed=True),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Deprecated/Dev: Manual VIP buy."""
    if auth.BOT_TOKEN:
         raise HTTPException(status_code=400, detail="Use /create-stars-invoice in production")
    
    now = datetime.utcnow()
    current_expiry = current_user.vip_expires_at
    if current_user.is_vip and current_expiry and current_expiry > now:
        new_expiry = current_expiry + timedelta(days=days)
    else:
        new_expiry = now + timedelta(days=days)

    await db_service.update_user(session, current_user.id, {
        "is_vip": True,
        "vip_expires_at": new_expiry
    })
    return {"success": True, "is_vip": True, "vip_expires_at": new_expiry.isoformat(), "message": "VIP status activated (Dev Mode)"}

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
