"""
Political Monopoly Backend API
FastAPI application with WebSocket support for real-time gameplay.
Uses PostgreSQL for persistent storage.
"""
import os
import asyncio
import random
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Optional, Union

from socket_manager import manager
from game_engine import engine
from auth import get_current_user, set_bot_token
from models import User, WSAction
from database import db
from db.base import engine as db_engine, async_session, close_db
from db import service as db_service
from poker_engine import poker_engine
from sqlalchemy import text

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

async def poker_timer_loop():
    """Background loop for poker timers."""
    while True:
        try:
            for table_id, table in poker_engine["tables"].items():
                result = table.check_timers()
                if result:
                    poker_scope = f"poker_{table_id}"
                    
                    # Refund handling if kicked
                    if result.get("type") == "KICKED":
                         refund = result.get("refund", 0)
                         uid = result.get("user_id")
                         if refund > 0 and uid and not uid.startswith("bot_"): # Bots don't need refund
                             async with async_session() as session:
                                 await session.execute(text("UPDATE users SET balance = balance + :amt WHERE id = :uid"), {"amt": refund, "uid": uid})
                                 await session.commit()
                    
                    # Broadcast Update
                    await manager.broadcast(poker_scope, {
                        "type": "GAME_UPDATE",
                        "state": result["state"]
                    })
                    
                    # Check if next is bot
                    if result.get("next_is_bot"):
                         asyncio.create_task(run_poker_bot_turn(table_id))
            
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Poker timer loop error: {e}")
            await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    bot_token = os.getenv("BOT_TOKEN")
    if bot_token:
        from auth import set_bot_token, fetch_bot_username
        set_bot_token(bot_token)
        print("✓ Telegram bot token configured")
        # Automatically fetch bot info to correct deep links
        asyncio.create_task(fetch_bot_username())
    else:
        print("⚠ Warning: BOT_TOKEN not set, Telegram auth will run in dev mode")
    
    # Start Game Loop
    asyncio.create_task(game_loop())
    asyncio.create_task(poker_timer_loop())
    
    # Database info
    db_url = os.getenv("DATABASE_URL", "not set")
    
    # Setup Telegram Webhook
    if bot_token:
        try:
            import httpx
            # Your Public URL (Railway)
            PUBLIC_URL = os.getenv("VITE_API_URL", "https://realmonopoly-production.up.railway.app")
            webhook_url = f"{PUBLIC_URL}/webhook/telegram"
            
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"https://api.telegram.org/bot{bot_token}/setWebhook?url={webhook_url}")
                print(f"✓ Telegram Webhook set: {resp.json()}")
        except Exception as e:
            print(f"⚠ Failed to set webhook: {e}")

    if "asyncpg" in db_url or "postgresql" in db_url:
        # Hide password in logs
        safe_url = db_url.split("@")[-1] if "@" in db_url else db_url
        print(f"✓ Database: PostgreSQL ({safe_url})")
    else:
        print(f"✓ Database URL configured")
    
    # Database cleanup: Remove users without a Telegram ID
    try:
        from sqlalchemy import delete
        from db.models import UserDB
        async with async_session() as session:
            async with session.begin():
                stmt = delete(UserDB).where(UserDB.telegram_id == None)
                result = await session.execute(stmt)
                if result.rowcount > 0:
                    print(f"🧹 Database Cleanup: Deleted {result.rowcount} orphan users without Telegram ID")
    except Exception as e:
        print(f"⚠ Cleanup failed: {e}")

    # Database Migration: Add balance column if missing
    try:
        async with async_session() as session:
            async with session.begin():
                # Check directly via SQL as this is safer for partial migrations
                # This is PostgreSQL specific syntax
                try:
                    await session.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS balance BIGINT DEFAULT 10000"))
                    print("✓ Database: Verified 'balance' column exists")
                except Exception as e:
                    print(f"⚠ Database migration warning: {e}")
    except Exception as e:
        print(f"⚠ Database connection failed checking columns: {e}")

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

