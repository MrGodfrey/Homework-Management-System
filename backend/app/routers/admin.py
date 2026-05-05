import csv
import io
import os
import re
import tempfile
import threading
import time
import uuid
import zipfile
import secrets
import string
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.database import get_db
from app.models import (
    AIGradingJob,
    AIGradingResult,
    Student,
    Assignment,
    Submission,
    SubmissionFile,
    AuditLog,
    Instructor,
    AssignmentFile,
    Interaction,
    beijing_now,
)
from app.schemas import (
    AIReviewRequest,
    AssignmentAISettings,
    BatchAIReviewRequest,
    StudentOut,
    StudentCreate,
    StudentUpdate,
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentOut,
    GradeSubmission,
    AssignmentOutWithFiles,
    AssignmentFileOut,
    InteractionCreate,
    InteractionOut,
)
from app.services.ai_grading import (
    generate_ai_review,
    latest_job_for_submission,
    latest_result_for_submission,
    run_batch_ai_review,
    serialize_job,
    serialize_result,
    summarize_submission_ai_state,
)
from app.services.submission_extractor import sanitize_file_rules
from app.dependencies import get_current_instructor
from app.auth import hash_password
from app.cos_utils import (
    delete_file_from_storage,
    generate_presigned_url,
    read_file_from_storage,
    upload_file_to_cos,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_instructor)]
)

EXPORT_JOB_TTL_SECONDS = 60 * 60
_export_jobs: dict[str, dict] = {}
_export_jobs_lock = threading.Lock()


def _safe_zip_segment(value: object, fallback: str) -> str:
    text = str(value or "").strip().replace("/", "_").replace("\\", "_")
    text = re.sub(r'[<>:"|?*\x00-\x1f]', "_", text)
    text = re.sub(r"\s+", " ", text).strip(". ")
    return text or fallback


def _student_folder(student: Student) -> str:
    student_no = _safe_zip_segment(student.student_id, f"student_{student.id}")
    student_name = _safe_zip_segment(student.name, "unknown")
    return f"{student_no}_{student_name}"


def _assignment_folder(assignment: Assignment) -> str:
    title = _safe_zip_segment(assignment.title, "assignment")
    return f"HW{assignment.id}_{title}"


def _dedupe_arcname(arcname: str, used_arcnames: set[str]) -> str:
    if arcname not in used_arcnames:
        used_arcnames.add(arcname)
        return arcname

    if "/" in arcname:
        folder, filename = arcname.rsplit("/", 1)
        prefix = f"{folder}/"
    else:
        filename = arcname
        prefix = ""

    stem, ext = os.path.splitext(filename)
    counter = 2
    while True:
        candidate = f"{prefix}{stem}_{counter}{ext}"
        if candidate not in used_arcnames:
            used_arcnames.add(candidate)
            return candidate
        counter += 1


def _write_submission_files(
    zf: zipfile.ZipFile,
    submission: Submission,
    base_folder: str,
    used_arcnames: set[str],
) -> None:
    for file in submission.files:
        try:
            file_bytes = read_file_from_storage(file.cos_key)
            filename = _safe_zip_segment(file.filename, f"file_{file.id}")
            raw_arcname = f"{base_folder}/{filename}" if base_folder else filename
            arcname = _dedupe_arcname(raw_arcname, used_arcnames)
            zf.writestr(arcname, file_bytes)
        except Exception as e:
            print(f"Failed to download {file.cos_key} from storage: {e}")


def _validate_assignment_export_mode(mode: str) -> str:
    if mode not in {"latest", "all"}:
        raise HTTPException(status_code=400, detail="mode must be latest or all")
    return mode


