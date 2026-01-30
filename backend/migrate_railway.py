import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def migrate():
    url = os.getenv('DATABASE_URL')
    if not url:
        print("DATABASE_URL not found")
        return
        
    print(f"Original URL: {url}")
    # Replace asyncpg with sync driver for simple script
    url = url.replace('postgresql+asyncpg://', 'postgresql://')
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    
    print(f"Connecting to: {url}")
    engine = create_engine(url)
    
    with engine.connect() as conn:
        # Crucial for ALTER TYPE ADD VALUE
        conn.execution_options(isolation_level="AUTOCOMMIT")
        
        # Check current labels
        result = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'maptype'"))
        labels = [row[0] for row in result]
        print(f"Current maptype labels: {labels}")
        
        if 'Mukhosransk' not in labels:
            print("Adding 'Mukhosransk' to maptype...")
            conn.execute(text("ALTER TYPE maptype ADD VALUE 'Mukhosransk'"))
            print("Successfully added 'Mukhosransk'!")
        else:
            print("'Mukhosransk' already exists in enum.")

if __name__ == "__main__":
    migrate()
