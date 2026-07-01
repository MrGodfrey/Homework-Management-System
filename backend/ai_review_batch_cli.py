#!/usr/bin/env python3
"""Stream AI review batch progress from the command line.

Run from the server backend directory, for example:

    python ai_review_batch_cli.py --confirm-production-write

The script emits JSON Lines and flushes every event so SSH callers can see
progress while long model calls are running.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable, Iterable

BACKEND_DIR = Path(__file__).resolve().parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.cos_utils import read_file_from_storage
from app.database import SessionLocal
from app.models import Assignment, Instructor, Submission, beijing_now
from app.services.ai_grading import (
    VALID_BATCH_SCOPES,
    _is_fatal_batch_error,
    _select_batch_submissions,
    generate_ai_review,
    latest_result_for_submission,
)


EventWriter = Callable[[dict[str, Any]], None]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate AI reviews with streaming JSONL progress.")
    parser.add_argument(
        "--assignment-id",
        type=int,
        action="append",
        help="assignment id to process; repeat for multiple assignments; defaults to all assignments",
    )
    parser.add_argument(
        "--scope",
        choices=sorted(VALID_BATCH_SCOPES),
        default="latest_unreviewed_per_student",
        help="batch scope to process",
    )
    parser.add_argument(
        "--submission-id",
        type=int,
        action="append",
        help="submission id for --scope selected_submission_ids; repeat for multiple submissions",
    )
    parser.add_argument("--force", action="store_true", help="regenerate reviews even when a latest result already exists")
    parser.add_argument("--dry-run", action="store_true", help="only print the plan; do not call models or write DB rows")
    parser.add_argument(
        "--heartbeat-seconds",
        type=float,
        default=15.0,
        help="emit item_heartbeat while a model call is running; use 0 to disable",
    )
    parser.add_argument(
        "--trigger-type",
        default="cli_batch",
        help="trigger_type stored on generated AI grading jobs",
    )
    parser.add_argument(
        "--no-stop-on-fatal-provider-error",
        action="store_true",
        help="continue after fatal provider errors such as 401/402/403",
    )
    parser.add_argument(
        "--confirm-production-write",
        action="store_true",
        help="required when ENV=PROD and the command would write AI grading rows",
    )
    return parser.parse_args(argv)


def emit_jsonl(event: dict[str, Any]) -> None:
    print(json.dumps(event, ensure_ascii=False, default=str), flush=True)


def event_payload(event: str, **fields: Any) -> dict[str, Any]:
    return {
        "event": event,
        "time": beijing_now().isoformat(sep=" ", timespec="seconds"),
        **fields,
    }


def require_write_confirmation(args: argparse.Namespace) -> None:
    if args.dry_run:
        return
    if settings.ENV != "PROD":
        return
    if args.confirm_production_write:
        return
    raise SystemExit("Refusing to write in ENV=PROD without --confirm-production-write.")


def get_instructor(db) -> Instructor:
    instructor = db.query(Instructor).order_by(Instructor.id).first()
    if not instructor:
        raise SystemExit("No instructor found; cannot attribute AI grading jobs.")
    return instructor


def get_assignments(db, assignment_ids: Iterable[int] | None) -> list[Assignment]:
    query = db.query(Assignment).order_by(Assignment.id)
    requested_ids = list(assignment_ids or [])
    if requested_ids:
        query = query.filter(Assignment.id.in_(requested_ids))
    assignments = query.all()
    found_ids = {assignment.id for assignment in assignments}
    missing_ids = sorted(set(requested_ids) - found_ids)
    if missing_ids:
        raise SystemExit(f"Assignment not found: {missing_ids}")
    return assignments


def select_submissions(db, assignment_id: int, scope: str, selected_ids: list[int], force: bool) -> list[Submission]:
    if not force:
        if scope == "selected_submission_ids" and not selected_ids:
            return []
        return _select_batch_submissions(db, assignment_id, scope, selected_ids)

    query = (
        db.query(Submission)
        .filter(Submission.assignment_id == assignment_id)
        .order_by(Submission.student_id, Submission.version_no.desc(), Submission.id.desc())
    )
    if scope == "selected_submission_ids":
        if not selected_ids:
            return []
        return query.filter(Submission.id.in_(selected_ids)).all()
    submissions = query.all()
    if scope == "latest_unreviewed_per_student":
        latest_by_student: dict[int, Submission] = {}
        for submission in submissions:
            latest_by_student.setdefault(submission.student_id, submission)
        return list(latest_by_student.values())
    return submissions


def build_plan(db, args: argparse.Namespace) -> list[dict[str, Any]]:
    assignments = get_assignments(db, args.assignment_id)
    selected_ids = args.submission_id or []
    plan = []
    for assignment in assignments:
        submissions = select_submissions(db, assignment.id, args.scope, selected_ids, args.force)
        plan.append(
            {
                "assignment": assignment,
                "submissions": submissions,
                "pending": len(submissions),
            }
        )
    return plan


def run_with_heartbeat(
    callback: Callable[[], dict],
    heartbeat_seconds: float,
    heartbeat_fields: dict[str, Any],
    emit: EventWriter,
) -> dict:
    if heartbeat_seconds <= 0:
        return callback()

    started = time.monotonic()
    stop = threading.Event()

    def heartbeat() -> None:
        while not stop.wait(heartbeat_seconds):
            emit(
                event_payload(
                    "item_heartbeat",
                    elapsed_seconds=round(time.monotonic() - started, 1),
                    **heartbeat_fields,
                )
            )

    thread = threading.Thread(target=heartbeat, daemon=True)
    thread.start()
    try:
        return callback()
    finally:
        stop.set()
        thread.join(timeout=1)


def public_submission_fields(submission: Submission) -> dict[str, Any]:
    student = submission.student
    return {
        "submission_id": submission.id,
        "student_db_id": submission.student_id,
        "student_no": student.student_id if student else None,
        "student_name": student.name if student else None,
        "version_no": submission.version_no,
    }


def run_batch(args: argparse.Namespace, emit: EventWriter = emit_jsonl) -> dict[str, Any]:
    require_write_confirmation(args)
    db = SessionLocal()
    try:
        instructor = get_instructor(db)
        plan = build_plan(db, args)
        total_pending = sum(item["pending"] for item in plan)
        emit(
            event_payload(
                "plan",
                env=settings.ENV,
                database_url=settings.DATABASE_URL,
                instructor_id=instructor.id,
                scope=args.scope,
                force=args.force,
                dry_run=args.dry_run,
                total_pending=total_pending,
                assignments=[
                    {
                        "assignment_id": item["assignment"].id,
                        "title": item["assignment"].title,
                        "pending": item["pending"],
                    }
                    for item in plan
                ],
            )
        )
        if args.dry_run:
            complete = {"total": total_pending, "succeeded": 0, "failed": 0, "reused": 0, "aborted": False}
            emit(event_payload("complete", **complete))
            return complete

        total_done = 0
        summary = {"total": 0, "succeeded": 0, "failed": 0, "reused": 0, "aborted": False, "abort_reason": None}
        stop_on_fatal = not args.no_stop_on_fatal_provider_error

        for item in plan:
            assignment = item["assignment"]
            submissions = item["submissions"]
            if not submissions:
                continue
            assignment_counts = {"total": 0, "succeeded": 0, "failed": 0, "reused": 0}
            emit(
                event_payload(
                    "assignment_start",
                    assignment_id=assignment.id,
                    title=assignment.title,
                    pending=len(submissions),
                )
            )
            assignment_started = time.monotonic()

            for assignment_index, submission in enumerate(submissions, start=1):
                total_done += 1
                item_fields = {
                    "assignment_id": assignment.id,
                    "assignment_title": assignment.title,
                    "assignment_progress": f"{assignment_index}/{len(submissions)}",
                    "total_progress": f"{total_done}/{total_pending}",
                    **public_submission_fields(submission),
                }
                emit(event_payload("item_start", **item_fields))
                item_started = time.monotonic()

                def call_model() -> dict:
                    return generate_ai_review(
                        db=db,
                        submission_id=submission.id,
                        instructor_id=instructor.id,
                        file_reader=read_file_from_storage,
                        force=args.force,
                        trigger_type=args.trigger_type,
                    )

                result_item = run_with_heartbeat(call_model, args.heartbeat_seconds, item_fields, emit)
                result = result_item.get("result")
                job = result_item.get("job")
                reused = bool(result_item.get("reused"))
                status = "succeeded" if result else (job or {}).get("status", "unknown")
                error_message = (job or {}).get("error_message")

                assignment_counts["total"] += 1
                summary["total"] += 1
                if reused:
                    assignment_counts["reused"] += 1
                    summary["reused"] += 1
                    status = "reused"
                elif result:
                    assignment_counts["succeeded"] += 1
                    summary["succeeded"] += 1
                else:
                    assignment_counts["failed"] += 1
                    summary["failed"] += 1

                emit(
                    event_payload(
                        "item_done",
                        status=status,
                        reused=reused,
                        ai_score=(result or {}).get("ai_score"),
                        confidence=(result or {}).get("confidence"),
                        job_id=(job or {}).get("job_id") or (result or {}).get("job_id"),
                        error=error_message,
                        elapsed_seconds=round(time.monotonic() - item_started, 1),
                        **item_fields,
                    )
                )

                if stop_on_fatal and _is_fatal_batch_error(error_message):
                    summary["aborted"] = True
                    summary["abort_reason"] = error_message
                    emit(event_payload("abort", reason=error_message, **item_fields))
                    break

            emit(
                event_payload(
                    "assignment_done",
                    assignment_id=assignment.id,
                    title=assignment.title,
                    elapsed_seconds=round(time.monotonic() - assignment_started, 1),
                    **assignment_counts,
                )
            )
            if summary["aborted"]:
                break

        emit(event_payload("complete", **summary))
        return summary
    finally:
        db.close()


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    summary = run_batch(args)
    return 2 if summary.get("aborted") else 0


if __name__ == "__main__":
    raise SystemExit(main())
