"""add_submission_teacher_comments

Revision ID: a8b7c6d5e4f3
Revises: 91c7b6879b9c
Create Date: 2026-06-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a8b7c6d5e4f3"
down_revision: Union[str, Sequence[str], None] = "91c7b6879b9c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("teacher_comment", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("teacher_comment_updated_at", sa.DateTime(), nullable=True))
    op.add_column("submissions", sa.Column("teacher_comment_seen_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("submissions", "teacher_comment_seen_at")
    op.drop_column("submissions", "teacher_comment_updated_at")
    op.drop_column("submissions", "teacher_comment")
