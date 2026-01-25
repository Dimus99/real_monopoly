"""
Game management routes.
Uses PostgreSQL for persistent storage.
Game state is kept in-memory for real-time performance.
"""
import uuid
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from database import db
from db.base import get_db
from db import service as db_service
from models import (
    User, UserPublic, UserStats, Player,
    GameState, CreateGameRequest, JoinGameRequest,
    GameInvite, GameInviteCreate, GameActionResponse
)
from auth import get_current_user

router = APIRouter(prefix="/api/games", tags=["games"])

# Character colors
CHARACTER_COLORS = {
    "Putin": "#DC2626",    # Red
    "Trump": "#F97316",    # Orange
    "Zelensky": "#FBBF24", # Yellow
    "Kim": "#10B981",      # Green
    "Biden": "#3B82F6",    # Blue
    "Xi": "#8B5CF6"        # Purple
}


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


def get_game_engine():
    """Get the game engine instance."""
    from game_engine import engine
    return engine


# ============== Game Management ==============

@router.get("/my-active")
async def get_my_active_games(current_user: User = Depends(get_current_user)):
    """Get active games for current user."""
    engine = get_game_engine()
    games = engine.get_user_active_games(current_user.id)
    return {"games": games}

@router.post("", response_model=dict)
async def create_game(
    request: CreateGameRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a new game. The creator becomes the host."""
    engine = get_game_engine()
    
    game_id = str(uuid.uuid4())[:8].upper()
    starting_money = request.starting_money
    if request.map_type == "Monopoly1" and starting_money == 1500:
        starting_money = 15000 # Standard Monopoly One start
        
    game = engine.create_game(
        game_id=game_id, 
        map_type=request.map_type,
        game_mode=request.game_mode,
        host_id=current_user.id,
        starting_money=starting_money,
        max_players=request.max_players,
        turn_timer=request.turn_timer
    )
    
    return {
        "game_id": game_id,
        "game_state": game.dict()
    }


@router.get("/{game_id}")
async def get_game(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get game state."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return {"game_state": game.dict()}


@router.get("")
async def list_games(
    current_user: User = Depends(get_current_user),
    status: Optional[str] = None
):
    """List available games."""
    engine = get_game_engine()
    
    games = []
    for game in engine.games.values():
        if status and game.game_status != status:
            continue
        
        games.append({
            "game_id": game.game_id,
            "map_type": game.map_type,
            "status": game.game_status,
            "player_count": len(game.players),
            "max_players": game.max_players,
            "host_id": game.host_id,
            "created_at": game.created_at.isoformat() if game.created_at else None
        })
    
    return {"games": games}


@router.post("/{game_id}/join")
async def join_game(
    game_id: str,
    request: JoinGameRequest,
    current_user: User = Depends(get_current_user)
):
    """Join a game."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.game_status != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    if len(game.players) >= game.max_players:
        raise HTTPException(status_code=400, detail="Game is full")
    
    # Check if already in game
    for pid, player in game.players.items():
        if player.user_id == current_user.id:
            return {
                "player_id": pid,
                "game_state": game.dict(),
                "message": "Already in this game"
            }
    
    # Check if character is taken
    used_chars = [p.character for p in game.players.values()]
    if request.character in used_chars:
        raise HTTPException(status_code=400, detail="Character already taken")
    
    # Create player
    player_id = str(uuid.uuid4())
    player = Player(
        id=player_id,
        user_id=current_user.id,
        name=current_user.name,
        character=request.character,
        color=CHARACTER_COLORS.get(request.character, "#888888"),
        avatar_url=current_user.avatar_url,
        money=game.starting_money
    )
    
    engine.add_player(game_id.upper(), player)
    
    # Broadcast to other players
    from socket_manager import manager
    import asyncio
    asyncio.create_task(
        manager.broadcast(game_id.upper(), {
            "type": "PLAYER_JOINED",
            "player": player.dict(),
            "game_state": game.dict()
        })
    )
    
    return {
        "player_id": player_id,
        "game_state": game.dict()
    }


@router.post("/{game_id}/leave")
async def leave_game(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """Leave a game."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Find player
    player_id = None
    for pid, player in game.players.items():
        if player.user_id == current_user.id:
            player_id = pid
            break
    
    if not player_id:
        raise HTTPException(status_code=400, detail="Not in this game")
    
    # Remove player
    del game.players[player_id]
    if player_id in game.player_order:
        game.player_order.remove(player_id)
        # Fix turn index if it became out of bounds to maintain correct turn order
        if game.player_order:
            game.current_turn_index = game.current_turn_index % len(game.player_order)
        else:
            game.current_turn_index = 0
            
    # If game is active, mark player as bankrupt
    if game.game_status == "active":
        # Handle mid-game leave as bankruptcy
        pass
    
    # Broadcast
    from socket_manager import manager
    import asyncio
    asyncio.create_task(
        manager.broadcast(game_id.upper(), {
            "type": "PLAYER_LEFT",
            "player_id": player_id,
            "game_state": game.dict()
        })
    )

    # Check if no humans left -> Delete game
    active_humans = [p for p in game.players.values() if not p.is_bot]
    if not active_humans:
        if game_id.upper() in engine.games:
            del engine.games[game_id.upper()]
            print(f"Game {game_id} deleted because no humans left.")
    
    # Check if only 1 player (human or bot) left in active game -> End game
    elif game.game_status == "active" and len(game.players) < 2:
         game.game_status = "finished"
         if len(game.players) == 1:
             winner = list(game.players.values())[0]
             game.winner_id = winner.id
             game.logs.append(f"🏆 {winner.name} wins by default!")
             # Broadcast finish
             asyncio.create_task(
                manager.broadcast(game_id.upper(), {
                    "type": "GAME_OVER",
                    "game_state": game.dict()
                })
             )
    
    return {"success": True, "message": "Left the game"}


@router.post("/{game_id}/start")
async def start_game(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """Start the game (host only)."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if host
    is_host = False
    for player in game.players.values():
        if player.user_id == current_user.id:
            if game.host_id == current_user.id:
                is_host = True
            break
    
    if not is_host:
        raise HTTPException(status_code=403, detail="Only the host can start the game")
    
    if len(game.players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players to start")
    
    if game.game_status != "waiting":
        raise HTTPException(status_code=400, detail="Game already started")
    
    # Start the game
    game.game_status = "active"
    game.started_at = datetime.utcnow()
    
    # Randomize player order
    random.shuffle(game.player_order)
    
    # Add to logs
    game.logs.append(f"Game started! Turn order: {', '.join([game.players[p].name for p in game.player_order])}")
    
    # Set initial turn expiry
    game.turn_expiry = datetime.utcnow() + timedelta(seconds=45)
    
    # Broadcast
    from socket_manager import manager
    import asyncio
    asyncio.create_task(
        manager.broadcast(game_id.upper(), {
            "type": "GAME_STARTED",
            "game_state": game.dict()
        })
    )
    
    # Check if first player is a bot and start their turn
    first_player_id = game.player_order[0] if game.player_order else None
    first_player = game.players.get(first_player_id)
    if first_player and first_player.is_bot:
        asyncio.create_task(_run_bot_after_delay(game_id.upper()))
    
    return {"success": True, "game_state": game.dict()}


async def _run_bot_after_delay(game_id: str):
    """Helper to run bot turn with realistic dice animation timing."""
    import asyncio
    from socket_manager import manager
    
    await asyncio.sleep(0.5)  # Brief pause before bot acts
    
    engine = get_game_engine()
    game = engine.games.get(game_id)
    if not game or game.game_status != "active":
        return
    
    current_id = game.player_order[game.current_turn_index]
    current_player = game.players.get(current_id)
    
    if not current_player or not current_player.is_bot:
        return
    
    # Step 1: Roll dice (this broadcasts DICE_ROLLED)
    dice_result = engine.run_bot_turn(game_id)
    if dice_result:
        await manager.broadcast(game_id, dice_result)
        
        # Wait for dice animation to complete (match frontend timing)
        await asyncio.sleep(2.0)
        
        # Step 2: Perform post-roll actions (buy, pay rent, etc.)
        game = engine.games.get(game_id)
        if not game or game.game_status != "active": 
            return

        actions_result = engine.run_bot_post_roll(game_id, current_id)
        if actions_result:
            await manager.broadcast(game_id, actions_result)
        
        await asyncio.sleep(0.5) # Pause before ending turn

        # Step 3: Check doubles or End Turn
        current_player = game.players.get(current_id) # Refresh state
        is_jailed = current_player and current_player.is_jailed
        
        # Only roll again if doubles AND not jailed (standard rule)
        if dice_result.get("doubles") and not is_jailed:
             await _run_bot_after_delay(game_id) # Recursive call for doubles
        else:
             # End current turn
             end_result = engine.end_turn(game_id, current_id)
             if not end_result.get("error"):
                 await manager.broadcast(game_id, {"type": "TURN_ENDED", **end_result})
                 
                 # Check if NEXT player is also a bot
                 await asyncio.sleep(0.5)
                 game = engine.games.get(game_id)
                 if game and game.game_status == "active":
                     next_id = game.player_order[game.current_turn_index]
                     next_player = game.players.get(next_id)
                     if next_player and next_player.is_bot:
                         await _run_bot_after_delay(game_id)


@router.post("/{game_id}/bots")
async def add_bot(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """Add a bot to the game (host only)."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if host
    is_host = game.host_id == current_user.id
    if not is_host:
        raise HTTPException(status_code=403, detail="Only the host can add bots")
    
    if game.game_status != "waiting":
        raise HTTPException(status_code=400, detail="Cannot add bots after game started")
    
    if len(game.players) >= game.max_players:
        raise HTTPException(status_code=400, detail="Game is full")
    
    # Find available character
    used_chars = [p.character for p in game.players.values()]
    all_chars = ["Putin", "Trump", "Zelensky", "Kim", "Biden", "Xi"]
    available = [c for c in all_chars if c not in used_chars]
    
    if not available:
        raise HTTPException(status_code=400, detail="No characters available")
    
    character = random.choice(available)
    
    # Create bot
    bot_id = str(uuid.uuid4())
    bot = Player(
        id=bot_id,
        name=f"Bot {character}",
        character=character,
        color=CHARACTER_COLORS.get(character, "#555555"),
        is_bot=True,
        money=game.starting_money
    )
    
    engine.add_player(game_id.upper(), bot)
    
    # Broadcast
    from socket_manager import manager
    import asyncio
    asyncio.create_task(
        manager.broadcast(game_id.upper(), {
            "type": "PLAYER_JOINED",
            "player": bot.dict(),
            "game_state": game.dict()
        })
    )
    
    return {
        "bot_id": bot_id,
        "character": character,
        "game_state": game.dict()
    }


@router.delete("/{game_id}/bots/{bot_id}")
async def remove_bot(
    game_id: str,
    bot_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a bot from the game (host only)."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can remove bots")
    
    if game.game_status != "waiting":
        raise HTTPException(status_code=400, detail="Cannot remove bots after game started")
    
    if bot_id not in game.players:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if not game.players[bot_id].is_bot:
        raise HTTPException(status_code=400, detail="This player is not a bot")
    
    del game.players[bot_id]
    if bot_id in game.player_order:
        game.player_order.remove(bot_id)
    
    # Broadcast removal
    from socket_manager import manager
    import asyncio
    asyncio.create_task(
        manager.broadcast(game_id.upper(), {
            "type": "PLAYER_LEFT",
            "player_id": bot_id,
            "game_state": game.dict()
        })
    )
    
    return {"success": True, "game_state": game.dict()}


# ============== Game Invites ==============

@router.post("/{game_id}/invite")
async def invite_friend(
    game_id: str,
    request: GameInviteCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Invite a friend to join the game."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Remove restriction on inviting after start
    # if game.game_status != "waiting":
    #    raise HTTPException(status_code=400, detail="Cannot invite players after game started")
    
    # Verify user is in game
    in_game = any(p.user_id == current_user.id for p in game.players.values())
    if not in_game:
        raise HTTPException(status_code=403, detail="You must be in the game to invite")
    
    # Verify target user exists
    target = await db_service.get_user(session, request.to_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if they're already in game
    already_in = any(p.user_id == request.to_user_id for p in game.players.values())
    if already_in:
        raise HTTPException(status_code=400, detail="User is already in this game")
    
    # Create invite
    invite_id = str(uuid.uuid4())
    invite_data = {
        "id": invite_id,
        "game_id": game_id.upper(),
        "from_user_id": current_user.id,
        "to_user_id": request.to_user_id,
    }
    
    await db_service.create_game_invite(session, invite_data)
    
    return {
        "success": True,
        "invite_id": invite_id,
        "message": f"Invite sent to {target.name}"
    }


@router.get("/invites/pending")
async def get_pending_invites(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get pending game invites for current user."""
    invites = await db_service.get_pending_invites_for_user(session, current_user.id)
    
    result = []
    for inv in invites:
        from_user = await db_service.get_user(session, inv.from_user_id)
        engine = get_game_engine()
        game = engine.games.get(inv.game_id)
        
        if game and game.game_status == "waiting":
            result.append({
                "id": inv.id,
                "game_id": inv.game_id,
                "from_user": user_db_to_public(from_user).model_dump() if from_user else None,
                "player_count": len(game.players),
                "map_type": game.map_type,
                "created_at": inv.created_at.isoformat() if inv.created_at else None
            })
    
    return {"invites": result}


@router.post("/invites/{invite_id}/accept")
async def accept_game_invite(
    invite_id: str,
    request: JoinGameRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Accept a game invite and join the game."""
    invite = await db_service.get_game_invite(session, invite_id)
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invite is not for you")
    
    if invite.status.value != "pending":
        raise HTTPException(status_code=400, detail=f"Invite already {invite.status.value}")
    
    # Update invite status
    await db_service.update_game_invite(session, invite_id, {"status": "accepted"})
    
    # Join the game
    return await join_game(invite.game_id, request, current_user)


@router.post("/invites/{invite_id}/decline")
async def decline_game_invite(
    invite_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Decline a game invite."""
    invite = await db_service.get_game_invite(session, invite_id)
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.to_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="This invite is not for you")
    
    await db_service.update_game_invite(session, invite_id, {"status": "declined"})
    
    return {"success": True, "message": "Invite declined"}


# ============== Available Characters ==============

@router.get("/{game_id}/characters")
async def get_available_characters(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get available characters for a game."""
    engine = get_game_engine()
    game = engine.games.get(game_id.upper())
    
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    all_chars = ["Putin", "Trump", "Zelensky", "Kim", "Biden", "Xi"]
    used_chars = [p.character for p in game.players.values()]
    
    characters = []
    for char in all_chars:
        characters.append({
            "name": char,
            "available": char not in used_chars,
            "color": CHARACTER_COLORS.get(char, "#888888")
        })
    
    return {"characters": characters}
