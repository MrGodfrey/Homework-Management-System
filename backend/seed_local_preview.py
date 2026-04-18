#!/usr/bin/env python3
"""
Seed local preview data for DEV only.

Creates:
- a local admin account
- students from ../student.csv

This script is intentionally conservative:
- refuses to run in ENV=PROD unless --force is provided
- only inserts missing records by default
"""

from __future__ import annotations

import argparse
import csv
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
os.chdir(BACKEND_DIR)
sys.path.insert(0, str(BACKEND_DIR))

from app.auth import hash_password
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Instructor, Student

DEFAULT_ADMIN_USERNAME = "local_admin"
DEFAULT_ADMIN_PASSWORD = "LocalAdmin123!"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed local preview data.")
    parser.add_argument("--force", action="store_true", help="allow running outside ENV=DEV")
    parser.add_argument("--reset-admin-password", action="store_true", help="reset admin password if the admin already exists")
    parser.add_argument("--admin-username", default=DEFAULT_ADMIN_USERNAME)
    parser.add_argument("--admin-password", default=DEFAULT_ADMIN_PASSWORD)
    return parser.parse_args()


def ensure_safe_environment(force: bool) -> None:
    if settings.ENV == "DEV":
        return
    if force:
        return
    raise SystemExit(
        "Refusing to seed preview data because ENV is not DEV. "
        "Re-run with --force only if you know this is not production."
    )


def ensure_schema() -> None:
    Base.metadata.create_all(bind=engine)

    # Local bootstrap is ORM-first in this repo. Stamp Alembic head only when possible.
    try:
        subprocess.run(
            ["alembic", "stamp", "head"],
            cwd=BACKEND_DIR,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        # Preview seeding should still work even if Alembic is unavailable in PATH.
        pass


def seed_admin(db, username: str, password: str, reset_password: bool) -> tuple[Instructor, bool]:
    admin = db.query(Instructor).filter(Instructor.username == username).first()
    if admin:
        if reset_password:
            admin.hashed_password = hash_password(password)
            db.commit()
            db.refresh(admin)
            return admin, True
        return admin, False

    admin = Instructor(username=username, hashed_password=hash_password(password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin, True


def seed_students(db) -> int:
    student_csv = Path(__file__).resolve().parent.parent / "student.csv"
    if not student_csv.exists():
        raise SystemExit(f"Student CSV not found: {student_csv}")

    created = 0
    with student_csv.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            student_id = (row.get("student_id") or "").strip()
            name = (row.get("name") or "").strip()
            if not student_id or not name:
                continue

            existing = db.query(Student).filter(Student.student_id == student_id).first()
            if existing:
                if not existing.plain_password:
                    existing.plain_password = student_id
                    existing.hashed_password = hash_password(student_id)
                continue

            db.add(
                Student(
                    student_id=student_id,
                    name=name,
                    hashed_password=hash_password(student_id),
                    plain_password=student_id,
                )
            )
            created += 1

    db.commit()
    return created


def main() -> int:
    args = parse_args()
    ensure_safe_environment(args.force)
    ensure_schema()

    db = SessionLocal()
    try:
        admin, admin_changed = seed_admin(
            db,
            username=args.admin_username,
            password=args.admin_password,
            reset_password=args.reset_admin_password,
        )
        students_created = seed_students(db)

        print("Local preview data is ready.")
        print(f"ENV: {settings.ENV}")
        print(f"Database: {settings.DATABASE_URL}")
        print(f"Admin username: {admin.username}")
        print(f"Admin password: {args.admin_password}")
        if admin_changed:
            print("Admin action: created or password reset")
        else:
            print("Admin action: left unchanged")
        print(f"Students created this run: {students_created}")
        print("Student default password rule: password == student_id")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
