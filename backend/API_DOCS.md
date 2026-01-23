# Political Monopoly - Backend API Documentation

## Base URL
- **Development**: `http://localhost:8000`
- **WebSocket**: `ws://localhost:8000`

---

## Authentication

### Anonymous Login (Dev Mode)
```http
POST /api/auth/anonymous
Content-Type: application/json

{
  "name": "PlayerName"
}
```

**Response:**
```json
{
  "token": "anon_abc123...",
  "user": {
    "id": "uuid",
    "name": "PlayerName",
    "friend_code": "ABC123",
    "stats": { "games_played": 0, "wins": 0, ... }
  }
}
```

### Telegram Login
```http
POST /api/auth/telegram
Content-Type: application/json

{
  "init_data": "query_id=...&user=...&hash=..."
}
```

### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

---

## Friend System

### Get Friends List
```http
GET /api/friends
Authorization: Bearer <token>
```

### Send Friend Request
```http
POST /api/friends/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "friend_code": "ABC123"
}
// OR
{
  "to_user_id": "user-uuid"
}
```

### Get Pending Requests
```http
GET /api/friends/requests
Authorization: Bearer <token>
```

### Accept/Reject Request
```http
POST /api/friends/requests/{request_id}/accept
POST /api/friends/requests/{request_id}/reject
Authorization: Bearer <token>
```

### Remove Friend
```http
DELETE /api/friends/{user_id}
Authorization: Bearer <token>
```

---

## Games

### Create Game
```http
POST /api/games
Authorization: Bearer <token>
Content-Type: application/json

{
  "map_type": "World",  // or "Ukraine"
  "starting_money": 1500,
  "max_players": 6
}
```

**Response:**
```json
{
  "game_id": "ABCD1234",
  "game_state": { ... }
}
```

### List Available Games
```http
GET /api/games?status=waiting
Authorization: Bearer <token>
```

### Get Game State
```http
GET /api/games/{game_id}
Authorization: Bearer <token>
```

### Get Available Characters
```http
GET /api/games/{game_id}/characters
Authorization: Bearer <token>
```

**Response:**
```json
{
  "characters": [
    { "name": "Putin", "available": true, "color": "#DC2626" },
    { "name": "Trump", "available": false, "color": "#F97316" },
    ...
  ]
}
```

### Join Game
```http
POST /api/games/{game_id}/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "character": "Putin"
}
```

### Leave Game
```http
POST /api/games/{game_id}/leave
Authorization: Bearer <token>
```

### Start Game (Host Only)
```http
POST /api/games/{game_id}/start
Authorization: Bearer <token>
```

### Add Bot
```http
POST /api/games/{game_id}/bots
Authorization: Bearer <token>
```

### Remove Bot
```http
DELETE /api/games/{game_id}/bots/{bot_id}
Authorization: Bearer <token>
```

### Invite Friend
```http
POST /api/games/{game_id}/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "to_user_id": "friend-uuid"
}
```

---

## Game Actions (REST)

### Roll Dice
```http
POST /api/games/{game_id}/roll
Authorization: Bearer <token>
```

### Buy Property
```http
POST /api/games/{game_id}/buy/{property_id}
Authorization: Bearer <token>
```

### Use Ability
```http
POST /api/games/{game_id}/ability?ability_type=ORESHNIK&target_id=15
Authorization: Bearer <token>
```

### End Turn
```http
POST /api/games/{game_id}/end-turn
Authorization: Bearer <token>
```

---

## WebSocket

### Connect
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/{game_id}?token={auth_token}');
```

### Send Actions
```javascript
// Roll dice
ws.send(JSON.stringify({ action: "ROLL" }));

// Buy property
ws.send(JSON.stringify({ action: "BUY", data: { property_id: 5 } }));

// Pay rent
ws.send(JSON.stringify({ action: "PAY_RENT", data: { property_id: 5 } }));

// End turn
ws.send(JSON.stringify({ action: "END_TURN" }));

// Use ability
ws.send(JSON.stringify({ 
  action: "USE_ABILITY", 
  data: { ability_type: "ORESHNIK", target_id: 15 } 
}));

// Chat
ws.send(JSON.stringify({ action: "CHAT", data: { message: "Hello!" } }));

// Ping (heartbeat)
ws.send(JSON.stringify({ action: "PING" }));
```

### Receive Events
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case "CONNECTED":
      // Initial game state
      break;
    case "PLAYER_JOINED":
      // New player joined
      break;
    case "PLAYER_LEFT":
      // Player left
      break;
    case "GAME_STARTED":
      // Game started
      break;
    case "DICE_ROLLED":
      // Dice rolled, includes: dice, landed_on, action, game_state
      break;
    case "PROPERTY_BOUGHT":
      // Property purchased
      break;
    case "RENT_PAID":
      // Rent paid
      break;
    case "TURN_ENDED":
      // Turn ended
      break;
    case "ABILITY_USED":
      // Special ability used
      break;
    case "BOT_TURN":
      // Bot completed its turn
      break;
    case "CHAT_MESSAGE":
      // Chat message
      break;
    case "ERROR":
      // Error message
      break;
  }
};
```

---

## Character Abilities

| Character | Ability | Description | Cooldown |
|-----------|---------|-------------|----------|
| Putin | ORESHNIK | Destroy any property (becomes ruins) | 5 turns |
| Trump | BUYOUT | Hostile takeover any owned property (150% price). Greenland 50% off | 4 turns |
| Zelensky | AID | Collect 10% cash from all opponents | 4 turns |
| Kim | ISOLATION | Block a property for 3 turns | 5 turns |
| Biden | SANCTIONS | Target opponent skips next turn | 4 turns |
| Xi | BELT_ROAD | Collect $50 per owned property | 4 turns |

---

## Game State Structure

```typescript
interface GameState {
  game_id: string;
  host_id: string;
  game_status: "waiting" | "active" | "finished";
  map_type: "World" | "Ukraine";
  
  players: Record<string, Player>;
  player_order: string[];
  current_turn_index: number;
  
  board: Property[];
  dice: [number, number];
  pot: number;
  turn_number: number;
  
  logs: string[];
  winner_id?: string;
}

interface Player {
  id: string;
  user_id?: string;
  name: string;
  character: "Putin" | "Trump" | "Zelensky" | "Kim" | "Biden" | "Xi";
  money: number;
  position: number;
  properties: number[];
  is_jailed: boolean;
  is_bot: boolean;
  is_bankrupt: boolean;
  ability_cooldown: number;
  color: string;
  avatar_url?: string;
}

interface Property {
  id: number;
  name: string;
  group: string;
  price: number;
  rent: number[];
  owner_id?: string;
  houses: number;
  is_mortgaged: boolean;
  is_destroyed: boolean;
}
```

---

## Error Responses

```json
{
  "detail": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not allowed)
- `404` - Not found