@app.post("/api/users/bonus")
async def get_bonus(current_user: User = Depends(get_current_user)):
    """Get free 10k chips."""
    async with async_session() as session:
        # Fetch directly to update
        from db.models import UserDB
        result = await session.execute(text("SELECT id, balance FROM users WHERE id = :uid"), {"uid": current_user.id})
        user_row = result.fetchone()
        
        if user_row:
             new_bal = (user_row.balance or 0) + 10000
             await session.execute(
                 text("UPDATE users SET balance = :b WHERE id = :uid"),
                 {"b": new_bal, "uid": current_user.id}
             )
             await session.commit()
             return {"success": True, "new_balance": new_bal}
    return {"error": "User not found"}

@app.get("/api/poker/tables")
async def get_poker_tables():
    """Get list of poker tables."""
    tables = []
    for tid, table in poker_engine["tables"].items():
        tables.append({
            "id": tid,
            "name": table.name,
            "players": len(table.seats),
            "max_seats": table.max_seats,
            "small_blind": table.small_blind,
            "big_blind": table.big_blind,
            "min_buy": getattr(table, 'min_buy_in', table.big_blind * 20),
            "max_buy": getattr(table, 'max_buy_in', 1000000)
        })
    return tables

@app.websocket("/ws/poker/{table_id}")
async def websocket_poker(
    websocket: WebSocket,
    table_id: str,
    token: Optional[str] = Query(None)
):
    table = poker_engine["tables"].get(table_id)
    if not table:
        await websocket.close(code=4004, reason="Table not found")
        return

    # Auth logic
    user = None
    if token:
        async with async_session() as session:
            user_id = await db_service.get_session(session, token)
            if user_id:
                user = await db_service.get_user(session, user_id)
      
    if not user:
         await websocket.close(code=4003, reason="Auth required")
         return

    # Use poker_{table_id} scope for manager
    poker_scope = f"poker_{table_id}"
    await manager.connect(websocket, poker_scope, user.id)
    
    # Send initial state (with private hand)
    await websocket.send_json({
        "type": "CONNECTED",
        "state": table.get_player_state(user.id)
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            resp = None
            should_broadcast = False
            
            if action == "JOIN":
                buy_in = data.get("buy_in", 1000)
                async with async_session() as session:
                     u = await db_service.get_user(session, user.id)
                     if u.balance < buy_in:
                         resp = {"error": "Not enough balance"}
                     else:
                         await session.execute(text("UPDATE users SET balance = balance - :amt WHERE id = :uid"), {"amt": buy_in, "uid": user.id})
                         await session.commit()
                         resp = table.add_player(user, buy_in, requested_seat=data.get("requested_seat"))
                         if resp.get("error"):
                             await session.execute(text("UPDATE users SET balance = balance + :amt WHERE id = :uid"), {"amt": buy_in, "uid": user.id})
                             await session.commit()
                         else:
                             should_broadcast = True
            
            elif action == "LEAVE":
                 leave_res = table.remove_player(user.id)
                 if leave_res.get("success"):
                      refund = leave_res.get("refund", 0)
                      if refund > 0:
                          async with async_session() as session:
                              await session.execute(text("UPDATE users SET balance = balance + :amt WHERE id = :uid"), {"amt": refund, "uid": user.id})
                              await session.commit()
                 resp = leave_res
                 should_broadcast = True

            elif action in ["FOLD", "CALL", "CHECK", "RAISE"]:
                 amount = data.get("amount", 0)
                 resp = table.handle_action(user.id, action, amount)
                 should_broadcast = True
            
            elif action == "START":
                 # Check if waiting and we have players
                 if table.state == "WAITING" and len(table.seats) >= 2:
                     table.start_hand()
                     resp = {"success": True}
                     should_broadcast = True
                     # Broadcast private hands? 
                     # We will handle that in the broadcast block

            elif action == "ADD_BOT":
                 resp = table.add_bot()
                 should_broadcast = True

            elif action == "REMOVE_BOT":
                 resp = table.remove_bot()
                 should_broadcast = True
            
            elif action == "ADD_FUNDS":
                 # Cheat: Add 10k to WALLET
                 async with async_session() as session:
                     await session.execute(text("UPDATE users SET balance = balance + 10000 WHERE id = :uid"), {"uid": user.id})
                     await session.commit()
                 
                 # Cheat: Add 10k to CHIPS (if seated)
                 found_seated = False
                 for p in table.seats.values():
                     if p.user_id == user.id:
                         p.chips += 10000
                         table.add_log(f"{p.name} added $10k chips.")
                         should_broadcast = True
                         found_seated = True
                         break
                 
                 resp = {"success": True, "message": "Funds added to wallet" + (" and chips" if found_seated else "")}
                 # Actually if they are seated, their chips on table don't change, only wallet balance outside.
                 # But if they rebuy, it matters.

            
            # Error handling
            if resp and resp.get("error"):
                 await websocket.send_json({"type": "ERROR", "message": resp["message"] if "message" in resp else resp["error"]})
                 continue
            
            # Broadcast State logic
            if should_broadcast:
                 # 1. Send Public State to everyone
                 public_state = table.to_dict() # This hides hands
                 await manager.broadcast(poker_scope, {
                     "type": "GAME_UPDATE", 
                     "state": public_state
                 })
                 
                 # 2. Update specific users with private info if needed (e.g. at start of hand)
                 for seat_num, player in table.seats.items():
                      if player.hand and not player.is_folded and not player.is_bot: # If they have cards
                          await manager.send_to_user(player.user_id, {
                              "type": "HAND_UPDATE",
                              "hand": [c.to_dict() for c in player.hand]
                          })
                
                 # 3. Check for Bot Turn
                 next_is_bot = resp.get("next_is_bot", False) if resp else False
                 
                 # Also check state directly just in case (e.g. after START)
                 if table.state != "WAITING" and table.current_player_seat in table.seats and table.seats[table.current_player_seat].is_bot:
                      next_is_bot = True

                 if next_is_bot:
                      asyncio.create_task(run_poker_bot_turn(table_id))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        # Handle disconnect (auto fold/leave logic could be here)
        # For now, just remove from websocket manager
    except Exception as e:
        print(f"Poker WS Error: {e}")
        manager.disconnect(websocket)

# Serve static files for uploads
uploads_path = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(uploads_path):
    os.makedirs(uploads_path)
app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

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

@app.post("/webhook/telegram")
async def telegram_webhook(update: dict):
    """Handle incoming Telegram updates."""
    try:
        if "message" in update:
            message = update["message"]
            text = message.get("text", "")
            chat_id = message.get("chat", {}).get("id")
            
            if text.startswith("/start") and chat_id:
                # Send welcome message
                import httpx
                
                bot_token = os.getenv("BOT_TOKEN")
                bot_username = os.getenv("BOT_USERNAME", "monopoly_haha_bot")
                app_name = os.getenv("TG_APP_NAME") or ""
                
                # Build correct Mini App URL
                if app_name:
                    web_app_url = f"https://t.me/{bot_username}/{app_name}"
                else:
                    web_app_url = f"https://t.me/{bot_username}"

                welcome_text = (
                    "👋 *Добро пожаловать в Монополию!*\n\n"
                    "Здесь ты сможешь:\n"
                    "🎩Играть с друзьями\n"
                    "🚀 Запускать 'Орешник'\n"
                    "🤝 Договариваться и предавать\n\n"
                    "Жми кнопку ниже, чтобы начать игру! 👇"
                )
                
                payload = {
                    "chat_id": chat_id,
                    "text": welcome_text,
                    "parse_mode": "Markdown",
                    "reply_markup": {
                        "inline_keyboard": [[
                            {"text": "🎮 ИГРАТЬ", "web_app": {"url": "https://realmonopoly-production.up.railway.app"}}
                        ]]
                    }
                }
                
                async with httpx.AsyncClient() as client:
                    await client.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json=payload)
                    
        return {"status": "ok"}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"status": "error"}

