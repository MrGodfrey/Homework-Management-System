"""add_ai_grading_tables

Revision ID: 91c7b6879b9c
Revises: 6c9664356acb
Create Date: 2026-05-04 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "91c7b6879b9c"
down_revision: Union[str, Sequence[str], None] = "6c9664356acb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("assignments", sa.Column("ai_grading_rubric", sa.Text(), nullable=True))
    op.create_table(
        "ai_grading_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("trigger_type", sa.String(), nullable=False),
        sa.Column("triggered_by_instructor_id", sa.Integer(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.ForeignKeyConstraint(["triggered_by_instructor_id"], ["instructors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_grading_jobs_id"), "ai_grading_jobs", ["id"], unique=False)
    op.create_index(op.f("ix_ai_grading_jobs_job_id"), "ai_grading_jobs", ["job_id"], unique=True)

    op.create_table(
        "ai_grading_results",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("rubric_snapshot", sa.Text(), nullable=True),
        sa.Column("file_manifest_json", sa.Text(), nullable=True),
        sa.Column("extracted_summary", sa.Text(), nullable=True),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column("confidence", sa.String(), nullable=True),
        sa.Column("report_json", sa.Text(), nullable=True),
        sa.Column("report_text", sa.Text(), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("is_latest", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ai_grading_results_id"), "ai_grading_results", ["id"], unique=False)
    op.create_index(op.f("ix_ai_grading_results_job_id"), "ai_grading_results", ["job_id"], unique=False)
    op.create_index(op.f("ix_ai_grading_results_submission_id"), "ai_grading_results", ["submission_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_grading_results_submission_id"), table_name="ai_grading_results")
    op.drop_index(op.f("ix_ai_grading_results_job_id"), table_name="ai_grading_results")
    op.drop_index(op.f("ix_ai_grading_results_id"), table_name="ai_grading_results")
    op.drop_table("ai_grading_results")
    op.drop_index(op.f("ix_ai_grading_jobs_job_id"), table_name="ai_grading_jobs")
    op.drop_index(op.f("ix_ai_grading_jobs_id"), table_name="ai_grading_jobs")
    op.drop_table("ai_grading_jobs")
    op.drop_column("assignments", "ai_grading_rubric")
