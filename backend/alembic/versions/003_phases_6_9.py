"""phases_6_9 backend

Adds Phase 7 (student depth), Phase 8 (institutional / multi-tenancy) and
Phase 9 (monetization + data platform) tables, plus onboarding/XP/org columns.

New tables are created from SQLAlchemy metadata (checkfirst) so this stays
SQLite-dev compatible and Postgres-ready. Column additions and the UserRole
enum extension are handled explicitly.

Revision ID: 003
Revises: 002
Create Date: 2026-07-30
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_NEW_TABLES = [
    "courses",
    "lessons",
    "lesson_progress",
    "coding_problems",
    "submissions",
    "discussion_threads",
    "posts",
    "votes",
    "mentor_profiles",
    "mentor_requests",
    "badges",
    "user_badges",
    "organizations",
    "memberships",
    "drives",
    "drive_rounds",
    "drive_applications",
    "plans",
    "subscriptions",
    "invoices",
    "events",
    "embedding_cache",
]


def _has_column(bind, table: str, column: str) -> bool:
    inspector = sa.inspect(bind)
    if table not in inspector.get_table_names():
        return False
    return column in {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()

    # Extend the UserRole enum on Postgres (SQLite stores it as VARCHAR).
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TPO'")
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ORG_ADMIN'")

    # New columns on existing tables (Phase 6 onboarding + Phase 7 XP + Phase 8 org scope).
    if not _has_column(bind, "profiles", "target_companies"):
        op.add_column("profiles", sa.Column("target_companies", sa.JSON(), nullable=True))
    if not _has_column(bind, "profiles", "xp"):
        op.add_column("profiles", sa.Column("xp", sa.Integer(), nullable=False, server_default="0"))
    if not _has_column(bind, "profiles", "onboarded_at"):
        op.add_column("profiles", sa.Column("onboarded_at", sa.DateTime(timezone=True), nullable=True))
    if not _has_column(bind, "readiness_scores", "org_id"):
        op.add_column("readiness_scores", sa.Column("org_id", sa.String(length=36), nullable=True))
        op.create_index("ix_readiness_scores_org_id", "readiness_scores", ["org_id"], unique=False)

    # New tables from metadata (idempotent via checkfirst).
    from app.database import Base
    from app.models import entities  # noqa: F401

    tables = [Base.metadata.tables[name] for name in _NEW_TABLES if name in Base.metadata.tables]
    Base.metadata.create_all(bind=bind, tables=tables, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    from app.database import Base

    tables = [Base.metadata.tables[name] for name in reversed(_NEW_TABLES) if name in Base.metadata.tables]
    Base.metadata.drop_all(bind=bind, tables=tables, checkfirst=True)

    if _has_column(bind, "readiness_scores", "org_id"):
        op.drop_index("ix_readiness_scores_org_id", table_name="readiness_scores")
        op.drop_column("readiness_scores", "org_id")
    for col in ("onboarded_at", "xp", "target_companies"):
        if _has_column(bind, "profiles", col):
            op.drop_column("profiles", col)
