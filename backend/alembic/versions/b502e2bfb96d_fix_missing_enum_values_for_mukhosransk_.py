"""Fix missing enum values for Mukhosransk and Netanyahu

Revision ID: b502e2bfb96d
Revises: 9bba77082ccb
Create Date: 2026-01-30 23:29:54.919642

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b502e2bfb96d'
down_revision: Union[str, Sequence[str], None] = '9bba77082ccb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ADD VALUE cannot run in a transaction block in PostgreSQL
    op.execute("COMMIT")
    
    # Safely add MUKHOSRANSK to maptype
    try:
        op.execute("ALTER TYPE maptype ADD VALUE 'MUKHOSRANSK'")
    except Exception as e:
        print(f"Notice: Could not add MUKHOSRANSK to maptype: {e}")

    # Safely add Mukhosransk (lowercase value) just in case
    try:
        op.execute("ALTER TYPE maptype ADD VALUE 'Mukhosransk'")
    except Exception as e:
        pass

    # Safely add NETANYAHU to charactertype
    try:
        op.execute("ALTER TYPE charactertype ADD VALUE 'NETANYAHU'")
    except Exception as e:
        print(f"Notice: Could not add NETANYAHU to charactertype: {e}")
        
    try:
        op.execute("ALTER TYPE charactertype ADD VALUE 'Netanyahu'")
    except Exception as e:
        pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
