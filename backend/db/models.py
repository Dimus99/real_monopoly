"""
SQLAlchemy ORM models for Political Monopoly.
These map to PostgreSQL tables.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    String, Integer, BigInteger, Boolean, DateTime, Text, 
    ForeignKey, JSON, Enum, UniqueConstraint, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.base import Base
import enum


# ============== Enums ==============

class FriendRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class GameInviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class GameStatus(str, enum.Enum):
    WAITING = "waiting"
    ACTIVE = "active"
    FINISHED = "finished"


class MapType(str, enum.Enum):
    UKRAINE = "Ukraine"
    WORLD = "World"
    MUKHOSRANSK = "Mukhosransk"


class CharacterType(str, enum.Enum):
    PUTIN = "Putin"
    TRUMP = "Trump"
    ZELENSKY = "Zelensky"
    KIM = "Kim"
    BIDEN = "Biden"
    XI = "Xi"
    NETANYAHU = "Netanyahu"


# ============== User Model ==============

class UserDB(Base):
    """User account model."""
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False, index=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    friend_code: Mapped[Optional[str]] = mapped_column(String(10), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Stats (embedded JSON for simplicity, could be separate table)
    games_played: Mapped[int] = mapped_column(Integer, default=0)
    wins: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)
    total_earnings: Mapped[int] = mapped_column(Integer, default=0)
    highest_net_worth: Mapped[int] = mapped_column(Integer, default=0)
    
    # Currency
    balance: Mapped[int] = mapped_column(BigInteger, default=10000)
    
    # Relationships
    sent_friend_requests: Mapped[List["FriendRequestDB"]] = relationship(
        "FriendRequestDB",
        foreign_keys="FriendRequestDB.from_user_id",
        back_populates="from_user",
        cascade="all, delete-orphan"
    )
    received_friend_requests: Mapped[List["FriendRequestDB"]] = relationship(
        "FriendRequestDB",
        foreign_keys="FriendRequestDB.to_user_id",
        back_populates="to_user",
        cascade="all, delete-orphan"
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "telegram_id": self.telegram_id,
            "avatar_url": self.avatar_url,
            "friend_code": self.friend_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "stats": {
                "games_played": self.games_played,
                "wins": self.wins,
                "losses": self.losses,
                "total_earnings": self.total_earnings,
                "total_earnings": self.total_earnings,
                "highest_net_worth": self.highest_net_worth,
            },
            "balance": self.balance
        }


# ============== Friendship Models ==============

class FriendshipDB(Base):
    """Bidirectional friendship relationship."""
    __tablename__ = "friendships"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id_1: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_id_2: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        UniqueConstraint("user_id_1", "user_id_2", name="unique_friendship"),
        Index("ix_friendships_user1", "user_id_1"),
        Index("ix_friendships_user2", "user_id_2"),
    )


class FriendRequestDB(Base):
    """Friend request between users."""
    __tablename__ = "friend_requests"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    from_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    to_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[FriendRequestStatus] = mapped_column(
        Enum(FriendRequestStatus), 
        default=FriendRequestStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    from_user: Mapped["UserDB"] = relationship(
        "UserDB", 
        foreign_keys=[from_user_id],
        back_populates="sent_friend_requests"
    )
    to_user: Mapped["UserDB"] = relationship(
        "UserDB", 
        foreign_keys=[to_user_id],
        back_populates="received_friend_requests"
    )
    
    __table_args__ = (
        Index("ix_friend_requests_to_user", "to_user_id", "status"),
    )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "from_user_id": self.from_user_id,
            "to_user_id": self.to_user_id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============== Game Models ==============

class GameDB(Base):
    """Game instance stored in database."""
    __tablename__ = "games"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    host_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    map_type: Mapped[MapType] = mapped_column(Enum(MapType, name="maptype"), default=MapType.WORLD)
    starting_money: Mapped[int] = mapped_column(Integer, default=1500)
    max_players: Mapped[int] = mapped_column(Integer, default=6)
    status: Mapped[GameStatus] = mapped_column(Enum(GameStatus, name="gamestatus"), default=GameStatus.WAITING)
    winner_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    
    # Game state stored as JSON (full state for restoration)
    state_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    players: Mapped[List["GamePlayerDB"]] = relationship(
        "GamePlayerDB",
        back_populates="game",
        cascade="all, delete-orphan"
    )
    invites: Mapped[List["GameInviteDB"]] = relationship(
        "GameInviteDB",
        back_populates="game",
        cascade="all, delete-orphan"
    )
    
    __table_args__ = (
        Index("ix_games_status", "status"),
        Index("ix_games_host", "host_id"),
    )
    
    def to_dict(self) -> dict:
        return {
            "game_id": self.id,
            "host_id": self.host_id,
            "map_type": self.map_type.value,
            "starting_money": self.starting_money,
            "max_players": self.max_players,
            "game_status": self.status.value,
            "winner_id": self.winner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }


class GamePlayerDB(Base):
    """Player in a game (links User to Game)."""
    __tablename__ = "game_players"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    player_id: Mapped[str] = mapped_column(String(36), nullable=False)  # In-game player ID
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    character: Mapped[CharacterType] = mapped_column(Enum(CharacterType, name="charactertype"), nullable=False)
    color: Mapped[str] = mapped_column(String(10), nullable=False)
    is_bot: Mapped[bool] = mapped_column(Boolean, default=False)
    is_bankrupt: Mapped[bool] = mapped_column(Boolean, default=False)
    final_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1st, 2nd, etc.
    
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game: Mapped["GameDB"] = relationship("GameDB", back_populates="players")
    
    __table_args__ = (
        UniqueConstraint("game_id", "player_id", name="unique_game_player"),
        Index("ix_game_players_game", "game_id"),
        Index("ix_game_players_user", "user_id"),
    )


class GameInviteDB(Base):
    """Invite to join a game."""
    __tablename__ = "game_invites"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    game_id: Mapped[str] = mapped_column(String(36), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    from_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    to_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[GameInviteStatus] = mapped_column(
        Enum(GameInviteStatus), 
        default=GameInviteStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    game: Mapped["GameDB"] = relationship("GameDB", back_populates="invites")
    
    __table_args__ = (
        Index("ix_game_invites_to_user", "to_user_id", "status"),
    )
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "game_id": self.game_id,
            "from_user_id": self.from_user_id,
            "to_user_id": self.to_user_id,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ============== Session Model (for auth tokens) ==============

class SessionDB(Base):
    """User session for authentication."""
    __tablename__ = "sessions"
    
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    __table_args__ = (
        Index("ix_sessions_user", "user_id"),
    )
