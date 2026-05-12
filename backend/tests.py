import json
import logging
import os
import time
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
from app.models import AIGradingJob, AIGradingResult, Assignment, Instructor, Student, Submission, SubmissionFile, beijing_now
from app.routers import admin as admin_router
from app.routers import student as student_router
from app.services import llm_client


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
    monkeypatch.setattr(student_router, "generate_presigned_url", lambda cos_key, expires=3600: f"local://{cos_key}")

    with TestClient(app) as client:
        yield client, TestingSessionLocal, storage

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def zip_entries(response):
    assert response.status_code == 200
    with zipfile.ZipFile(BytesIO(response.content)) as zf:
        return sorted(zf.namelist())


def wait_for_export_job(client, job_id):
    for _ in range(50):
        response = client.get(f"/api/admin/assignments/download-all/jobs/{job_id}")
        assert response.status_code == 200
        payload = response.json()
        if payload["status"] in {"complete", "failed"}:
            return payload
        time.sleep(0.02)
    raise AssertionError("export job did not finish")


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


def test_request_logging_includes_request_context(classroom_client, caplog):
    client, _SessionLocal, _storage = classroom_client

    caplog.set_level(logging.INFO, logger="app.request")
    response = client.get(
        "/api/settings/upload-limits",
        headers={"X-Request-ID": "test-request-id"},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "test-request-id"

    records = [
        record
        for record in caplog.records
        if record.name == "app.request" and record.getMessage() == "request_completed"
    ]
    assert records
    record = records[-1]
    assert record.request_id == "test-request-id"
    assert record.method == "GET"
    assert record.path == "/api/settings/upload-limits"
    assert record.status_code == 200
    assert record.duration_ms >= 0


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
        assignment = create_assignment(db, file_rules=".txt")
        assignment_id = assignment.id
    finally:
        db.close()

    monkeypatch.setattr(student_router.settings, "MAX_SUBMISSION_UPLOAD_BYTES", 10)

    response = client.post(
        f"/api/assignments/{assignment_id}/submit",
        files=[("files", ("lab1.txt", b"01234567890", "text/plain"))],
    )

    assert response.status_code == 400
    assert "超过 10B 上限" in response.json()["detail"]
    assert "请压缩或分拆后重新上传" in response.json()["detail"]


def test_student_upload_rejects_compressed_archives_without_ai_side_effects(classroom_client):
    client, SessionLocal, _storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".zip,.md")
        assignment_id = assignment.id
    finally:
        db.close()

    response = client.post(
        f"/api/assignments/{assignment_id}/submit",
        files=[("files", ("archive.zip", b"zip bytes", "application/zip"))],
    )

    assert response.status_code == 400
    assert "不允许上传压缩包文件" in response.json()["detail"]

    db = SessionLocal()
    try:
        assert db.query(Submission).filter(Submission.assignment_id == assignment_id).count() == 0
        assert db.query(AIGradingJob).count() == 0
    finally:
        db.close()


def test_student_can_upload_notebook_without_ai_side_effects(classroom_client):
    client, SessionLocal, _storage = classroom_client
    notebook = {
        "cells": [
            {"cell_type": "markdown", "source": ["# Report\n"]},
            {"cell_type": "code", "source": ["print('ok')\n"], "outputs": []},
        ]
    }
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".ipynb")
        assignment_id = assignment.id
    finally:
        db.close()

    response = client.post(
        f"/api/assignments/{assignment_id}/submit",
        files=[("files", ("analysis.ipynb", json.dumps(notebook).encode("utf-8"), "application/x-ipynb+json"))],
    )

    assert response.status_code == 200
    assert response.json()["version_no"] == 1
    db = SessionLocal()
    try:
        submission = db.query(Submission).filter(Submission.assignment_id == assignment_id).one()
        assert submission.files[0].filename == "analysis.ipynb"
        assert db.query(AIGradingJob).count() == 0
    finally:
        db.close()