def _build_all_assignments_export_plan(db: Session, mode: str) -> dict:
    mode = _validate_assignment_export_mode(mode)
    assignments = db.query(Assignment).order_by(Assignment.id).all()
    if not assignments:
        raise HTTPException(status_code=404, detail="No assignments found to download")

    students = db.query(Student).order_by(Student.student_id).all()
    assignment_ids = [assignment.id for assignment in assignments]
    submissions = (
        db.query(Submission)
        .options(selectinload(Submission.files))
        .filter(Submission.assignment_id.in_(assignment_ids))
        .join(Student)
        .order_by(Submission.assignment_id, Student.student_id, Submission.version_no)
        .all()
    )

    subs_by_assignment_student: dict[tuple[int, int], list[dict]] = {}
    for sub in submissions:
        sub_record = {
            "assignment_id": sub.assignment_id,
            "student_id": sub.student_id,
            "version_no": sub.version_no,
            "files": [
                {"id": file.id, "filename": file.filename, "cos_key": file.cos_key}
                for file in sub.files
            ],
        }
        subs_by_assignment_student.setdefault((sub.assignment_id, sub.student_id), []).append(sub_record)

    directories: list[str] = []
    file_entries: list[dict] = []
    for assignment in assignments:
        assignment_folder = _assignment_folder(assignment)
        directories.append(f"{assignment_folder}/")

        for student in students:
            student_folder = f"{assignment_folder}/{_student_folder(student)}"
            directories.append(f"{student_folder}/")

            student_subs = subs_by_assignment_student.get((assignment.id, student.id), [])
            if mode == "latest":
                if not student_subs:
                    continue
                latest_sub = max(student_subs, key=lambda sub: sub["version_no"])
                for file in latest_sub["files"]:
                    file_entries.append({
                        "base_folder": student_folder,
                        "filename": file["filename"],
                        "cos_key": file["cos_key"],
                        "fallback": f"file_{file['id']}",
                    })
                continue

            for sub in student_subs:
                version_folder = f"{student_folder}/v{sub['version_no']}"
                directories.append(f"{version_folder}/")
                for file in sub["files"]:
                    file_entries.append({
                        "base_folder": version_folder,
                        "filename": file["filename"],
                        "cos_key": file["cos_key"],
                        "fallback": f"file_{file['id']}",
                    })

    filename = "latest_assignments_submissions.zip" if mode == "latest" else "all_assignments_submissions.zip"
    return {
        "mode": mode,
        "directories": directories,
        "file_entries": file_entries,
        "filename": filename,
        "total_files": len(file_entries),
    }


def _write_all_assignments_export_zip(plan: dict, progress_callback=None) -> tuple[str, int]:
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip_path = temp_zip.name
    temp_zip.close()

    used_arcnames: set[str] = set()
    processed_files = 0
    skipped_files = 0
    total_files = plan["total_files"]

    with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for directory in plan["directories"]:
            zf.writestr(_dedupe_arcname(directory, used_arcnames), "")

        for entry in plan["file_entries"]:
            try:
                file_bytes = read_file_from_storage(entry["cos_key"])
                filename = _safe_zip_segment(entry["filename"], entry["fallback"])
                raw_arcname = f"{entry['base_folder']}/{filename}"
                arcname = _dedupe_arcname(raw_arcname, used_arcnames)
                zf.writestr(arcname, file_bytes)
            except Exception as e:
                skipped_files += 1
                logger.warning("Failed to add %s to export ZIP: %s", entry["cos_key"], e)
            finally:
                processed_files += 1
                if progress_callback:
                    progress_callback(processed_files, total_files, skipped_files)

    return temp_zip_path, skipped_files


def _cleanup_export_jobs() -> None:
    now = time.time()
    file_paths_to_remove: list[str] = []
    with _export_jobs_lock:
        for job_id, job in list(_export_jobs.items()):
            if now - job["created_at_ts"] <= EXPORT_JOB_TTL_SECONDS:
                continue
            file_path = job.get("file_path")
            if file_path:
                file_paths_to_remove.append(file_path)
            del _export_jobs[job_id]

    for file_path in file_paths_to_remove:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except OSError:
            logger.warning("Failed to remove expired export file %s", file_path)


def _public_export_job(job: dict) -> dict:
    return {
        "job_id": job["job_id"],
        "mode": job["mode"],
        "status": job["status"],
        "percent": job["percent"],
        "processed_files": job["processed_files"],
        "total_files": job["total_files"],
        "skipped_files": job.get("skipped_files", 0),
        "filename": job["filename"],
        "message": job["message"],
        "error": job.get("error"),
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }


def _get_export_job_or_404(job_id: str) -> dict:
    with _export_jobs_lock:
        job = _export_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Export job not found")
        return dict(job)


def _update_export_job(job_id: str, **updates) -> None:
    with _export_jobs_lock:
        job = _export_jobs.get(job_id)
        if not job:
            return
        job.update(updates)
        job["updated_at"] = beijing_now().isoformat()


def _delete_export_job_file(job_id: str) -> None:
    file_path = None
    with _export_jobs_lock:
        job = _export_jobs.pop(job_id, None)
        if job:
            file_path = job.get("file_path")
    if not file_path:
        return
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        logger.warning("Failed to remove downloaded export file %s", file_path)


