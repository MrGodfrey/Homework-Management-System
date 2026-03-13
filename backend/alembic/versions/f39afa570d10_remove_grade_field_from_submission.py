"""remove_grade_field_from_submission

Revision ID: f39afa570d10
Revises: d91ca570b7d8
Create Date: 2026-03-13 18:43:19.090780

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f39afa570d10'
down_revision: Union[str, Sequence[str], None] = 'd91ca570b7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 删除 Submission 表的 grade 字段
    op.drop_column('submissions', 'grade')


def downgrade() -> None:
    """Downgrade schema."""
    # 恢复 grade 字段（如需回滚）
    op.add_column('submissions', sa.Column('grade', sa.String(), nullable=True))
