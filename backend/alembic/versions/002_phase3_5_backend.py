"""phase3_5_backend

Revision ID: 002
Revises: 001
Create Date: 2026-07-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table: str, column: str) -> bool:
    inspector = sa.inspect(bind)
    if table not in inspector.get_table_names():
        return False
    return column in {c["name"] for c in inspector.get_columns(table)}


def _has_table(bind, table: str) -> bool:
    return table in sa.inspect(bind).get_table_names()


def upgrade() -> None:
    bind = op.get_bind()

    # Column adds are guarded because migration 001 bootstraps the full schema
    # from the current SQLAlchemy metadata, so these columns may already exist.
    for name, col in (
        ("ctc", sa.Column("ctc", sa.String(length=100), nullable=True)),
        ("oa_date", sa.Column("oa_date", sa.Date(), nullable=True)),
        ("jd_url", sa.Column("jd_url", sa.String(length=512), nullable=True)),
        ("calendar_event_id", sa.Column("calendar_event_id", sa.String(length=255), nullable=True)),
    ):
        if not _has_column(bind, "opportunities", name):
            op.add_column("opportunities", col)

    question_type = sa.Enum("TECHNICAL", "HR", name="questiontype")
    question_difficulty = sa.Enum("EASY", "MEDIUM", "HARD", name="questiondifficulty")
    question_type.create(bind, checkfirst=True)
    question_difficulty.create(bind, checkfirst=True)

    if _has_table(bind, "questions"):
        return

    op.create_table(
        "questions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("type", question_type, nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("difficulty", question_difficulty, nullable=False),
        sa.Column("topic", sa.String(length=255), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_questions_company", "questions", ["company"], unique=False)
    op.create_index("ix_questions_topic", "questions", ["topic"], unique=False)
    op.create_index("ix_questions_type", "questions", ["type"], unique=False)

    op.create_table(
        "star_templates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("situation", sa.Text(), nullable=True),
        sa.Column("task", sa.Text(), nullable=True),
        sa.Column("action", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("is_curated", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "company_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("weights", sa.JSON(), nullable=False),
        sa.Column("round_structure", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_company_profiles_name", "company_profiles", ["name"], unique=True)

    op.create_table(
        "score_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("dsa_score", sa.Float(), nullable=False),
        sa.Column("cs_score", sa.Float(), nullable=False),
        sa.Column("projects_score", sa.Float(), nullable=False),
        sa.Column("interview_score", sa.Float(), nullable=False),
        sa.Column("resume_score", sa.Float(), nullable=False),
        sa.Column("opportunities_score", sa.Float(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_score_history_created_at", "score_history", ["created_at"], unique=False)
    op.create_index("ix_score_history_user_created_at", "score_history", ["user_id", "created_at"], unique=False)
    op.create_index("ix_score_history_user_id", "score_history", ["user_id"], unique=False)

    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token", sa.String(length=512), nullable=False),
        sa.Column("platform", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "token", name="uq_push_user_token"),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")

    op.drop_index("ix_score_history_user_id", table_name="score_history")
    op.drop_index("ix_score_history_user_created_at", table_name="score_history")
    op.drop_index("ix_score_history_created_at", table_name="score_history")
    op.drop_table("score_history")

    op.drop_index("ix_company_profiles_name", table_name="company_profiles")
    op.drop_table("company_profiles")
    op.drop_table("star_templates")

    op.drop_index("ix_questions_type", table_name="questions")
    op.drop_index("ix_questions_topic", table_name="questions")
    op.drop_index("ix_questions_company", table_name="questions")
    op.drop_table("questions")

    question_type = sa.Enum("TECHNICAL", "HR", name="questiontype")
    question_difficulty = sa.Enum("EASY", "MEDIUM", "HARD", name="questiondifficulty")
    question_type.drop(op.get_bind(), checkfirst=True)
    question_difficulty.drop(op.get_bind(), checkfirst=True)

    op.drop_column("opportunities", "calendar_event_id")
    op.drop_column("opportunities", "jd_url")
    op.drop_column("opportunities", "oa_date")
    op.drop_column("opportunities", "ctc")