def _run_all_assignments_export_job(job_id: str, plan: dict) -> None:
    total_files = plan["total_files"]
    _update_export_job(
        job_id,
        status="running",
        percent=0,
        message="正在打包导出文件" if total_files else "正在生成空目录结构",
    )

    def update_progress(processed_files: int, total: int, skipped_files: int) -> None:
        percent = 99 if total == 0 else min(99, int(processed_files * 100 / total))
        _update_export_job(
            job_id,
            processed_files=processed_files,
            skipped_files=skipped_files,
            percent=percent,
            message=f"已处理 {processed_files}/{total} 个文件",
        )

    try:
        file_path, skipped_files = _write_all_assignments_export_zip(plan, update_progress)
        message = "导出文件已生成"
        if skipped_files:
            message = f"导出文件已生成，{skipped_files} 个文件读取失败已跳过"
        _update_export_job(
            job_id,
            status="complete",
            percent=100,
            processed_files=total_files,
            skipped_files=skipped_files,
            file_path=file_path,
            message=message,
        )
    except Exception as e:
        logger.exception("All assignments export job failed")
        _update_export_job(
            job_id,
            status="failed",
            percent=0,
            error=str(e),
            message="导出失败",
        )

@router.get("/students", response_model=List[StudentOut])
def get_students(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    # 将 plain_password 映射到 password 字段
    result = []
    for student in students:
        result.append({
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "password": student.plain_password or student.student_id  # 如果没有明文密码，显示学号
        })
    return result

@router.post("/students/import")
def import_students(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode('utf-8')
    reader = csv.DictReader(io.StringIO(content))
    added = 0
    for row in reader:
        student_id = row.get("student_id")
        name = row.get("name")
        if student_id and name:
            exists = db.query(Student).filter(Student.student_id == student_id).first()
            if not exists:
                new_student = Student(
                    student_id=student_id, 
                    name=name, 
                    hashed_password=hash_password(student_id),
                    plain_password=student_id  # 默认密码为学号
                )
                db.add(new_student)
                added += 1
    db.commit()
    return {"message": f"Successfully imported {added} students"}

@router.post("/students/generate-passwords")
def generate_passwords(db: Session = Depends(get_db)):
    try:
        logger.info("开始批量生成密码")
        students = db.query(Student).all()
        logger.info(f"查询到 {len(students)} 个学生")
        
        if not students:
            logger.warning("没有学生记录")
            raise HTTPException(status_code=404, detail="没有学生记录")
        
        output = io.StringIO()
        output.write('\ufeff')  # UTF-8 BOM for Excel
        writer = csv.writer(output)
        writer.writerow(["student_id", "name", "password"])
        
        updated_count = 0
        for student in students:
            try:
                password = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(8))
                student.hashed_password = hash_password(password)
                student.plain_password = password  # 保存明文密码
                writer.writerow([student.student_id, student.name, password])
                updated_count += 1
            except Exception as e:
                logger.error(f"为学生 {student.student_id} 生成密码失败: {str(e)}")
                raise HTTPException(status_code=500, detail=f"为学生 {student.student_id} 生成密码失败: {str(e)}")
        
        logger.info(f"准备提交数据库更改，共 {updated_count} 个学生")
        db.commit()
        logger.info("数据库提交成功")
        
        return {"message": "密码批量重新生成成功"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"批量生成密码失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"生成密码失败: {str(e)}"
        )

@router.get("/students/download-passwords")
def download_passwords(db: Session = Depends(get_db)):
    try:
        students = db.query(Student).all()
        if not students:
            raise HTTPException(status_code=404, detail="没有学生记录")
            
        output = io.StringIO()
        output.write('\ufeff')  # UTF-8 BOM for Excel
        writer = csv.writer(output)
        writer.writerow(["student_id", "name", "password"])
        
        for student in students:
            writer.writerow([student.student_id, student.name, student.plain_password or ""])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=passwords.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载密码失败: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"下载密码失败: {str(e)}"
        )

@router.post("/students/{student_id}/reset-password")
def reset_password(student_id: int, db: Session = Depends(get_db)):
    try:
        logger.info(f"开始重置密码，学生ID: {student_id}")
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            logger.warning(f"学生不存在，ID: {student_id}")
            raise HTTPException(status_code=404, detail="Student not found")
        
        logger.info(f"找到学生: {student.name} ({student.student_id})")
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(8))
        student.hashed_password = hash_password(password)
        student.plain_password = password  # 保存明文密码
        
        logger.info(f"准备提交数据库更改")
        db.commit()
        logger.info(f"密码重置成功: {student.name} ({student.student_id})")
        
        return {"message": "Password reset successful", "new_password": password}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"重置密码失败，学生ID {student_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"重置密码失败: {str(e)}"
        )