def test_admin_ai_settings_are_admin_only_and_student_payloads_hide_them(classroom_client):
    client, SessionLocal, _storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".md")
        assignment_id = assignment.id
    finally:
        db.close()

    update_response = client.put(
        f"/api/admin/assignments/{assignment_id}/ai-settings",
        json={"ai_grading_rubric": "按 README 完整度和分析质量给出建议分。"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["ai_grading_rubric"] == "按 README 完整度和分析质量给出建议分。"

    admin_list_response = client.get("/api/admin/assignments")
    assert admin_list_response.status_code == 200
    admin_assignment = next(item for item in admin_list_response.json() if item["id"] == assignment_id)
    assert admin_assignment["ai_grading_rubric"] == "按 README 完整度和分析质量给出建议分。"

    student_detail_response = client.get(f"/api/assignments/{assignment_id}")
    assert student_detail_response.status_code == 200
    assert "ai_grading_rubric" not in student_detail_response.json()

    student_list_response = client.get("/api/assignments")
    assert student_list_response.status_code == 200
    assert "ai_grading" not in json.dumps(student_list_response.json(), ensure_ascii=False)


def test_student_submission_does_not_create_ai_job_or_call_model(classroom_client, monkeypatch):
    client, SessionLocal, _storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".md")
        assignment_id = assignment.id
    finally:
        db.close()

    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("student submission must not call the model")

    monkeypatch.setattr(llm_client, "create_chat_completion", fail_if_called)
    response = client.post(
        f"/api/assignments/{assignment_id}/submit",
        files=[("files", ("answer.md", b"# Answer\n", "text/markdown"))],
    )

    assert response.status_code == 200
    db = SessionLocal()
    try:
        assert db.query(AIGradingJob).count() == 0
        assert db.query(AIGradingResult).count() == 0
    finally:
        db.close()


def test_ai_review_binds_to_submission_version_and_does_not_write_final_score(classroom_client, monkeypatch):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".md")
        assignment.ai_grading_rubric = "建议分 0-100，只做教师参考。"
        db.commit()
        v1 = create_submission(db, storage, assignment, "20230001", 1, "answer-v1.md", b"# V1\n")
        v2 = create_submission(db, storage, assignment, "20230001", 2, "answer-v2.md", b"# V2\n")
        v1_id = v1.id
        v2_id = v2.id
        assignment_id = assignment.id
    finally:
        db.close()

    def fake_completion(**_kwargs):
        return {
            "content": json.dumps({
                "score": 91,
                "confidence": "medium",
                "summary": "版本绑定测试。",
                "rubric_alignment": [],
                "missing_or_weak_items": [],
                "teacher_notes": "不会自动保存最终分。",
                "evidence": [],
                "flags": [],
            }, ensure_ascii=False),
            "prompt_tokens": 10,
            "completion_tokens": 8,
        }

    monkeypatch.setattr(llm_client, "create_chat_completion", fake_completion)

    v1_response = client.post(f"/api/admin/submissions/{v1_id}/ai-review", json={"force": False})
    v2_response = client.post(f"/api/admin/submissions/{v2_id}/ai-review", json={"force": False})

    assert v1_response.status_code == 200
    assert v2_response.status_code == 200
    assert v1_response.json()["result"]["submission_id"] == v1_id
    assert v1_response.json()["result"]["version_no"] == 1
    assert v2_response.json()["result"]["submission_id"] == v2_id
    assert v2_response.json()["result"]["version_no"] == 2

    db = SessionLocal()
    try:
        sub_v1 = db.query(Submission).filter(Submission.id == v1_id).one()
        sub_v2 = db.query(Submission).filter(Submission.id == v2_id).one()
        assert sub_v1.score is None
        assert sub_v1.is_graded is False
        assert sub_v2.score is None
        assert sub_v2.is_graded is False
    finally:
        db.close()

    submissions_response = client.get(f"/api/admin/assignments/{assignment_id}/submissions")
    assert submissions_response.status_code == 200
    by_id = {item["id"]: item for item in submissions_response.json()}
    assert by_id[v1_id]["ai_review_status"] == "succeeded"
    assert by_id[v2_id]["ai_score"] == 91

    student_list_response = client.get("/api/assignments")
    student_history_response = client.get(f"/api/assignments/{assignment_id}/submissions")
    assert "ai_review" not in json.dumps(student_list_response.json(), ensure_ascii=False)
    assert "ai_score" not in json.dumps(student_history_response.json(), ensure_ascii=False)


