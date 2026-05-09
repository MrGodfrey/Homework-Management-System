#!/usr/bin/env python3
"""Authenticated online smoke test for AI-assisted grading.

This script writes temporary production test data. It refuses to run unless
--confirm-production-write is passed.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests


def env_required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def assert_no_ai_fields(payload: object) -> None:
    text = json.dumps(payload, ensure_ascii=False)
    forbidden = [
        "ai_review",
        "ai_score",
        "ai_confidence",
        "ai_report",
        "ai_grading_rubric",
        "report_text",
    ]
    found = [item for item in forbidden if item in text]
    if found:
        raise AssertionError(f"Student payload leaked AI fields: {found}")


class Client:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()

    def url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def set_token(self, token: str) -> None:
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def clear_token(self) -> None:
        self.session.headers.pop("Authorization", None)

    def request(self, method: str, path: str, **kwargs):
        response = self.session.request(method, self.url(path), timeout=90, **kwargs)
        if response.status_code >= 400:
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            raise AssertionError(f"{method} {path} failed with HTTP {response.status_code}: {detail}")
        return response

    def login_instructor(self, username: str, password: str) -> None:
        self.clear_token()
        response = self.request(
            "POST",
            "/api/auth/instructor/login",
            json={"username": username, "password": password},
        )
        self.set_token(response.json()["access_token"])

    def login_student(self, student_id: str, password: str) -> None:
        self.clear_token()
        response = self.request(
            "POST",
            "/api/auth/student/login",
            json={"student_id": student_id, "password": password},
        )
        self.set_token(response.json()["access_token"])


def upload_submission(client: Client, assignment_id: int, filename: str, body: bytes, content_type: str):
    return client.session.post(
        client.url(f"/api/assignments/{assignment_id}/submit"),
        timeout=90,
        files=[("files", (filename, body, content_type))],
    )


def latest_submission_for_student(submissions: list[dict], student_no: str) -> dict:
    matches = [item for item in submissions if item["student_id"] == student_no]
    if not matches:
        raise AssertionError(f"No submission found for {student_no}")
    return max(matches, key=lambda item: item["version"])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--confirm-production-write", action="store_true")
    args = parser.parse_args()
    if not args.confirm_production_write:
        raise SystemExit("Refusing to run without --confirm-production-write")

    base_url = env_required("CLASSROOM_BASE_URL")
    admin_username = env_required("CLASSROOM_ADMIN_USERNAME")
    admin_password = env_required("CLASSROOM_ADMIN_PASSWORD")

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    student_a = f"smoke_ai_a_{stamp}"
    student_b = f"smoke_ai_b_{stamp}"
    assignment_id = None
    created_student_ids: list[int] = []

    client = Client(base_url)
    print(f"Online AI smoke target: {base_url}")

    try:
        client.login_instructor(admin_username, admin_password)
        print("PASS instructor login")

        for student_id, name in [(student_a, "AI Smoke A"), (student_b, "AI Smoke B")]:
            response = client.request(
                "POST",
                "/api/admin/students",
                json={"student_id": student_id, "name": name},
            )
            created_student_ids.append(response.json()["id"])
        print("PASS temporary students created")

        deadline = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        assignment_payload = {
            "title": f"AI Smoke {stamp}",
            "description": "Temporary online smoke assignment for AI-assisted grading.",
            "deadline": deadline,
            "allow_late": True,
            "file_rules": ".md,.ipynb",
            "ai_grading_rubric": "Smoke test rubric: summarize the submission and suggest a conservative 0-100 score.",
        }
        assignment = client.request("POST", "/api/admin/assignments", json=assignment_payload).json()
        assignment_id = assignment["id"]
        print(f"PASS temporary assignment created: {assignment_id}")

        settings_response = client.request(
            "PUT",
            f"/api/admin/assignments/{assignment_id}/ai-settings",
            json={"ai_grading_rubric": "Updated online smoke rubric: check Markdown/code only."},
        ).json()
        assert settings_response["ai_grading_rubric"] == "Updated online smoke rubric: check Markdown/code only."
        print("PASS AI rubric saved through admin endpoint")

        client.login_student(student_a, student_a)
        md_response = upload_submission(
            client,
            assignment_id,
            "answer.md",
            b"# Smoke answer\n\nMarkdown content for online smoke.\n",
            "text/markdown",
        )
        assert md_response.status_code == 200, md_response.text
        print("PASS student markdown upload")

        zip_response = upload_submission(
            client,
            assignment_id,
            "blocked.zip",
            b"zip should be rejected",
            "application/zip",
        )
        assert zip_response.status_code == 400, zip_response.text
        assert "压缩包" in zip_response.text
        print("PASS student archive upload rejected")

        notebook = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "source": ["# Notebook smoke\n"],
                    "attachments": {"image.png": {"image/png": "ATTACHMENT_BASE64_SHOULD_NOT_BE_USED"}},
                },
                {
                    "cell_type": "code",
                    "source": ["print('unmarked setup code should not be reviewed')\n"],
                },
                {
                    "cell_type": "code",
                    "source": [
                        "# GRADED FUNCTION: smoke_solution\n",
                        "def smoke_solution():\n",
                        "    ### START CODE HERE ###\n",
                        "    visible_answer = 'marked code'\n",
                        "    ### END CODE HERE ###\n",
                        "    return visible_answer\n",
                    ],
                    "outputs": [
                        {"output_type": "stream", "text": "OUTPUT_TEXT_SHOULD_NOT_BE_USED"},
                        {"output_type": "display_data", "data": {"image/png": "IMAGE_BASE64_SHOULD_NOT_BE_USED"}},
                    ],
                },
            ]
        }
        ipynb_response = upload_submission(
            client,
            assignment_id,
            "analysis.ipynb",
            json.dumps(notebook).encode("utf-8"),
            "application/x-ipynb+json",
        )
        assert ipynb_response.status_code == 200, ipynb_response.text
        print("PASS student notebook upload")

        client.login_student(student_b, student_b)
        b_response = upload_submission(
            client,
            assignment_id,
            "peer.md",
            b"# Peer smoke\n\nSecond student for batch review.\n",
            "text/markdown",
        )
        assert b_response.status_code == 200, b_response.text
        print("PASS second student markdown upload")

        client.login_instructor(admin_username, admin_password)
        submissions = client.request("GET", f"/api/admin/assignments/{assignment_id}/submissions").json()
        sub_a_latest = latest_submission_for_student(submissions, student_a)
        sub_b_latest = latest_submission_for_student(submissions, student_b)
        assert sub_a_latest["ai_review_status"] == "none"
        assert sub_b_latest["ai_review_status"] == "none"
        print("PASS student upload did not auto-create AI review")

        single_review = client.request(
            "POST",
            f"/api/admin/submissions/{sub_a_latest['id']}/ai-review",
            json={"force": False},
        ).json()
        if not single_review.get("result"):
            raise AssertionError(f"Single AI review did not produce a result: {single_review}")
        manifest = single_review["result"]["file_manifest"][0]
        assert manifest["type"] == "notebook"
        assert manifest["source_mode"] == "marked_code_cells"
        assert manifest["markdown_cells"] == 0
        assert manifest["code_cells"] == 1
        assert manifest["marked_code_cells"] == 1
        assert manifest["code_marker_blocks"] == 1
        assert manifest["outputs_ignored"] == 2
        assert manifest["image_outputs_ignored"] == 1
        assert manifest["attachments_ignored"] == 1
        print("PASS single AI review and notebook extraction boundary")

        batch_review = client.request(
            "POST",
            f"/api/admin/assignments/{assignment_id}/ai-review-jobs",
            json={"scope": "latest_unreviewed_per_student"},
        ).json()
        assert batch_review["total"] >= 1
        assert batch_review["failed"] == 0
        print("PASS batch AI review")

        grade_score = 93
        client.request("PATCH", f"/api/admin/submissions/{sub_a_latest['id']}/grade", json={"score": grade_score})
        print("PASS teacher final grade saved")

        client.login_student(student_a, student_a)
        student_assignments = client.request("GET", "/api/assignments").json()
        assert_no_ai_fields(student_assignments)
        smoke_assignment = next(item for item in student_assignments if item["id"] == assignment_id)
        assert smoke_assignment["status"]["score"] == grade_score
        history = client.request("GET", f"/api/assignments/{assignment_id}/submissions").json()
        assert_no_ai_fields(history)
        print("PASS student sees final score only and no AI fields")

        print("ONLINE AI SMOKE PASSED")
        return 0
    finally:
        if assignment_id or created_student_ids:
            try:
                client.login_instructor(admin_username, admin_password)
                if assignment_id:
                    client.session.delete(client.url(f"/api/admin/assignments/{assignment_id}?force=true"), timeout=90)
                for student_db_id in created_student_ids:
                    client.session.delete(client.url(f"/api/admin/students/{student_db_id}"), timeout=90)
                print("Cleanup attempted for temporary smoke data")
            except Exception as exc:
                print(f"Cleanup failed; remove smoke data manually: {exc}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