@router.post("/students", response_model=StudentOut)
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    existing = db.query(Student).filter(Student.student_id == student.student_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="该学号已存在")
    new_student = Student(
        student_id=student.student_id,
        name=student.name,
        hashed_password=hash_password(student.student_id),
        plain_password=student.student_id  # 默认密码为学号
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return {
        "id": new_student.id,
        "student_id": new_student.student_id,
        "name": new_student.name,
        "password": new_student.plain_password
    }

@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    if data.student_id is not None and data.student_id != student.student_id:
        conflict = db.query(Student).filter(Student.student_id == data.student_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="该学号已被其他学生使用")
        student.student_id = data.student_id
    if data.name is not None:
        student.name = data.name
    db.commit()
    db.refresh(student)
    return {
        "id": student.id,
        "student_id": student.student_id,
        "name": student.name,
        "password": student.plain_password
    }

@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    # 删除关联的提交记录及文件
    submissions = db.query(Submission).filter(Submission.student_id == student_id).all()
    submission_ids = [sub.id for sub in submissions]
    if submission_ids:
        db.query(AIGradingResult).filter(AIGradingResult.submission_id.in_(submission_ids)).delete(synchronize_session=False)
        db.query(AIGradingJob).filter(AIGradingJob.submission_id.in_(submission_ids)).delete(synchronize_session=False)
    for sub in submissions:
        db.query(SubmissionFile).filter(SubmissionFile.submission_id == sub.id).delete()
    db.query(Submission).filter(Submission.student_id == student_id).delete()
    db.delete(student)
    db.commit()
    return {"message": "学生已删除"}

@router.get("/assignments", response_model=List[AssignmentOut])
def get_assignments(db: Session = Depends(get_db)):
    assignments = db.query(Assignment).all()
    result = []
    
    for assignment in assignments:
        # 统计不同学生的提交数（有提交的学生人数）
        submitted_count = db.query(Submission.student_id).filter(
            Submission.assignment_id == assignment.id
        ).distinct().count()
        
        # 统计已评分的学生人数
        graded_count = db.query(Submission.student_id).filter(
            Submission.assignment_id == assignment.id,
            Submission.is_graded == True
        ).distinct().count()
        
        # 将作业对象转为字典并添加统计字段
        assignment_dict = {
            "id": assignment.id,
            "title": assignment.title,
            "description": assignment.description,
            "deadline": assignment.deadline,
            "allow_late": assignment.allow_late,
            "file_rules": assignment.file_rules,
            "ai_grading_rubric": assignment.ai_grading_rubric,
            "created_at": assignment.created_at,
            "submitted_count": submitted_count,
            "graded_count": graded_count
        }
        result.append(assignment_dict)
    
    return result

@router.post("/assignments", response_model=AssignmentOut)
def create_assignment(
    assignment: AssignmentCreate,
    db: Session = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_instructor),
):
    payload = assignment.dict()
    payload["file_rules"] = sanitize_file_rules(payload.get("file_rules"))
    new_assignment = Assignment(**payload)
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    logger.info(
        "assignment_created",
        extra={
            "user_type": "instructor",
            "user_id": current_instructor.id,
            "assignment_id": new_assignment.id,
        },
    )
    return new_assignment

@router.put("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    assignment: AssignmentUpdate,
    db: Session = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_instructor),
):
    db_assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    payload = assignment.dict(exclude_unset=True)
    if "file_rules" in payload:
        payload["file_rules"] = sanitize_file_rules(payload.get("file_rules"))
    for key, value in payload.items():
        setattr(db_assignment, key, value)
        
    db.commit()
    db.refresh(db_assignment)
    logger.info(
        "assignment_updated",
        extra={
            "user_type": "instructor",
            "user_id": current_instructor.id,
            "assignment_id": db_assignment.id,
            "updated_fields": sorted(payload.keys()),
        },
    )
    return db_assignment

