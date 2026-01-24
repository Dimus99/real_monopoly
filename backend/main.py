"""
Political Monopoly Backend API
FastAPI application with WebSocket support for real-time gameplay.
Uses PostgreSQL for persistent storage.
"""
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional

from socket_manager import manager
from game_engine import engine
from auth import get_current_user, set_bot_token
from models import User, WSAction
from database import db
from db.base import engine as db_engine, async_session, close_db
from db import service as db_service

# Routes
from routes.users import router as users_router
from routes.friends import router as friends_router
from routes.games import router as games_router


async def game_loop():
    """Background loop for game maintenance."""
    while True:
        try:
            # Check timeouts
            updates = engine.check_timeouts()
            for update in updates:
                game_id = update["game_id"]
                # Broadcast kick
                await manager.broadcast(game_id, update)
            
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Game loop error: {e}")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    bot_token = os.getenv("BOT_TOKEN")
    if bot_token:
        set_bot_token(bot_token)
        print("✓ Telegram bot token configured")
    else:
        print("⚠ Warning: BOT_TOKEN not set, Telegram auth will run in dev mode")
    
    # Database info
    db_url = os.getenv("DATABASE_URL", "not set")
    if "asyncpg" in db_url or "postgresql" in db_url:
        # Hide password in logs
        safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
        print(f"✓ Database: PostgreSQL ({safe_url})")
    else:
        print(f"✓ Database URL configured")
    
    # Start background tasks
    task = asyncio.create_task(game_loop())
    print("🎮 MonopolyX Backend started!")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
        
    await close_db()
    print("Database connection closed")


