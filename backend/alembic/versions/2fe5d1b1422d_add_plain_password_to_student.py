"""add_plain_password_to_student

Revision ID: 2fe5d1b1422d
Revises: f39afa570d10
Create Date: 2026-03-13 19:40:56.545102

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2fe5d1b1422d'
down_revision: Union[str, Sequence[str], None] = 'f39afa570d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 添加 plain_password 列（允许为空）
    op.add_column('students', sa.Column('plain_password', sa.String(), nullable=True))
    
    # 为现有学生设置默认密码为其学号
    op.execute("UPDATE students SET plain_password = student_id WHERE plain_password IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    # 删除 plain_password 列
    op.drop_column('students', 'plain_password')
