"""
Database base configuration for Political Monopoly.
Uses SQLAlchemy with async PostgreSQL connection.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:postgres@localhost:5432/monopoly"
)

# Railway uses postgres:// but asyncpg needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DEBUG", "false").lower() == "true",
    pool_pre_ping=True,
)

# Session factory
async_session = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency for getting async database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


from sqlalchemy import text

async def init_db():
    """Initialize database (create tables)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # After creating tables/types, ensure 'Mukhosransk' is in the 'maptype' enum
    # This is needed because Base.metadata.create_all doesn't update existing enums
    try:
        async with engine.connect() as conn:
            # ALTER TYPE ADD VALUE cannot run in a transaction block
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            
            # Check current values
            result = await conn.execute(text(
                "SELECT enumlabel FROM pg_enum "
                "JOIN pg_type ON pg_enum.enumtypid = pg_type.oid "
                "WHERE typname = 'maptype'"
            ))
            labels = [row[0] for row in result.all()]
            
            if 'Mukhosransk' not in labels:
                print("Adding 'Mukhosransk' to maptype enum...")
                await conn.execute(text("ALTER TYPE maptype ADD VALUE 'Mukhosransk'"))
                print("Added 'Mukhosransk' to maptype enum.")
    except Exception as e:
        # If it fails (e.g. type doesn't exist yet or permission denied), log and continue
        print(f"Notice: MapType enum migration skipped or failed: {e}")


async def close_db():
    """Close database connection."""
    await engine.dispose()