def test_ai_review_force_regenerates_latest_without_overwriting_history(classroom_client, monkeypatch):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".md")
        submission = create_submission(db, storage, assignment, "20230001", 1, "answer.md", b"# Answer\n")
        submission_id = submission.id
    finally:
        db.close()

    scores = iter([80, 88])

    def fake_completion(**_kwargs):
        score = next(scores)
        return {
            "content": json.dumps({
                "score": score,
                "confidence": "medium",
                "summary": "重新生成测试。",
                "rubric_alignment": [],
                "missing_or_weak_items": [],
                "teacher_notes": "latest should move.",
                "evidence": [],
                "flags": [],
            }, ensure_ascii=False),
            "prompt_tokens": 10,
            "completion_tokens": 8,
        }

    monkeypatch.setattr(llm_client, "create_chat_completion", fake_completion)

    first_response = client.post(f"/api/admin/submissions/{submission_id}/ai-review", json={"force": False})
    second_response = client.post(f"/api/admin/submissions/{submission_id}/ai-review", json={"force": True})

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert first_response.json()["result"]["ai_score"] == 80
    assert second_response.json()["result"]["ai_score"] == 88

    db = SessionLocal()
    try:
        results = db.query(AIGradingResult).filter(AIGradingResult.submission_id == submission_id).order_by(AIGradingResult.id).all()
        assert len(results) == 2
        assert results[0].is_latest is False
        assert results[1].is_latest is True
    finally:
        db.close()


def test_batch_ai_review_processes_latest_unreviewed_versions_only(classroom_client, monkeypatch):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".md")
        alice_v1 = create_submission(db, storage, assignment, "20230001", 1, "alice-v1.md", b"# Alice v1\n")
        alice_v2 = create_submission(db, storage, assignment, "20230001", 2, "alice-v2.md", b"# Alice v2\n")
        bob_v1 = create_submission(db, storage, assignment, "20230002", 1, "bob-v1.md", b"# Bob v1\n")
        db.add(AIGradingResult(
            submission_id=alice_v2.id,
            job_id="existing-alice-v2",
            assignment_id=assignment.id,
            student_id=alice_v2.student_id,
            version_no=alice_v2.version_no,
            model="deepseek-v4-flash",
            ai_score=90,
            confidence="medium",
            report_text="已有最新版初评",
            created_at=beijing_now(),
            is_latest=True,
        ))
        db.commit()
        assignment_id = assignment.id
        alice_v1_id = alice_v1.id
        alice_v2_id = alice_v2.id
        bob_v1_id = bob_v1.id
    finally:
        db.close()

    def fake_completion(**_kwargs):
        return {
            "content": json.dumps({
                "score": 77,
                "confidence": "medium",
                "summary": "批量生成测试。",
                "rubric_alignment": [],
                "missing_or_weak_items": [],
                "teacher_notes": "manual batch only.",
                "evidence": [],
                "flags": [],
            }, ensure_ascii=False),
            "prompt_tokens": 10,
            "completion_tokens": 8,
        }

    monkeypatch.setattr(llm_client, "create_chat_completion", fake_completion)
    response = client.post(
        f"/api/admin/assignments/{assignment_id}/ai-review-jobs",
        json={"scope": "latest_unreviewed_per_student"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["succeeded"] == 1
    processed_submission_ids = {item["submission_id"] for item in payload["items"]}
    assert processed_submission_ids == {bob_v1_id}
    assert alice_v1_id not in processed_submission_ids
    assert alice_v2_id not in processed_submission_ids

    db = SessionLocal()
    try:
        assert db.query(AIGradingResult).filter(AIGradingResult.submission_id == alice_v1_id).count() == 0
        assert db.query(AIGradingResult).filter(AIGradingResult.submission_id == alice_v2_id).one().report_text == "已有最新版初评"
        assert db.query(AIGradingResult).filter(AIGradingResult.submission_id == bob_v1_id).one().version_no == 1
    finally:
        db.close()


def test_ai_review_skips_historical_archives_and_fails_without_text(classroom_client, monkeypatch):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".zip")
        submission = create_submission(db, storage, assignment, "20230001", 1, "archive.zip", b"ZIP_SECRET")
        submission_id = submission.id
    finally:
        db.close()

    def fail_if_called(*_args, **_kwargs):
        raise AssertionError("zip-only AI review must not call the model")

    monkeypatch.setattr(llm_client, "create_chat_completion", fail_if_called)
    response = client.post(f"/api/admin/submissions/{submission_id}/ai-review", json={"force": False})

    assert response.status_code == 200
    payload = response.json()
    assert payload["job"]["status"] == "failed"
    assert "无可评阅文本文件" in payload["job"]["error_message"]
    assert payload["result"] is None

    db = SessionLocal()
    try:
        assert db.query(AIGradingResult).filter(AIGradingResult.submission_id == submission_id).count() == 0
    finally:
        db.close()


def test_ai_review_notebook_extraction_ignores_outputs_attachments_and_base64(classroom_client, monkeypatch):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".ipynb")
        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "source": ["# Visible Markdown\n"],
                    "attachments": {
                        "image.png": {"image/png": "ATTACHMENT_SECRET_BASE64"}
                    },
                },
                {
                    "cell_type": "code",
                    "source": ["print('visible code')\n"],
                    "outputs": [
                        {"output_type": "stream", "text": "OUTPUT_SECRET"},
                        {"output_type": "display_data", "data": {"image/png": "IMAGE_SECRET_BASE64"}},
                    ],
                },
            ]
        }
        submission = create_submission(
            db,
            storage,
            assignment,
            "20230001",
            1,
            "analysis.ipynb",
            json.dumps(notebook).encode("utf-8"),
        )
        submission_id = submission.id
    finally:
        db.close()

    captured = {}

    def fake_completion(**kwargs):
        captured["prompt"] = "\n".join(item["content"] for item in kwargs["messages"])
        return {
            "content": json.dumps({
                "score": 84,
                "confidence": "medium",
                "summary": "Notebook extraction test.",
                "rubric_alignment": [],
                "missing_or_weak_items": [],
                "teacher_notes": "outputs ignored.",
                "evidence": [],
                "flags": [],
            }, ensure_ascii=False),
            "prompt_tokens": 10,
            "completion_tokens": 8,
        }

    monkeypatch.setattr(llm_client, "create_chat_completion", fake_completion)
    response = client.post(f"/api/admin/submissions/{submission_id}/ai-review", json={"force": False})

    assert response.status_code == 200
    prompt = captured["prompt"]
    assert "Visible Markdown" in prompt
    assert "visible code" in prompt
    assert "OUTPUT_SECRET" not in prompt
    assert "ATTACHMENT_SECRET_BASE64" not in prompt
    assert "IMAGE_SECRET_BASE64" not in prompt

    result = response.json()["result"]
    manifest = result["file_manifest"][0]
    assert manifest["type"] == "notebook"
    assert manifest["source_mode"] == "markdown_and_code_cells"
    assert manifest["outputs_ignored"] == 2
    assert manifest["image_outputs_ignored"] == 1
    assert manifest["attachments_ignored"] == 1


