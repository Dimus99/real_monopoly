# PROJECT_PLAN.md - MonopolyX (Satire Edition)

## 1. Project Overview
**Goal**: Create a multiplayer, browser-based Monopoly-style game with a satirical political theme.
**Platform**: Web (React) & Telegram Mini App.
**Core Hook**: Players act as world leaders (Putin, Trump, Zelensky, etc.) on a board of real-world cities, using "Special Abilities" to disrupt opponents or gain advantages.

## 2. Architecture & Tech Stack
- **Frontend**: React (Vite), TailwindCSS, Framer Motion.
- **Backend**: Python FastAPI (Async), WebSockets for real-time state.
- **Infrastructure**: Docker & Docker Compose (Containerized Dev & Prod).
- **Database**: In-memory (Python accessible dicts) for MVP; SQLite/Postgres for persistence later.
- **Authentication**: 
    - **Dev/Browser**: Anonymous "Name-only" login (Auth stored in localStorage).
    - **Prod/Telegram**: Telegram Login Widget / WebApp InitData validation.

## 3. User Flow
1.  **Auth Screen**: User enters Name (if not logged in).
2.  **Lobby (Main Menu)**: 
    - "Create Game": Select Map (World/Ukraine), Leader (Putin/Trump/etc).
    - "Join Game": Enter 8-char Game ID.
3.  **Staging Room (Waiting)**:
    - Host can add Bots (Simple CPU).
    - Host can invite friends (Copy Code).
    - List of joined players shown.
    - "Start Game" button (Host only).
4.  **Game Board (Active)**:
    - Turn-based flow (Roll Dice -> Move -> Buy/Rent/Event).
    - Real-time animations (Rocket flyover, movement).
    - "Special Ability" button active when applicable.

## 4. Game Mechanics
### Characters & Abilities
- **Putin**: 
    - *Ability*: `ORESHNIK` - Launches a rocket animation. Target property (City) becomes "Destroyed" (Visual: Ruins/Fire). No rent can be collected, value becomes 0.
- **Trump**:
    - *Ability*: `BUYOUT` - Can buy any property even if owned (Hostile Takeover). Special discount on "Greenland".
- **Zelensky**:
    - *Ability*: `AID` - Collects small % of cash from all other players ("Aid Package").

### Maps
- **World**: Major capitals (Moscow, Washington, Beijing, etc.) + Greenland.
- **Ukraine**: Ukrainian cities (Kyiv, Lviv, Odesa, Kharkiv, etc.).
- **Topology**: Standard 40-tile loop.

### Bots
- Server-side logic (`run_bot_turn` in `game_engine.py`).
- Auto-roll, auto-buy logic.
- Random chance to trigger special abilities.

## 5. Directory Structure
```
/real_monopoly
├── docker-compose.yml   # Orchestration
├── PROJECT_PLAN.md      # THIS FILE
├── backend/
│   ├── Dockerfile
│   ├── main.py          # FastAPI routes & WebSocket endpoints
│   ├── game_engine.py   # Core logic (Move, Buy, Abilities)
│   ├── models.py        # Pydantic state models
│   └── socket_manager.py# Connection handling
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── pages/
    │   │   ├── Lobby.jsx    # Auth & Menu
    │   │   └── GameRoom.jsx # Staging & Board
    │   ├── components/
    │   │   ├── Board.jsx    # Grid visualization
    │   │   ├── Tile.jsx     # Individual Property
    │   │   └── OreshnikAnimation.jsx # VFX
    │   └── hooks/
    │       └── useGameSocket.js # WebSocket client
```

## 6. Development & Debugging
### Running the App
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

### Logging & Error Catching
**CRITICAL**: Monitor Docker logs for backend errors and WebSocket disconnects.
```bash
docker-compose logs -f backend
```
- If Frontend can't connect: Check `VITE_API_URL` or network tab (404/Connection Refused).
- If State desyncs: Check backend logs for `broadcast` errors.

## 7. Future Roadmap
- [ ] Implement Property Trading.
- [ ] Add "Chance" cards (Political Scandals, Sanctions).
- [ ] Persistent Leaderboard (Wins/Losses).
- [ ] Telegram Payment Integration (Stars).