app = FastAPI(
    title="MonopolyX API",
    description="Backend API for MonopolyX - a satirical multiplayer board game",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
allowed_origins = os.getenv("ALLOW_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users_router)
app.include_router(friends_router)
app.include_router(games_router)

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Serve Frontend static files
static_path = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_path):
    # Mount assets (CSS/JS)
    assets_path = os.path.join(static_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    
    from fastapi.responses import FileResponse
    
    # Static files like favicon.ico, etc.
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        return FileResponse(os.path.join(static_path, "favicon.ico"))

    # Catch-all for React Router (SPA)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Prevent infinite loop if file not found
        if full_path.startswith("api/"):
            return {"error": "API route not found", "path": full_path}
            
        file_path = os.path.join(static_path, full_path)
        if full_path != "" and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Default to index.html for SPA
        index_file = os.path.join(static_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend not built", "static_path": static_path}
else:
    @app.get("/")
    async def root_fallback():
        return {"status": "ok", "message": "API is running, but static files are missing."}


# ============== Health Check ==============

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "Political Monopoly API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Detailed health check."""
    # Get user count from database
    user_count = 0
    try:
        async with async_session() as session:
            users = await db_service.get_all_users(session)
            user_count = len(users)
    except Exception as e:
        print(f"Health check DB error: {e}")
    
    return {
        "status": "healthy",
        "games_active": len(engine.games),
        "users_registered": user_count,
        "websocket_connections": sum(len(conns) for conns in manager.game_connections.values())
    }


# ============== WebSocket Game Endpoint ==============

@app.websocket("/ws/{game_id}")
async def websocket_game(
    websocket: WebSocket, 
    game_id: str,
    token: Optional[str] = Query(None),
    player_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time game communication.
    
    Query params:
    - token: Auth token for user identification
    - player_id: Player ID in the game
    """
    game_id = game_id.upper()
    
    # Get user from token if provided
    user_id = None
    if token:
        try:
            async with async_session() as session:
                user_id = await db_service.get_session(session, token)
        except Exception as e:
            print(f"Token lookup error: {e}")
    
    # Verify game exists
    game = engine.games.get(game_id)
    if not game:
        await websocket.close(code=4004, reason="Game not found")
        return
    
    # Connect
    await manager.connect(websocket, game_id, user_id)
    
    from fastapi.encoders import jsonable_encoder
    
    try:
        # Send initial game state
        await websocket.send_json({
            "type": "CONNECTED",
            "game_state": jsonable_encoder(game)
        })
        
        while True:
            data = await websocket.receive_json()
            
            action = data.get("action")
            action_data = data.get("data", {})
            
            # Find player_id from user_id if not provided
            if not player_id and user_id:
                for pid, player in game.players.items():
                    if player.user_id == user_id:
                        player_id = pid
                        break
            
            if not player_id:
                await websocket.send_json({
                    "type": "ERROR",
                    "message": "Player not identified"
                })
                continue
            
            # Handle actions
            result = None
            
            if action == "ROLL":
                result = engine.roll_dice(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "DICE_ROLLED", **result})
                    
                    # If chance card drawn, also send as a system chat message
                    if result.get("chance_card"):
                        await manager.broadcast(game_id, {
                            "type": "CHAT_MESSAGE",
                            "player_id": "SYSTEM",
                            "player_name": "Breaking News",
                            "message": result["chance_card"],
                            "game_state": game.dict()
                        })

                    # Check if next player is bot
                    await _check_and_run_bot_turn(game_id)
            
            elif action == "BUY":
                property_id = action_data.get("property_id")
                if property_id is None:
                    # Buy current position
                    player = game.players.get(player_id)
                    if player:
                        property_id = player.position
                
                result = engine.buy_property(game_id, player_id, property_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "PROPERTY_BOUGHT", **result})
            
            elif action == "PAY_RENT":
                property_id = action_data.get("property_id")
                if property_id is None:
                    player = game.players.get(player_id)
                    if player:
                        property_id = player.position
                
                result = engine.pay_rent(game_id, player_id, property_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "RENT_PAID", **result})
            
            elif action == "END_TURN":
                result = engine.end_turn(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "TURN_ENDED", **result})
                    
                    # Check if next player is bot
                    await _check_and_run_bot_turn(game_id)
            
            elif action == "USE_ABILITY":
                ability_type = action_data.get("ability_type")
                target_id = action_data.get("target_id")
                
                result = engine.execute_ability(game_id, player_id, ability_type, target_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "ABILITY_USED", **result})
            
            elif action == "BUILD":
                property_id = action_data.get("property_id")
                result = engine.build_house(game_id, player_id, property_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "HOUSE_BUILT", **result})
            
            elif action == "MORTGAGE":
                property_id = action_data.get("property_id")
                result = engine.mortgage_property(game_id, player_id, property_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "PROPERTY_MORTGAGED", **result})

            elif action == "UNMORTGAGE":
                property_id = action_data.get("property_id")
                result = engine.unmortgage_property(game_id, player_id, property_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "PROPERTY_UNMORTGAGED", **result})

            elif action == "CHAT":
                # Simple chat broadcast
                message = action_data.get("message", "")
                player = game.players.get(player_id)
                if player and message:
                    # Save to game logs
                    engine.add_chat_message(game_id, player.name, message)
                    
                    await manager.broadcast(game_id, {
                        "type": "CHAT_MESSAGE",
                        "player_id": player_id,
                        "player_name": player.name,
                        "message": message[:200],  # Limit message length
                        "game_state": game.dict() # Send updated state so logs persist on reload
                    })
            
            elif action == "TRADE_OFFER":
                offer = {
                    "from_player_id": player_id,
                    "to_player_id": action_data.get("to_player_id"),
                    "offer_money": action_data.get("offer_money", 0),
                    "offer_properties": action_data.get("offer_properties", []),
                    "request_money": action_data.get("request_money", 0),
                    "request_properties": action_data.get("request_properties", [])
                }
                result = engine.create_trade(game_id, offer)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "TRADE_OFFERED", **result})
            
            elif action == "TRADE_RESPONSE":
                trade_id = action_data.get("trade_id")
                response = action_data.get("response") # accept / reject / cancel
                result = engine.respond_to_trade(game_id, trade_id, response)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "TRADE_UPDATED", **result})
            
            elif action == "PING":
                await websocket.send_json({"type": "PONG"})
            
            else:
                await websocket.send_json({
                    "type": "ERROR",
                    "message": f"Unknown action: {action}"
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
        # Notify others
        game = engine.games.get(game_id)
        if game and player_id and player_id in game.players:
            player = game.players[player_id]
            if not player.is_bot:
                await manager.broadcast(game_id, {
                    "type": "PLAYER_DISCONNECTED",
                    "player_id": player_id,
                    "player_name": player.name
                })
    
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def _check_and_run_bot_turn(game_id: str):
    """Check if it's a bot's turn and run it with dice animation timing."""
    game = engine.games.get(game_id)
    if not game or game.game_status != "active":
        return
    
    current_id = game.player_order[game.current_turn_index]
    player = game.players.get(current_id)
    
    if player:
        print(f"DEBUG: Checking turn: {player.name} (Bot: {player.is_bot})")
    
    if player and player.is_bot:
        print(f"DEBUG: Running bot turn for {player.name}")
        # Wait a bit for realism - increased pause
        await asyncio.sleep(2.0)
        
        # Step 1: Roll dice
        dice_result = engine.run_bot_turn(game_id)
        if dice_result:
            await manager.broadcast(game_id, dice_result)
            
            # Wait for dice animation to complete - increased pause
            await asyncio.sleep(3.0)
            
            # Step 2: Perform actions (buy, rent, ability)
            actions_result = engine.run_bot_post_roll(game_id, current_id)
            if actions_result:
                await manager.broadcast(game_id, actions_result)
            
            await asyncio.sleep(2.0)
            
            # Step 3: Check doubles or End Turn
            # dice_result was returned by roll_dice
            if dice_result.get("doubles"):
                 # Doubles! Roll again.
                 await _check_and_run_bot_turn(game_id)
            else:
                 # Not doubles. End turn.
                 end_result = engine.end_turn(game_id, current_id)
                 if not end_result.get("error"):
                     await manager.broadcast(game_id, {"type": "TURN_ENDED", **end_result})
                     
                     # Check if NEXT player is bot
                     await asyncio.sleep(1.0)
                     game = engine.games.get(game_id)
                     if game and game.game_status == "active":
                         # Re-fetch order
                         next_id = game.player_order[game.current_turn_index]
                         next_player = game.players.get(next_id)
                         if next_player and next_player.is_bot:
                             await _check_and_run_bot_turn(game_id)


# ============== Game Action REST Endpoints (Alternative to WebSocket) ==============

@app.post("/api/games/{game_id}/roll")
async def roll_dice(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """Roll dice (REST alternative to WebSocket)."""
    game_id = game_id.upper()
    game = engine.games.get(game_id)
    
    if not game:
        return {"error": "Game not found"}
    
    # Find player
    player_id = None
    for pid, player in game.players.items():
        if player.user_id == current_user.id:
            player_id = pid
            break
    
    if not player_id:
        return {"error": "Not in this game"}
    
    result = engine.roll_dice(game_id, player_id)
    
    # Broadcast via WebSocket
    if not result.get("error"):
        await manager.broadcast(game_id, {"type": "DICE_ROLLED", **result})
        await _check_and_run_bot_turn(game_id)
    
    return result


@app.post("/api/games/{game_id}/buy/{property_id}")
async def buy_property(
    game_id: str,
    property_id: int,
    current_user: User = Depends(get_current_user)
):
    """Buy a property (REST alternative)."""
    game_id = game_id.upper()
    game = engine.games.get(game_id)
    
    if not game:
        return {"error": "Game not found"}
    
    player_id = None
    for pid, player in game.players.items():
        if player.user_id == current_user.id:
            player_id = pid
            break
    
    if not player_id:
        return {"error": "Not in this game"}
    
    result = engine.buy_property(game_id, player_id, property_id)
    
    if not result.get("error"):
        await manager.broadcast(game_id, {"type": "PROPERTY_BOUGHT", **result})
    
    return result


@app.post("/api/games/{game_id}/ability")
async def use_ability(
    game_id: str,
    ability_type: str,
    target_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Use special ability (REST alternative)."""
    game_id = game_id.upper()
    game = engine.games.get(game_id)
    
    if not game:
        return {"error": "Game not found"}
    
    player_id = None
    for pid, player in game.players.items():
        if player.user_id == current_user.id:
            player_id = pid
            break
    
    if not player_id:
        return {"error": "Not in this game"}
    
    result = engine.execute_ability(game_id, player_id, ability_type, target_id)
    
    if not result.get("error"):
        await manager.broadcast(game_id, {"type": "ABILITY_USED", **result})
    
    return result


@app.post("/api/games/{game_id}/end-turn")
async def end_turn(
    game_id: str,
    current_user: User = Depends(get_current_user)
):
    """End current turn (REST alternative)."""
    game_id = game_id.upper()
    game = engine.games.get(game_id)
    
    if not game:
        return {"error": "Game not found"}
    
    player_id = None
    for pid, player in game.players.items():
        if player.user_id == current_user.id:
            player_id = pid
            break
    
    if not player_id:
        return {"error": "Not in this game"}
    
    result = engine.end_turn(game_id, player_id)
    
    if not result.get("error"):
        await manager.broadcast(game_id, {"type": "TURN_ENDED", **result})
        await _check_and_run_bot_turn(game_id)
    
    return result





# ============== Debug Endpoints (Dev Only) ==============

if os.getenv("DEBUG", "false").lower() == "true":
    from sqlalchemy.ext.asyncio import AsyncSession
    from db.base import get_db
    
    @app.get("/debug/games")
    async def debug_games():
        """List all games (debug)."""
        return {
            "games": {
                gid: {
                    "status": g.game_status,
                    "players": len(g.players),
                    "turn": g.current_turn_index
                }
                for gid, g in engine.games.items()
            }
        }
    
    @app.get("/debug/users")
    async def debug_users():
        """List all users (debug)."""
        async with async_session() as session:
            users = await db_service.get_all_users(session)
            return {
                "users": [
                    {"id": u.id, "name": u.name, "telegram_id": u.telegram_id}
                    for u in users
                ]
            }
    
    @app.delete("/debug/reset")
    async def debug_reset():
        """Reset all in-memory data (debug). Database data persists."""
        engine.games.clear()
        db.online_status.clear()
        return {"status": "in-memory reset complete", "note": "Database data preserved"}