def test_ai_review_notebook_marker_cells_only_when_present(classroom_client, monkeypatch):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        assignment = create_assignment(db, file_rules=".ipynb")
        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "source": ["# Assignment prompt\n", "MARKDOWN_PROMPT_SECRET\n"],
                    "attachments": {
                        "prompt.png": {"image/png": "ATTACHMENT_SECRET_BASE64"}
                    },
                },
                {
                    "cell_type": "code",
                    "source": ["SETUP_SECRET = 'do not send this unmarked code cell'\n"],
                    "outputs": [{"output_type": "stream", "text": "SETUP_OUTPUT_SECRET"}],
                },
                {
                    "cell_type": "code",
                    "source": [
                        "# GRADED FUNCTION: solve_one\n",
                        "def solve_one():\n",
                        "    ### START CODE HERE ###\n",
                        "    answer_one = 42\n",
                        "    ### END CODE HERE ###\n",
                        "    return answer_one\n",
                    ],
                },
                {
                    "cell_type": "code",
                    "source": [
                        "# GRADED FUNCTION: solve_two\n",
                        "def solve_two(use_first):\n",
                        "    if use_first:\n",
                        "        ### START CODE HERE ###\n",
                        "        answer_two = 'first branch'\n",
                        "        ### END CODE HERE ###\n",
                        "    else:\n",
                        "        ### START CODE HERE ###\n",
                        "        answer_two = 'second branch'\n",
                        "        ### END CODE HERE ###\n",
                        "    return answer_two\n",
                    ],
                    "outputs": [
                        {"output_type": "display_data", "data": {"image/png": "IMAGE_SECRET_BASE64"}},
                    ],
                },
            ]
        }
        submission = create_submission(
            db,
            storage,
            assignment,
            "20230001",
            1,
            "analysis.ipynb",
            json.dumps(notebook).encode("utf-8"),
        )
        submission_id = submission.id
    finally:
        db.close()

    captured = {}

    def fake_completion(**kwargs):
        captured["prompt"] = "\n".join(item["content"] for item in kwargs["messages"])
        return {
            "content": json.dumps({
                "score": 86,
                "confidence": "medium",
                "summary": "Notebook marker extraction test.",
                "rubric_alignment": [],
                "missing_or_weak_items": [],
                "teacher_notes": "marker cells only.",
                "evidence": [],
                "flags": [],
            }, ensure_ascii=False),
            "prompt_tokens": 12,
            "completion_tokens": 9,
        }

    monkeypatch.setattr(llm_client, "create_chat_completion", fake_completion)
    response = client.post(f"/api/admin/submissions/{submission_id}/ai-review", json={"force": False})

    assert response.status_code == 200
    prompt = captured["prompt"]
    assert "GRADED FUNCTION: solve_one" in prompt
    assert "answer_one = 42" in prompt
    assert "GRADED FUNCTION: solve_two" in prompt
    assert "answer_two = 'first branch'" in prompt
    assert "answer_two = 'second branch'" in prompt
    assert "MARKDOWN_PROMPT_SECRET" not in prompt
    assert "SETUP_SECRET" not in prompt
    assert "SETUP_OUTPUT_SECRET" not in prompt
    assert "ATTACHMENT_SECRET_BASE64" not in prompt
    assert "IMAGE_SECRET_BASE64" not in prompt

    result = response.json()["result"]
    manifest = result["file_manifest"][0]
    assert manifest["type"] == "notebook"
    assert manifest["source_mode"] == "marked_code_cells"
    assert manifest["markdown_cells"] == 0
    assert manifest["code_cells"] == 2
    assert manifest["marked_code_cells"] == 2
    assert manifest["code_marker_blocks"] == 3
    assert manifest["outputs_ignored"] == 2
    assert manifest["image_outputs_ignored"] == 1
    assert manifest["attachments_ignored"] == 1


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


