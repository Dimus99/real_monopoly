"""Add Mukhosransk to maptype enum

Revision ID: 9bba77082ccb
Revises: efab268eb352
Create Date: 2026-01-30 21:31:33.260814

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9bba77082ccb'
down_revision: Union[str, Sequence[str], None] = 'efab268eb352'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ADD VALUE cannot run in a transaction block in PostgreSQL
    # So we commit the current transaction first
    op.execute("COMMIT")
    op.execute("ALTER TYPE maptype ADD VALUE 'Mukhosransk'")


def downgrade() -> None:
    """Downgrade schema."""
    # Enum values cannot be removed in PostgreSQL without recreating the whole type
    pass
