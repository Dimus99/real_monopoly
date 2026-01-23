"""
Friend system routes.
Uses PostgreSQL for persistent storage.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from database import db
from db.base import get_db
from db import service as db_service
from models import (
    User, UserPublic, UserStats,
    FriendRequest, FriendRequestCreate
)
from auth import get_current_user

router = APIRouter(prefix="/api/friends", tags=["friends"])


def user_db_to_public(user_db) -> UserPublic:
    """Convert database user model to public Pydantic model."""
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


# ============== Friends List ==============

@router.get("", response_model=List[UserPublic])
async def get_friends(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get current user's friends list."""
    friends = await db_service.get_friends(session, current_user.id)
    return [user_db_to_public(f) for f in friends]


@router.delete("/{user_id}")
async def remove_friend(
    user_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Remove a friend."""
    if not await db_service.are_friends(session, current_user.id, user_id):
        raise HTTPException(status_code=404, detail="Not friends with this user")
    
    await db_service.remove_friendship(session, current_user.id, user_id)
    
    return {"success": True, "message": "Friend removed"}


# ============== Friend Requests ==============

@router.get("/requests", response_model=List[dict])
async def get_pending_requests(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get pending friend requests for current user."""
    requests = await db_service.get_pending_requests_for_user(session, current_user.id)
    
    # Enrich with user info
    result = []
    for req in requests:
        from_user = await db_service.get_user(session, req.from_user_id)
        if from_user:
            result.append({
                "id": req.id,
                "from_user": user_db_to_public(from_user).model_dump(),
                "created_at": req.created_at.isoformat() if req.created_at else None
            })
    
    return result


@router.get("/requests/sent", response_model=List[dict])
async def get_sent_requests(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get friend requests sent by current user."""
    requests = await db_service.get_sent_requests_by_user(session, current_user.id)
    
    # Enrich with user info
    result = []
    for req in requests:
        if req.status.value != "pending":
            continue
        to_user = await db_service.get_user(session, req.to_user_id)
        if to_user:
            result.append({
                "id": req.id,
                "to_user": user_db_to_public(to_user).model_dump(),
                "status": req.status.value,
                "created_at": req.created_at.isoformat() if req.created_at else None
            })
    
    return result


@router.post("/request")
async def send_friend_request(
    request: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Send a friend request."""
    to_user_id = request.to_user_id
    
    # If using friend code, find user by code
    if request.friend_code:
        friend_code = request.friend_code.upper()
        user_by_code = await db_service.get_user_by_friend_code(session, friend_code)
        if user_by_code:
            to_user_id = user_by_code.id
        else:
            raise HTTPException(status_code=404, detail="User with this friend code not found")
    
    if not to_user_id:
        raise HTTPException(status_code=400, detail="Either to_user_id or friend_code is required")
    
    # Validate target user exists
    target_user = await db_service.get_user(session, to_user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Can't send request to yourself
    if to_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    # Check if already friends
    if await db_service.are_friends(session, current_user.id, to_user_id):
        raise HTTPException(status_code=400, detail="Already friends with this user")
    
    # Check for existing pending request
    existing = await db_service.get_existing_request(session, current_user.id, to_user_id)
    if existing:
        # If they sent us a request, auto-accept it
        if existing.from_user_id == to_user_id:
            await db_service.update_friend_request(session, existing.id, {"status": "accepted"})
            await db_service.add_friendship(session, current_user.id, to_user_id)
            return {
                "success": True, 
                "message": "Friend added! (They had already sent you a request)",
                "status": "accepted"
            }
        else:
            raise HTTPException(status_code=400, detail="Friend request already sent")
    
    # Create new request
    request_id = str(uuid.uuid4())
    request_data = {
        "id": request_id,
        "from_user_id": current_user.id,
        "to_user_id": to_user_id,
    }
    
    await db_service.create_friend_request(session, request_data)
    
    return {
        "success": True,
        "message": "Friend request sent",
        "request_id": request_id
    }


@router.post("/requests/{request_id}/accept")
async def accept_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Accept a friend request."""
    request_db = await db_service.get_friend_request(session, request_id)
    
    if not request_db:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if request_db.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This request is not for you")
    
    if request_db.status.value != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {request_db.status.value}")
    
    # Accept the request
    await db_service.update_friend_request(session, request_id, {"status": "accepted"})
    await db_service.add_friendship(session, current_user.id, request_db.from_user_id)
    
    from_user = await db_service.get_user(session, request_db.from_user_id)
    
    return {
        "success": True,
        "message": f"You are now friends with {from_user.name if from_user else 'this user'}"
    }


@router.post("/requests/{request_id}/reject")
async def reject_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Reject a friend request."""
    request_db = await db_service.get_friend_request(session, request_id)
    
    if not request_db:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if request_db.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This request is not for you")
    
    if request_db.status.value != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {request_db.status.value}")
    
    await db_service.update_friend_request(session, request_id, {"status": "rejected"})
    
    return {"success": True, "message": "Friend request rejected"}


@router.post("/requests/{request_id}/cancel")
async def cancel_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Cancel a friend request you sent."""
    request_db = await db_service.get_friend_request(session, request_id)
    
    if not request_db:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    if request_db.from_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This is not your request")
    
    if request_db.status.value != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {request_db.status.value}")
    
    # Mark as rejected (soft delete)
    await db_service.update_friend_request(session, request_id, {"status": "rejected"})
    
    return {"success": True, "message": "Friend request cancelled"}
