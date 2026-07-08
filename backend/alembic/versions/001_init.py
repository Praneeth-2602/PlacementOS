"""init

Revision ID: 001
Revises:
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tables are created via metadata for initial bootstrap.
    # Run: alembic revision --autogenerate after model changes.
    from app.database import Base, engine
    from app.models import entities  # noqa: F401

    Base.metadata.create_all(bind=engine)


def downgrade() -> None:
    from app.database import Base, engine
    from app.models import entities  # noqa: F401

    Base.metadata.drop_all(bind=engine)
