import asyncio
import os
from sqlalchemy import text
from db.base import engine

async def update_enum():
    print("Updating 'maptype' enum...")
    async with engine.begin() as conn:
        try:
            # PostgreSQL command to add value to existing enum
            # We use execution_options(isolation_level="AUTOCOMMIT") because ALTER TYPE ADD VALUE cannot run in a transaction block
            # But conn.begin() starts a transaction... 
            # Let's use conn.execution_options(isolation_level="AUTOCOMMIT") or similar.
            pass
        except Exception as e:
            print(f"Error: {e}")

    # Alternative: use a raw connection from the engine
    try:
        async with engine.connect() as conn:
            await conn.execution_options(isolation_level="AUTOCOMMIT")
            # We check if it exists first to be safe
            result = await conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'maptype';"))
            labels = [row[0] for row in result]
            print(f"Current labels: {labels}")
            
            if 'Mukhosransk' not in labels:
                print("Adding 'Mukhosransk' to maptype enum...")
                await conn.execute(text("ALTER TYPE maptype ADD VALUE 'Mukhosransk'"))
                print("Successfully added 'Mukhosransk'!")
            else:
                print("'Mukhosransk' already exists in enum.")
                
            if 'Monopoly1' in labels:
                # We can't easily remove from enum in PG without recreating or complex steps, 
                # but adding is enough to fix the error.
                pass
    except Exception as e:
        print(f"Connection Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(update_enum())