@router.get("/assignments/{assignment_id}/ai-settings")
def get_assignment_ai_settings(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {
        "assignment_id": assignment.id,
        "ai_grading_rubric": assignment.ai_grading_rubric,
    }

@router.put("/assignments/{assignment_id}/ai-settings")
def update_assignment_ai_settings(
    assignment_id: int,
    data: AssignmentAISettings,
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.ai_grading_rubric = data.ai_grading_rubric
    db.commit()
    db.refresh(assignment)
    return {
        "assignment_id": assignment.id,
        "ai_grading_rubric": assignment.ai_grading_rubric,
    }

@router.post("/assignments/{assignment_id}/upload-attachment")
async def upload_assignment_attachment(
    assignment_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """上传作业附件文件"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    try:
        # 读取文件内容
        file_bytes = await file.read()
        
        # 生成 COS key
        cos_key = f"assignments/{assignment_id}/attachments/{beijing_now().timestamp()}_{file.filename}"
        
        # 上传到 COS
        upload_file_to_cos(file_bytes, cos_key)
        
        # 保存到数据库
        assignment_file = AssignmentFile(
            assignment_id=assignment_id,
            filename=file.filename,
            cos_key=cos_key
        )
        db.add(assignment_file)
        db.commit()
        db.refresh(assignment_file)
        
        return {
            "id": assignment_file.id,
            "filename": assignment_file.filename,
            "cos_key": assignment_file.cos_key,
            "uploaded_at": assignment_file.uploaded_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.delete("/assignments/{assignment_id}/attachments/{file_id}")
def delete_assignment_attachment(
    assignment_id: int,
    file_id: int,
    db: Session = Depends(get_db)
):
    """删除作业附件文件"""
    assignment_file = db.query(AssignmentFile).filter(
        AssignmentFile.id == file_id,
        AssignmentFile.assignment_id == assignment_id
    ).first()
    
    if not assignment_file:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # 从 COS 删除文件
    try:
        delete_file_from_storage(assignment_file.cos_key)
    except Exception as e:
        print(f"Failed to delete {assignment_file.cos_key} from COS: {e}")
    
    # 从数据库删除记录
    db.delete(assignment_file)
    db.commit()
    
    return {"message": "Attachment deleted successfully"}

@router.get("/assignments/{assignment_id}/attachments/{file_id}/download")
def get_assignment_attachment_url(
    assignment_id: int,
    file_id: int,
    db: Session = Depends(get_db)
):
    """获取作业附件的下载 URL"""
    assignment_file = db.query(AssignmentFile).filter(
        AssignmentFile.id == file_id,
        AssignmentFile.assignment_id == assignment_id
    ).first()
    
    if not assignment_file:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # 生成临时下载 URL
    download_url = generate_presigned_url(assignment_file.cos_key, expires=3600)
    
    return {
        "filename": assignment_file.filename,
        "download_url": download_url
    }

@router.get("/assignments/{assignment_id}/with-files", response_model=AssignmentOutWithFiles)
def get_assignment_with_files(assignment_id: int, db: Session = Depends(get_db)):
    """获取作业信息及其附件列表"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # 统计不同学生的提交数（有提交的学生人数）
    submitted_count = db.query(Submission.student_id).filter(
        Submission.assignment_id == assignment.id
    ).distinct().count()
    
    # 统计已评分的学生人数
    graded_count = db.query(Submission.student_id).filter(
        Submission.assignment_id == assignment.id,
        Submission.is_graded == True
    ).distinct().count()
    
    # 构造返回对象
    result = {
        "id": assignment.id,
        "title": assignment.title,
        "description": assignment.description,
        "deadline": assignment.deadline,
        "allow_late": assignment.allow_late,
        "file_rules": assignment.file_rules,
        "ai_grading_rubric": assignment.ai_grading_rubric,
        "created_at": assignment.created_at,
        "submitted_count": submitted_count,
        "graded_count": graded_count,
        "attachment_files": [
            {
                "id": f.id,
                "filename": f.filename,
                "cos_key": f.cos_key,
                "uploaded_at": f.uploaded_at
            }
            for f in assignment.attachment_files
        ]
    }
    
    return result

@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, force: bool = False, db: Session = Depends(get_db)):
    """
    删除作业接口
    - assignment_id: 作业ID
    - force: 是否强制删除（即使有学生提交也删除）
    """
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # 检查是否有学生提交
    submission_count = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).count()
    
    # 如果有提交且不是强制删除，返回需要确认的状态
    if submission_count > 0 and not force:
        return {
            "status": "confirm_required",
            "message": "已有学生上传作业，请问您确认删除吗？",
            "submission_count": submission_count
        }
    
    # 获取所有相关的提交记录和文件
    submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id
    ).all()
    submission_ids = [submission.id for submission in submissions]
    if submission_ids:
        db.query(AIGradingResult).filter(AIGradingResult.submission_id.in_(submission_ids)).delete(synchronize_session=False)
        db.query(AIGradingJob).filter(AIGradingJob.submission_id.in_(submission_ids)).delete(synchronize_session=False)
    
    # 收集所有需要从COS删除的文件key
    cos_keys_to_delete = []
    for submission in submissions:
        for file in submission.files:
            cos_keys_to_delete.append(file.cos_key)
    
    # 收集作业附件文件
    assignment_files = db.query(AssignmentFile).filter(
        AssignmentFile.assignment_id == assignment_id
    ).all()
    for file in assignment_files:
        cos_keys_to_delete.append(file.cos_key)
    
    # 从COS删除文件
    for cos_key in cos_keys_to_delete:
        try:
            delete_file_from_storage(cos_key)
        except Exception as e:
            print(f"Failed to delete {cos_key} from COS: {e}")
            # 继续删除其他文件，不因单个文件失败而中断
    
    # 删除数据库中的记录（先删除关联的文件记录，再删除提交记录）
    for submission in submissions:
        # 删除提交关联的文件记录
        db.query(SubmissionFile).filter(SubmissionFile.submission_id == submission.id).delete()
        # 删除提交记录
        db.delete(submission)
    
    # 删除作业附件记录
    db.query(AssignmentFile).filter(AssignmentFile.assignment_id == assignment_id).delete()
    
    # 最后删除作业本身
    db.delete(assignment)
    db.commit()
    
    return {
        "status": "success",
        "message": "作业删除成功",
        "deleted_files": len(cos_keys_to_delete)
    }

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    assignments = db.query(Assignment).all()
    
    result = []
    # 预加载每个学生的互动次数
    interaction_counts = dict(
        db.query(Interaction.student_id, func.count(Interaction.id))
        .group_by(Interaction.student_id)
        .all()
    )
    for student in students:
        row = {
            "student_id": student.student_id,
            "name": student.name,
            "submissions": {},
            "interaction_count": interaction_counts.get(student.id, 0)
        }
        for assignment in assignments:
            sub = db.query(Submission).filter(
                Submission.student_id == student.id,
                Submission.assignment_id == assignment.id
            ).order_by(Submission.version_no.desc()).first()
            row["submissions"][assignment.id] = sub.version_no if sub else 0
        result.append(row)
    return result

