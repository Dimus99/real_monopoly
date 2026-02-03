"""
Pydantic models for Political Monopoly.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal, Any
from datetime import datetime


# ============== User Models ==============

class UserStats(BaseModel):
    """User game statistics."""
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    total_earnings: int = 0
    highest_net_worth: int = 0


class User(BaseModel):
    """User account model."""
    id: str
    name: str
    telegram_id: int
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    stats: UserStats = Field(default_factory=UserStats)
    
    # For searching users
    friend_code: Optional[str] = None  # 6-char unique code for adding friends


class UserPublic(BaseModel):
    """Public user info (for other players to see)."""
    id: str
    name: str
    avatar_url: Optional[str] = None
    stats: UserStats
    friend_code: Optional[str] = None
    is_online: bool = False


# ============== Friend Models ==============

class FriendRequest(BaseModel):
    """Friend request between users."""
    id: str
    from_user_id: str
    to_user_id: str
    status: Literal["pending", "accepted", "rejected"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FriendRequestCreate(BaseModel):
    """Request body for creating friend request."""
    to_user_id: Optional[str] = None
    friend_code: Optional[str] = None  # Alternative: add by friend code


class GameInvite(BaseModel):
    """Invite to join a game."""
    id: str
    game_id: str
    from_user_id: str
    to_user_id: str
    status: Literal["pending", "accepted", "declined", "expired"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GameInviteCreate(BaseModel):
    """Request body for creating game invite."""
    to_user_id: str


# ============== Game Models ==============

class Player(BaseModel):
    """In-game player state."""
    id: str
    user_id: Optional[str] = None  # Link to User account
    name: str
    character: Literal["Putin", "Trump", "Zelensky", "Kim", "Biden", "Xi", "Netanyahu", "BinLaden"]
    money: int = 1500
    position: int = 0  # 0-39
    properties: List[int] = Field(default_factory=list)
    is_jailed: bool = False
    jail_turns: int = 0
    color: str  # Hex code for UI
    avatar_url: Optional[str] = None
    is_bot: bool = False
    is_bankrupt: bool = False
    
    # Ability cooldowns

    ability_used_this_game: bool = False
    ability_cooldown: int = 0  # Turns until ability can be used again
    skipped_turns: int = 0  # For Biden's Sanctions


class Property(BaseModel):
    """Property tile on the board."""
    id: int  # 0-39 index on board
    name: str
    type: str = "property"  # property, transport, utility, service
    group: str  # Color group or Special (groupId)
    price: int
    rent: List[int] = Field(default_factory=list)  # Rent values
    action: Optional[str] = None  # For service tiles (e.g. collect_200)
    
    owner_id: Optional[str] = None
    houses: int = 0
    is_mortgaged: bool = False
    is_destroyed: bool = False  # Putin's Oreshnik effect
    is_monopoly: bool = False  # If part of a complete monopoly
    
    # Visual state
    destruction_turn: Optional[int] = None  # When it was destroyed
    isolation_turns: int = 0  # For Kim's Isolation
    mortgage_turn: Optional[int] = None  # When it was mortgaged (for 14-turn expiration)


class TileType(BaseModel):
    """Non-property tile types."""
    type: Literal["go", "jail", "free_parking", "go_to_jail", "chance", "community_chest", "tax"]
    effect_value: int = 0  # For tax tiles


class TradeOffer(BaseModel):
    """Trade offer between players."""
    id: str
    game_id: str
    from_player_id: str
    to_player_id: str
    
    # Offer details
    offer_money: int = 0
    offer_properties: List[int] = Field(default_factory=list)
    
    request_money: int = 0
    request_properties: List[int] = Field(default_factory=list)
    
    status: Literal["pending", "accepted", "rejected", "cancelled"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GameState(BaseModel):
    """Full game state."""
    game_id: str
    host_id: str  # Player ID of the host
    players: Dict[str, Player] = Field(default_factory=dict)
    player_order: List[str] = Field(default_factory=list)
    trades: Dict[str, TradeOffer] = Field(default_factory=dict)
    current_turn_index: int = 0
    board: List[Property] = Field(default_factory=list)
    pot: int = 0  # Free Parking pot
    dice: List[int] = Field(default_factory=lambda: [1, 1])
    doubles_count: int = 0  # For jail on 3 doubles
    game_status: Literal["waiting", "active", "finished"] = "waiting"
    winner_id: Optional[str] = None
    logs: List[str] = Field(default_factory=list)
    turn_number: int = 0
    
    # Settings
    map_type: str = "World"
    game_mode: Literal["classic", "abilities", "oreshnik_all"] = "abilities"
    starting_money: int = 1500
    max_players: int = 6
    turn_timer: int = 90  # Seconds per turn, 0 = infinity
    
    # Timestamps
    turn_expiry: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    
    # Per-turn dynamic state (reset on turn change)
    turn_state: Dict[str, Any] = Field(default_factory=dict)


# ============== Request/Response Models ==============

class CreateGameRequest(BaseModel):
    """Request to create a new game."""
    map_type: str = "World"
    game_mode: str = "abilities"
    starting_money: int = 1500
    max_players: int = 6
    turn_timer: int = 90


class JoinGameRequest(BaseModel):
    """Request to join a game."""
    character: Literal["Putin", "Trump", "Zelensky", "Kim", "Biden", "Xi", "Netanyahu", "BinLaden"]


class RollDiceResponse(BaseModel):
    """Response after rolling dice."""
    dice: List[int]
    player_position: int
    passed_go: bool = False
    landed_on: str
    action_required: Optional[str] = None  # "buy", "pay_rent", "chance", etc.
    amount: Optional[int] = None


class BuyPropertyRequest(BaseModel):
    """Request to buy a property."""
    property_id: int


class UseAbilityRequest(BaseModel):
    """Request to use character ability."""
    ability_type: str
    target_id: Optional[int] = None  # Property or player target


class GameActionResponse(BaseModel):
    """Generic response for game actions."""
    success: bool
    message: str
    game_state: Optional[dict] = None


# ============== Auth Models ==============




class TelegramAuthRequest(BaseModel):
    """Request for Telegram authentication (Mini App initData or Widget data)."""
    init_data: Optional[str] = None
    widget_data: Optional[Dict[str, Any]] = None


class AuthResponse(BaseModel):
    """Authentication response."""
    token: str
    user: User


class UpdateUserRequest(BaseModel):
    """Request to update user profile."""
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# ============== WebSocket Message Models ==============

class WSMessage(BaseModel):
    """WebSocket message base."""
    type: str
    data: Optional[dict] = None


class WSAction(BaseModel):
    """WebSocket action from client."""
    action: Literal["ROLL", "BUY", "END_TURN", "USE_ABILITY", "TRADE_OFFER", "MORTGAGE", "BUILD"]
    data: Optional[dict] = None