def test_all_assignments_latest_download_uses_only_latest_submissions(classroom_client):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        essay = create_assignment(db, title="Essay Draft")
        lab = create_assignment(db, title="Lab 1 / Zip")
        create_submission(db, storage, essay, "20230001", 1, "alice-v1.pdf")
        create_submission(db, storage, essay, "20230001", 2, "alice-v2.md")
        create_submission(db, storage, essay, "20230002", 1, "bob-v1.md")
        create_submission(db, storage, lab, "20230001", 1, "lab.zip")
    finally:
        db.close()

    response = client.get("/api/admin/assignments/download-all?mode=latest")
    entries = zip_entries(response)

    assert "HW1_Essay Draft/20230001_Alice/alice-v2.md" in entries
    assert "HW1_Essay Draft/20230001_Alice/alice-v1.pdf" not in entries
    assert "HW1_Essay Draft/20230001_Alice/v2/alice-v2.md" not in entries
    assert "HW1_Essay Draft/20230002_Bob/bob-v1.md" in entries
    assert "HW2_Lab 1 _ Zip/20230001_Alice/lab.zip" in entries
    assert "HW2_Lab 1 _ Zip/20230002_Bob/" in entries


def test_all_assignments_export_job_reports_progress_and_downloads_zip(classroom_client):
    client, SessionLocal, storage = classroom_client
    db = SessionLocal()
    try:
        essay = create_assignment(db, title="Essay Draft")
        create_submission(db, storage, essay, "20230001", 1, "alice-v1.pdf")
        create_submission(db, storage, essay, "20230001", 2, "alice-v2.md")
        create_submission(db, storage, essay, "20230002", 1, "bob-v1.md")
    finally:
        db.close()

    create_response = client.post("/api/admin/assignments/download-all/jobs?mode=latest")
    assert create_response.status_code == 200
    job = create_response.json()
    assert job["mode"] == "latest"
    assert job["total_files"] == 2

    completed = wait_for_export_job(client, job["job_id"])
    assert completed["status"] == "complete"
    assert completed["percent"] == 100
    assert completed["processed_files"] == 2

    file_response = client.get(f"/api/admin/assignments/download-all/jobs/{job['job_id']}/file")
    entries = zip_entries(file_response)
    assert "HW1_Essay Draft/20230001_Alice/alice-v2.md" in entries
    assert "HW1_Essay Draft/20230001_Alice/alice-v1.pdf" not in entries
    assert "HW1_Essay Draft/20230002_Bob/bob-v1.md" in entries