@app.get("/")
async def root_fallback():
    return {"status": "ok", "message": "API is running. Telegram Webhook Active."}


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
                    # Check if turn ended (auto-end after buy) and next is bot
                    await _check_and_run_bot_turn(game_id)
            
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
                    # Turn auto-ended after rent
                    await _check_and_run_bot_turn(game_id)

            elif action == "PAY_TAX":
                result = engine.pay_tax(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "TAX_PAID", **result})
                    # Turn auto-ended after tax
                    await _check_and_run_bot_turn(game_id)

            elif action == "PAY_BAIL":
                result = engine.pay_bail(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "BAIL_PAID", **result})
            
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

            elif action == "SELL_HOUSE":
                property_id = action_data.get("property_id")
                result = engine.sell_house(game_id, player_id, property_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "HOUSE_SOLD", **result})
            
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
            
            elif action == "CASINO_BET":
                bet_numbers = action_data.get("bet_numbers", [])
                result = engine.play_casino(game_id, player_id, bet_numbers)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "CASINO_RESULT", **result})
                    
                    if result.get("game_over"):
                         await manager.broadcast(game_id, {
                            "type": "GAME_OVER",
                            "game_state": result["game_state"]
                        })
                    else:
                        # Turn is already advanced by engine._maybe_end_turn or _handle_bankruptcy
                        # so we just need to notify users and check if NEXT player is bot
                        await manager.broadcast(game_id, {
                            "type": "TURN_ENDED", 
                            "game_state": result["game_state"],
                            "player_id": player_id
                        })
                        await _check_and_run_bot_turn(game_id)
            
            elif action == "SURRENDER":
                result = engine.surrender_player(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "PLAYER_SURRENDERED", **result})
                    
                    # Update stats for the player who surrendered (LOSS)
                    surrendered_p = game.players.get(player_id)
                    if surrendered_p and surrendered_p.user_id:
                        async with async_session() as session:
                            await db_service.increment_user_stats(session, surrendered_p.user_id, is_winner=False)
                    
                    if result.get("game_over"):
                         await manager.broadcast(game_id, {
                            "type": "GAME_OVER",
                            "game_state": result["game_state"]
                        })
                         
                         # Update stats for the winner
                         winner_id = result["game_state"].get("winner_id")
                         winner_p = game.players.get(winner_id)
                         if winner_p and winner_p.user_id:
                             async with async_session() as session:
                                 await db_service.increment_user_stats(session, winner_p.user_id, is_winner=True)
                    else:
                        await _check_and_run_bot_turn(game_id)
            
            elif action == "DECLINE_PROPERTY":
                result = engine.decline_property(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "AUCTION_STARTED", **result})
                    await _check_and_run_bot_turn(game_id)
            
            elif action == "RAISE_BID":
                result = engine.raise_bid(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "AUCTION_UPDATED", **result})
                    await _check_and_run_bot_turn(game_id)
            
            elif action == "PASS_AUCTION":
                result = engine.pass_auction(game_id, player_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    # Check if auction was resolved (winner determined or no bids)
                    if "winner" in result:
                        await manager.broadcast(game_id, {"type": "AUCTION_RESOLVED", **result})
                        await _check_and_run_bot_turn(game_id)
                    else:
                        await manager.broadcast(game_id, {"type": "AUCTION_UPDATED", **result})
                        await _check_and_run_bot_turn(game_id)
            
            elif action == "RESOLVE_AUCTION":
                result = engine.resolve_auction(game_id)
                if result.get("error"):
                    await websocket.send_json({"type": "ERROR", "message": result["error"]})
                else:
                    await manager.broadcast(game_id, {"type": "AUCTION_RESOLVED", **result})
                    
                    # Check if next player is bot after auction
                    await _check_and_run_bot_turn(game_id)
            
            
            elif action == "SYNC":
                await websocket.send_json({
                    "type": "SYNC_RESPONSE",
                    "game_state": jsonable_encoder(game)
                })

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



async def run_poker_bot_turn(table_id: str):
    """Execute bot turn loop for poker."""
    try:
        table = poker_engine["tables"].get(table_id)
        if not table: return

        # Loop in case multiple bots act in sequence
        while True:
            # Check if current player is bot
            if table.state == "WAITING" or table.state == "SHOWDOWN": 
                # Let timer loop handle restart or waiting
                break
            
            curr_seat = table.current_player_seat
            player = table.seats.get(curr_seat)
            
            if not player or not player.is_bot:
                break
                
            print(f"DEBUG: Poker Bot {player.name} turn.")
            await asyncio.sleep(1.0 + random.random()) # Delay for realism
            
            # Bot Logic
            action = "FOLD"
            
            # Simple Bot Strategy
            can_check = (player.current_bet == table.current_bet)
            
            # Randomness
            luck = random.random()
            
            if can_check:
                if luck > 0.1: action = "CHECK"
                else: action = "RAISE" # Bluiff
            else:
                 rank, score, _ = table.evaluate_hand(player.hand, table.community_cards)
                 # 0: High Card, 1: Pair...
                 to_call = table.current_bet - player.current_bet
                 pot_odds = to_call / (table.pot + to_call) if (table.pot + to_call) > 0 else 0
                 
                 if rank >= 1 or luck > 0.8: # Play any pair or bluff
                     if luck > 0.95 and table.min_raise < player.chips // 2:
                         action = "RAISE"
                         amount = table.current_bet + table.min_raise
                     else:
                         action = "CALL"
                 else:
                     # High Card
                     if to_call < (table.big_blind * 2): # Cheap
                         action = "CALL"
                     else:
                         action = "FOLD"
            
            if action == "RAISE":
                resp = table.handle_action(player.user_id, action, amount=table.current_bet + table.min_raise)
            else:
                resp = table.handle_action(player.user_id, action)
            
            if resp.get("error"):
                # Fallback
                print(f"Bot error: {resp.get('error')}")
                if can_check: table.handle_action(player.user_id, "CHECK")
                else: table.handle_action(player.user_id, "FOLD")
            
            # Broadcast
            poker_scope = f"poker_{table_id}"
            await manager.broadcast(poker_scope, {
                 "type": "GAME_UPDATE", 
                 "state": table.to_dict()
            })
            
            # Check if hand ended (SHOWDOWN) or Next is Human
            # If Showdown -> Next turn logic in handle_action returns next_is_bot=False usually (because no next player in Showdown)
            # We break loop, and let Timer loop restart hand.
            if table.state == "SHOWDOWN" or table.state == "WAITING":
                break
                
            # If next is bot, loop continues.
            # We check table.current_player_seat in next iteration.
            
    except Exception as e:
        print(f"Bot loop error: {e}")
        
async def _check_and_run_bot_turn(game_id: str):
    """Check if it's a bot's turn and run it with dice animation timing."""
    game = engine.games.get(game_id)
    if not game or game.game_status != "active":
        return
    
    
    # 1. Check Auction Turn
    if game.turn_state.get("auction_active"):
        eligible = game.turn_state.get("auction_eligible_players", [])
        idx = game.turn_state.get("auction_current_player_index", 0)
        
        if eligible and idx < len(eligible):
            current_id = eligible[idx]
            player = game.players.get(current_id)
            
            # Additional check: verify it really IS a bot
            if player and player.is_bot:
                print(f"DEBUG: Running bot AUCTION turn for {player.name}")
                await asyncio.sleep(1.0 + random.random()) # Delay for realism
                
                result = engine.run_bot_auction_decision(game_id, current_id)
                if result:
                    msg_type = "AUCTION_RESOLVED" if "winner" in result else "AUCTION_UPDATED"
                    await manager.broadcast(game_id, {"type": msg_type, **result})
                    
                    # Recursively check next (if auction still active or just ended and next is bot)
                    await _check_and_run_bot_turn(game_id)
        return

    # 2. Check Standard Turn
    current_id = game.player_order[game.current_turn_index]
    player = game.players.get(current_id)
    
    # DEBUG LOG
    if player:
         pass # print(f"DEBUG: Checking turn: {player.name} (Bot: {player.is_bot})")
    
    # CRITICAL FIX: Ensure we only run if it is explicitly a BOT
    if player and player.is_bot:
        print(f"DEBUG: Running bot turn for {player.name}")
        # Wait a bit for realism - increased pause
        await asyncio.sleep(2.0)
        
        # Step 1: Roll dice
        dice_result = engine.run_bot_turn(game_id)
        if dice_result:
            await manager.broadcast(game_id, dice_result)
            
            # If chance card drawn by bot, also send as a system chat message
            if dice_result.get("chance_card"):
                await manager.broadcast(game_id, {
                    "type": "CHAT_MESSAGE",
                    "player_id": "SYSTEM",
                    "player_name": "Breaking News",
                    "message": dice_result["chance_card"],
                    "game_state": game.dict()
                })
            
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
        
        # If chance card drawn, also send as a system chat message
        if result.get("chance_card"):
            await manager.broadcast(game_id, {
                "type": "CHAT_MESSAGE",
                "player_id": "SYSTEM",
                "player_name": "Breaking News",
                "message": result["chance_card"],
                "game_state": game.dict() # Re-verify 'game' exists here. Yes it does from line 512 context.
            })
            
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
    target_id: Union[int, str] = None,
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
