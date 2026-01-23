"""Routes package for Political Monopoly API."""
from .users import router as users_router
from .friends import router as friends_router
from .games import router as games_router

__all__ = ["users_router", "friends_router", "games_router"]