@router.post("/students/{student_id}/interactions", response_model=InteractionOut)
def add_interaction(student_id: int, data: InteractionCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    interaction = Interaction(student_id=student.id, note=data.note)
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction

@router.get("/students/{student_id}/interactions", response_model=List[InteractionOut])
def get_interactions(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="学生不存在")
    return db.query(Interaction).filter(Interaction.student_id == student.id).order_by(Interaction.created_at.desc()).all()

@router.delete("/interactions/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="互动记录不存在")
    db.delete(interaction)
    db.commit()
    return {"message": "互动记录已删除"}

@router.get("/assignments/{assignment_id}/submissions")
def get_submissions(assignment_id: int, db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    res = []
    for sub in subs:
        ai_state = summarize_submission_ai_state(db, sub.id)
        res.append({
            "id": sub.id,
            "student_id": sub.student.student_id,
            "student_name": sub.student.name,
            "version": sub.version_no,
            "time": sub.submitted_at,
            "score": sub.score,
            "is_graded": sub.is_graded,
            **ai_state,
        })
    return res

@router.post("/submissions/{submission_id}/ai-review")
def create_submission_ai_review(
    submission_id: int,
    request: AIReviewRequest,
    db: Session = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_instructor),
):
    return generate_ai_review(
        db=db,
        submission_id=submission_id,
        instructor_id=current_instructor.id,
        file_reader=read_file_from_storage,
        force=request.force,
        trigger_type="single",
    )

@router.get("/submissions/{submission_id}/ai-review")
def get_submission_ai_review(submission_id: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {
        "job": serialize_job(latest_job_for_submission(db, submission_id)),
        "result": serialize_result(latest_result_for_submission(db, submission_id)),
        **summarize_submission_ai_state(db, submission_id),
    }

@router.post("/assignments/{assignment_id}/ai-review-jobs")
def create_assignment_ai_review_jobs(
    assignment_id: int,
    request: BatchAIReviewRequest,
    db: Session = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_instructor),
):
    return run_batch_ai_review(
        db=db,
        assignment_id=assignment_id,
        instructor_id=current_instructor.id,
        file_reader=read_file_from_storage,
        scope=request.scope,
        selected_submission_ids=request.selected_submission_ids,
    )

@router.get("/ai-review-jobs/{job_id}")
def get_ai_review_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AIGradingJob).filter(AIGradingJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="AI review job not found")
    return serialize_job(job)

@router.get("/assignments/{assignment_id}/submissions/{student_no}/download")
def download_single_student_submission(
    assignment_id: int,
    student_no: str,
    version: Optional[int] = None,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    """GET /assignments/{id}/submissions/{student_no}/download - 下载单个学生的作业"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # 根据学号找学生
    student = db.query(Student).filter(Student.student_id == student_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    query = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == student.id
    )
    if version is not None:
        query = query.filter(Submission.version_no == version)
    
    target_sub = query.order_by(Submission.version_no.desc()).first()
    
    if not target_sub or not target_sub.files:
        raise HTTPException(status_code=404, detail="No submission found for this student")
    
    # 创建 ZIP 文件
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    used_arcnames: set[str] = set()
    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        _write_submission_files(zf, target_sub, "", used_arcnames)
    
    temp_zip.close()
    version_suffix = f"_v{target_sub.version_no}" if version is not None else ""
    zip_filename = f"HW{assignment_id}_{student_no}_{student.name}{version_suffix}.zip"
    
    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip.name)
    
    return FileResponse(temp_zip.name, media_type="application/zip", filename=zip_filename)

@router.get("/assignments/download-all")
def download_all_assignments_submissions(
    mode: str = "all",
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    """导出全部作业文件。mode=all 为所有版本，mode=latest 为每名学生最新版。"""
    plan = _build_all_assignments_export_plan(db, mode)
    temp_zip_path, _skipped_files = _write_all_assignments_export_zip(plan)

    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip_path)

    return FileResponse(temp_zip_path, media_type="application/zip", filename=plan["filename"])


@router.post("/assignments/download-all/jobs")
def create_all_assignments_export_job(mode: str = "latest", db: Session = Depends(get_db)):
    """创建全部作业导出任务，供前端轮询进度。"""
    _cleanup_export_jobs()
    plan = _build_all_assignments_export_plan(db, mode)
    now = beijing_now().isoformat()
    job_id = uuid.uuid4().hex
    job = {
        "job_id": job_id,
        "mode": plan["mode"],
        "status": "pending",
        "percent": 0,
        "processed_files": 0,
        "total_files": plan["total_files"],
        "skipped_files": 0,
        "filename": plan["filename"],
        "message": "导出任务已创建",
        "error": None,
        "file_path": None,
        "created_at": now,
        "updated_at": now,
        "created_at_ts": time.time(),
    }
    with _export_jobs_lock:
        _export_jobs[job_id] = job

    worker = threading.Thread(target=_run_all_assignments_export_job, args=(job_id, plan), daemon=True)
    worker.start()
    return _public_export_job(job)


@router.get("/assignments/download-all/jobs/{job_id}")
def get_all_assignments_export_job(job_id: str):
    _cleanup_export_jobs()
    return _public_export_job(_get_export_job_or_404(job_id))


@router.get("/assignments/download-all/jobs/{job_id}/file")
def download_all_assignments_export_job_file(job_id: str, background_tasks: BackgroundTasks = None):
    job = _get_export_job_or_404(job_id)
    if job["status"] != "complete":
        raise HTTPException(status_code=409, detail="Export job is not complete")
    file_path = job.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Export file not found")

    if background_tasks:
        background_tasks.add_task(_delete_export_job_file, job_id)

    return FileResponse(file_path, media_type="application/zip", filename=job["filename"])

@router.get("/assignments/{assignment_id}/download")
def download_submissions(assignment_id: int, mode: str = "latest", db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    if mode not in {"latest", "all"}:
        raise HTTPException(status_code=400, detail="mode must be latest or all")

    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    subs = (
        db.query(Submission)
        .filter(Submission.assignment_id == assignment_id)
        .join(Student)
        .order_by(Student.student_id, Submission.version_no)
        .all()
    )
    if not subs:
        raise HTTPException(status_code=404, detail="No submissions found to download")
        
    subs_to_download = []
    if mode == "latest":
        student_subs = {}
        for sub in subs:
            if sub.student_id not in student_subs or sub.version_no > student_subs[sub.student_id].version_no:
                student_subs[sub.student_id] = sub
        subs_to_download = sorted(student_subs.values(), key=lambda sub: sub.student.student_id)
        zip_filename = f"HW{assignment_id}_latest_only.zip"
    else:
        subs_to_download = subs
        zip_filename = f"HW{assignment_id}_all_versions.zip"
        
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    used_arcnames: set[str] = set()
    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for sub in subs_to_download:
            student_prefix = _student_folder(sub.student)
            base_folder = f"{student_prefix}/v{sub.version_no}" if mode == "all" else student_prefix
            _write_submission_files(zf, sub, base_folder, used_arcnames)
                    
    temp_zip.close()
    
    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip.name)
        
    return FileResponse(temp_zip.name, media_type="application/zip", filename=zip_filename)

@router.get("/assignments/{assignment_id}/export_csv")
def export_assignment_csv(assignment_id: int, db: Session = Depends(get_db)):
    """GET /assignments/{id}/export_csv - 导出作业完成情况及成绩 CSV"""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    students = db.query(Student).all()
    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM for Excel
    writer = csv.writer(output)
    writer.writerow(["学号", "姓名", "提交状态", "分数"])
    
    for student in students:
        latest_sub = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == student.id
        ).order_by(Submission.version_no.desc()).first()
        
        if not latest_sub:
            writer.writerow([student.student_id, student.name, "未交", ""])
        else:
            # 如果已提交但未批改，默认显示 85 分
            if latest_sub.is_graded:
                score = latest_sub.score if latest_sub.score is not None else ""
            else:
                score = 85
            writer.writerow([student.student_id, student.name, "已交", score])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=assignment_{assignment_id}_grades.csv"}
    )

@router.patch("/submissions/{sub_id}/grade")
def grade_submission(
    sub_id: int,
    grade_data: GradeSubmission,
    db: Session = Depends(get_db),
    current_instructor: Instructor = Depends(get_current_instructor),
):
    """PATCH /submissions/{sub_id}/grade - 教师评分接口"""
    submission = db.query(Submission).filter(Submission.id == sub_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # 更新评分信息
    if grade_data.score is not None:
        submission.score = grade_data.score
    
    submission.is_graded = True
    db.commit()
    db.refresh(submission)
    logger.info(
        "submission_graded",
        extra={
            "user_type": "instructor",
            "user_id": current_instructor.id,
            "assignment_id": submission.assignment_id,
            "submission_id": submission.id,
            "student_id": submission.student_id,
            "score": submission.score,
        },
    )
    
    return {
        "message": "Grade updated successfully",
        "submission_id": submission.id,
        "score": submission.score,
        "is_graded": submission.is_graded
    }

@router.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return logs

@router.get("/export_all_grades_csv")
def export_all_grades_csv(db: Session = Depends(get_db)):
    """GET /admin/export_all_grades_csv - 导出所有学生所有作业的成绩 CSV"""
    # 查询所有学生和作业
    students = db.query(Student).order_by(Student.student_id).all()
    assignments = db.query(Assignment).order_by(Assignment.id).all()
    
    if not students:
        raise HTTPException(status_code=404, detail="No students found")
    
    output = io.StringIO()
    output.write('\ufeff')  # UTF-8 BOM for Excel
    writer = csv.writer(output)
    
    # 构建表头：学号、姓名、互动次数 + 各个作业标题
    header = ["学号", "姓名", "互动次数"]
    for assignment in assignments:
        header.append(assignment.title)
    writer.writerow(header)
    
    # 预加载互动次数
    interaction_counts = dict(
        db.query(Interaction.student_id, func.count(Interaction.id))
        .group_by(Interaction.student_id)
        .all()
    )
    
    # 为每个学生构建一行数据
    for student in students:
        row = [student.student_id, student.name, interaction_counts.get(student.id, 0)]
        
        # 对每个作业，查找该学生的提交情况
        for assignment in assignments:
            latest_sub = db.query(Submission).filter(
                Submission.assignment_id == assignment.id,
                Submission.student_id == student.id
            ).order_by(Submission.version_no.desc()).first()
            
            if not latest_sub:
                # 未提交
                row.append("未交")
            else:
                # 已提交：显示具体评分
                if latest_sub.score is not None:
                    # 有具体评分
                    row.append(latest_sub.score)
                elif latest_sub.is_graded:
                    # 已批改但分数为空（罕见情况）
                    row.append("")
                else:
                    # 已提交但未批改，显示默认85分
                    row.append(85)
        
        writer.writerow(row)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=all_grades.csv"}
    )
