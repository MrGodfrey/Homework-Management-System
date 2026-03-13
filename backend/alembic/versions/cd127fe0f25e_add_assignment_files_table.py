"""add_assignment_files_table

Revision ID: cd127fe0f25e
Revises: 2fe5d1b1422d
Create Date: 2026-03-13 19:57:15.465380

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cd127fe0f25e'
down_revision: Union[str, Sequence[str], None] = '2fe5d1b1422d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'assignment_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assignment_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('cos_key', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assignment_id'], ['assignments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assignment_files_id'), 'assignment_files', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_assignment_files_id'), table_name='assignment_files')
    op.drop_table('assignment_files')
