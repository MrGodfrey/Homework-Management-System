import os
import zipfile
from datetime import timedelta
from io import BytesIO

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("ENV", "DEV")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from app.auth import hash_password
from app.database import Base, get_db
from app.dependencies import get_current_instructor, get_current_student
from app.main import app
from app.models import Assignment, Instructor, Student, Submission, SubmissionFile, beijing_now
from app.routers import admin as admin_router
from app.routers import student as student_router


@pytest.fixture()
def classroom_client(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    seed_db = TestingSessionLocal()
    instructor = Instructor(username="teacher", hashed_password=hash_password("teacher-pass"))
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
    seed_db.add_all([instructor, alice, bob])
    seed_db.commit()
    seed_db.refresh(instructor)
    seed_db.refresh(alice)
    seed_db.refresh(bob)
    seed_db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_current_instructor():
        db = TestingSessionLocal()
        try:
            return db.query(Instructor).filter(Instructor.username == "teacher").one()
        finally:
            db.close()

    def override_current_student():
        db = TestingSessionLocal()
        try:
            return db.query(Student).filter(Student.student_id == "20230001").one()
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_instructor] = override_current_instructor
    app.dependency_overrides[get_current_student] = override_current_student

    storage: dict[str, bytes] = {}

    def read_file_from_storage(cos_key: str) -> bytes:
        return storage[cos_key]

    def upload_file_to_storage(file_bytes: bytes, cos_key: str) -> str:
        storage[cos_key] = file_bytes
        return f"local://{cos_key}"

    monkeypatch.setattr(admin_router, "read_file_from_storage", read_file_from_storage)
    monkeypatch.setattr(student_router, "upload_file_to_cos", upload_file_to_storage)

    with TestClient(app) as client:
        yield client, TestingSessionLocal, storage

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def zip_entries(response):
    assert response.status_code == 200
    with zipfile.ZipFile(BytesIO(response.content)) as zf:
        return sorted(zf.namelist())


def create_assignment(db, title="Essay Draft", file_rules=".pdf,.md,.zip"):
    assignment = Assignment(
        title=title,
        description="Test assignment",
        deadline=beijing_now() + timedelta(days=7),
        allow_late=False,
        file_rules=file_rules,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def create_submission(db, storage, assignment, student_no, version, filename, body=b"content"):
    student = db.query(Student).filter(Student.student_id == student_no).one()
    submission = Submission(
        assignment_id=assignment.id,
        student_id=student.id,
        version_no=version,
        submitted_at=beijing_now(),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    cos_key = f"test/{assignment.id}/{student_no}/v{version}/{filename}"
    storage[cos_key] = body
    db.add(SubmissionFile(submission_id=submission.id, filename=filename, cos_key=cos_key))
    db.commit()
    return submission


def test_upload_limits_endpoint_exposes_configured_submission_limit(classroom_client):
    client, _SessionLocal, _storage = classroom_client

    response = client.get("/api/settings/upload-limits")

    assert response.status_code == 200
    assert response.json() == {
        "submission_max_bytes": 50 * 1024 * 1024,
        "submission_max_label": "50MB",
    }


def test_student_upload_rejects_oversized_submission_with_specific_message(classroom_client, monkeypatch):
    client, SessionLocal, _storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".zip")
        assignment_id = assignment.id
    finally:
        db.close()

    monkeypatch.setattr(student_router.settings, "MAX_SUBMISSION_UPLOAD_BYTES", 10)

    response = client.post(
        f"/api/assignments/{assignment_id}/submit",
        files=[("files", ("lab1.zip", b"01234567890", "application/zip"))],
    )

    assert response.status_code == 400
    assert "超过 10B 上限" in response.json()["detail"]
    assert "请压缩或分拆后重新上传" in response.json()["detail"]


def test_assignment_download_modes_include_all_submitted_students(classroom_client):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db)
        create_submission(db, storage, assignment, "20230001", 1, "alice-v1.pdf")
        create_submission(db, storage, assignment, "20230001", 2, "alice-v2.md")
        create_submission(db, storage, assignment, "20230002", 1, "bob-v1.md")
        assignment_id = assignment.id
    finally:
        db.close()

    latest_response = client.get(f"/api/admin/assignments/{assignment_id}/download?mode=latest")
    latest_entries = zip_entries(latest_response)
    assert latest_entries == [
        "20230001_Alice/alice-v2.md",
        "20230002_Bob/bob-v1.md",
    ]

    all_response = client.get(f"/api/admin/assignments/{assignment_id}/download?mode=all")
    all_entries = zip_entries(all_response)
    assert all_entries == [
        "20230001_Alice/v1/alice-v1.pdf",
        "20230001_Alice/v2/alice-v2.md",
        "20230002_Bob/v1/bob-v1.md",
    ]


def test_all_assignments_download_uses_assignment_student_version_folders(classroom_client):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        essay = create_assignment(db, title="Essay Draft")
        lab = create_assignment(db, title="Lab 1 / Zip")
        create_submission(db, storage, essay, "20230001", 1, "alice-v1.pdf")
        create_submission(db, storage, essay, "20230002", 1, "bob-v1.md")
        create_submission(db, storage, lab, "20230001", 1, "lab.zip")
    finally:
        db.close()

    response = client.get("/api/admin/assignments/download-all")
    entries = zip_entries(response)

    assert "HW1_Essay Draft/" in entries
    assert "HW1_Essay Draft/20230001_Alice/v1/" in entries
    assert "HW1_Essay Draft/20230001_Alice/v1/alice-v1.pdf" in entries
    assert "HW1_Essay Draft/20230002_Bob/v1/bob-v1.md" in entries
    assert "HW2_Lab 1 _ Zip/" in entries
    assert "HW2_Lab 1 _ Zip/20230001_Alice/v1/lab.zip" in entries
    assert "HW2_Lab 1 _ Zip/20230002_Bob/" in entries
