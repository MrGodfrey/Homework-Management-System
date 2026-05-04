#!/usr/bin/env python3
import sys
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.auth import hash_password
from app.cos_utils import upload_file_to_cos
from app.database import Base, SessionLocal, engine
from app.models import Assignment, AssignmentFile, AuditLog, Interaction, Instructor, Student, Submission, SubmissionFile, beijing_now
from app.config import settings


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    env_prefix = "dev_env" if settings.ENV == "DEV" else "prod_env"
    now = beijing_now()

    try:
        instructor = Instructor(
            username="teacher",
            hashed_password=hash_password("teacher-pass"),
        )
        alice = Student(
            student_id="20230001",
            name="Alice",
            hashed_password=hash_password("alice-pass"),
            plain_password="alice-pass",
        )
        bob = Student(
            student_id="20230002",
            name="Bob",
            hashed_password=hash_password("bob-pass"),
            plain_password="bob-pass",
        )
        db.add_all([instructor, alice, bob])
        db.commit()

        essay_assignment = Assignment(
            title="Essay Draft",
            description="Submit your draft and optional appendix.",
            deadline=now + timedelta(days=7),
            allow_late=False,
            file_rules=".pdf,.md",
            ai_grading_rubric="检查 Markdown 草稿是否说明主要观点、结构和证据，给出 0-100 的建议分。",
        )
        past_due_assignment = Assignment(
            title="Past Due Quiz",
            description="This assignment should reject late uploads.",
            deadline=now - timedelta(days=1),
            allow_late=False,
            file_rules=".txt",
        )
        db.add_all([essay_assignment, past_due_assignment])
        db.commit()
        db.refresh(essay_assignment)
        db.refresh(past_due_assignment)

        attachment_key = f"assignments/{essay_assignment.id}/attachments/essay-guide.txt"
        upload_file_to_cos(b"Essay draft checklist for the regression suite.\n", attachment_key)
        attachment = AssignmentFile(
            assignment_id=essay_assignment.id,
            filename="essay-guide.txt",
            cos_key=attachment_key,
        )
        db.add(attachment)
        db.commit()

        seeded_submission = Submission(
            assignment_id=essay_assignment.id,
            student_id=alice.id,
            version_no=1,
            submitted_at=now - timedelta(days=1),
            score=88.0,
            is_graded=True,
        )
        db.add(seeded_submission)
        db.commit()
        db.refresh(seeded_submission)

        submission_key = (
            f"{env_prefix}/submissions/{essay_assignment.id}/{alice.student_id}/"
            "seeded_v1_essay-v1.pdf"
        )
        upload_file_to_cos(b"%PDF-1.4\nSeeded essay v1\n", submission_key)
        seeded_file = SubmissionFile(
            submission_id=seeded_submission.id,
            filename="essay-v1.pdf",
            cos_key=submission_key,
        )
        interaction = Interaction(
            student_id=alice.id,
            note="Asked a thoughtful question",
        )
        audit_log = AuditLog(
            user_type="student",
            user_id=alice.id,
            action="seed_submission",
            details="Seeded graded submission for end-to-end regression tests",
        )
        db.add_all([seeded_file, interaction, audit_log])
        db.commit()

        bob_submission = Submission(
            assignment_id=essay_assignment.id,
            student_id=bob.id,
            version_no=1,
            submitted_at=now - timedelta(hours=10),
            is_graded=False,
        )
        db.add(bob_submission)
        db.commit()
        db.refresh(bob_submission)

        bob_submission_key = (
            f"{env_prefix}/submissions/{essay_assignment.id}/{bob.student_id}/"
            "seeded_v1_bob-notes.md"
        )
        upload_file_to_cos(b"# Bob notes\n\nSeeded submission for export coverage.\n", bob_submission_key)
        db.add(
            SubmissionFile(
                submission_id=bob_submission.id,
                filename="bob-notes.md",
                cos_key=bob_submission_key,
            )
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
