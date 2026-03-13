from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import os
import uuid

from app.database import get_db
from app.models import Student, Assignment, Submission, SubmissionFile, AuditLog
from app.dependencies import get_current_student
from app.schemas import AssignmentBase, StudentMeOut
from app.cos_utils import upload_file_to_cos, generate_presigned_url
from app.config import settings

router = APIRouter(
    prefix="/api/assignments",
    tags=["Student Assignments"]
)

@router.get("/me", response_model=StudentMeOut)
def get_current_student_info(current_student: Student = Depends(get_current_student)):
    """GET /api/assignments/me - 获取当前登录学生的信息"""
    return {
        "student_id": current_student.student_id,
        "name": current_student.name
    }

@router.get("")
def get_assignments(db: Session = Depends(get_db), current_student: Student = Depends(get_current_student)):
    """GET /api/assignments - assignment list + current student submission status"""
    assignments = db.query(Assignment).all()
    results = []
    for assign in assignments:
        latest_sub = db.query(Submission).filter(
            Submission.assignment_id == assign.id,
            Submission.student_id == current_student.id
        ).order_by(desc(Submission.version_no)).first()
        
        status_info = {
            "submitted": latest_sub is not None,
            "version_no": latest_sub.version_no if latest_sub else None,
            "submitted_at": latest_sub.submitted_at if latest_sub else None
        }
        
        results.append({
            "id": assign.id,
            "title": assign.title,
            "deadline": assign.deadline,
            "allow_late": assign.allow_late,
            "status": status_info
        })
    return results

@router.get("/{id}")
def get_assignment_detail(id: int, db: Session = Depends(get_db), current_student: Student = Depends(get_current_student)):
    """GET /api/assignments/{id} - assignment details"""
    assign = db.query(Assignment).filter(Assignment.id == id).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {
        "id": assign.id,
        "title": assign.title,
        "description": assign.description,
        "deadline": assign.deadline,
        "allow_late": assign.allow_late,
        "file_rules": assign.file_rules
    }

@router.post("/{id}/submit")
async def submit_assignment(
    id: int, 
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db), 
    current_student: Student = Depends(get_current_student)
):
    """POST /api/assignments/{id}/submit"""
    assign = db.query(Assignment).filter(Assignment.id == id).first()
    if not assign:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    now = datetime.utcnow()
    
    # Check deadline
    if now > assign.deadline and not assign.allow_late:
        raise HTTPException(status_code=400, detail="Deadline has passed, late submission is not allowed")
        
    # Check file rules (assuming comma-separated extensions like '.doc,.pdf')
    if assign.file_rules:
        allowed_exts = [ext.strip().lower() for ext in assign.file_rules.split(',')]
        for f in files:
            ext = os.path.splitext(f.filename)[1].lower()
            if ext not in allowed_exts:
                raise HTTPException(status_code=400, detail=f"File extension {ext} not allowed.")
                
    # Max version
    latest_sub = db.query(Submission).filter(
        Submission.assignment_id == assign.id,
        Submission.student_id == current_student.id
    ).order_by(desc(Submission.version_no)).first()
    
    new_version_no = latest_sub.version_no + 1 if latest_sub else 1
    
    # Calculate total file size (max 50 MB)
    total_size = 0
    file_bytes_list = []
    MAX_SIZE = 50 * 1024 * 1024
    
    for f in files:
        file_bytes = await f.read()
        total_size += len(file_bytes)
        if total_size > MAX_SIZE:
            raise HTTPException(status_code=400, detail="Total file size exceeds 50MB limit.")
        file_bytes_list.append((f, file_bytes))

    # Create DB Submission
    new_submission = Submission(
        assignment_id=assign.id,
        student_id=current_student.id,
        version_no=new_version_no,
        submitted_at=now
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    
    # Upload and write files
    # Determine environment prefix for COS storage isolation (DEV vs PROD)
    env_prefix = "dev_env" if settings.ENV == "DEV" else "prod_env"
    
    for (f, file_bytes) in file_bytes_list:
        # Generate unique key to prevent file overwrite:
        # Format: {env_prefix}/submissions/{assignment_id}/{student_no}/{timestamp}_{uuid}_{filename}
        timestamp = now.strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        cos_key = f"{env_prefix}/submissions/{assign.id}/{current_student.student_id}/{timestamp}_{unique_id}_{f.filename}"
        
        # Upload
        upload_file_to_cos(file_bytes, cos_key)
        
        # Save to DB
        sub_file = SubmissionFile(
            submission_id=new_submission.id,
            filename=f.filename,
            cos_key=cos_key
        )
        db.add(sub_file)
        
    # Audit log
    audit_log = AuditLog(
        user_type="student",
        user_id=current_student.id,
        action="submit_assignment",
        details=f"Assignment: {assign.id}, Version: {new_version_no}, Files: {[f.filename for f in files]}"
    )
    db.add(audit_log)
    
    db.commit()
    
    return {
        "message": "Submission successful",
        "version_no": new_version_no,
        "submitted_at": now
    }

@router.get("/{id}/submissions")
def get_submission_history(id: int, db: Session = Depends(get_db), current_student: Student = Depends(get_current_student)):
    """GET /api/assignments/{id}/submissions - submission history"""
    submissions = db.query(Submission).filter(
        Submission.assignment_id == id,
        Submission.student_id == current_student.id
    ).order_by(desc(Submission.version_no)).all()
    
    history = []
    for sub in submissions:
        files = []
        for f in sub.files:
            download_url = generate_presigned_url(f.cos_key)
            files.append({
                "id": f.id,
                "filename": f.filename,
                "download_url": download_url
            })
            
        history.append({
            "version_no": sub.version_no,
            "submitted_at": sub.submitted_at,
            "files": files
        })
        
    return history
