import csv
import io
import zipfile
import secrets
import string
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Student, Assignment, Submission, SubmissionFile, AuditLog, Instructor
from app.schemas import StudentOut, AssignmentCreate, AssignmentUpdate, AssignmentOut
from app.dependencies import get_current_instructor
from app.auth import hash_password

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_instructor)]
)

@router.get("/students", response_model=List[StudentOut])
def get_students(db: Session = Depends(get_db)):
    return db.query(Student).all()

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
                new_student = Student(student_id=student_id, name=name, hashed_password=hash_password(student_id))
                db.add(new_student)
                added += 1
    db.commit()
    return {"message": f"Successfully imported {added} students"}

@router.post("/students/generate-passwords")
def generate_passwords(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["student_id", "name", "password"])
    
    for student in students:
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(8))
        student.hashed_password = hash_password(password)
        writer.writerow([student.student_id, student.name, password])
        
    db.commit()
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=passwords.csv"}
    )

@router.post("/students/{student_id}/reset-password")
def reset_password(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    password = ''.join(secrets.choice(string.ascii_letters + string.digits) for i in range(8))
    student.hashed_password = hash_password(password)
    db.commit()
    return {"message": "Password reset successful", "new_password": password}

@router.get("/assignments", response_model=List[AssignmentOut])
def get_assignments(db: Session = Depends(get_db)):
    return db.query(Assignment).all()

@router.post("/assignments", response_model=AssignmentOut)
def create_assignment(assignment: AssignmentCreate, db: Session = Depends(get_db)):
    new_assignment = Assignment(**assignment.dict())
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.put("/assignments/{assignment_id}", response_model=AssignmentOut)
def update_assignment(assignment_id: int, assignment: AssignmentUpdate, db: Session = Depends(get_db)):
    db_assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    for key, value in assignment.dict(exclude_unset=True).items():
        setattr(db_assignment, key, value)
        
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    assignments = db.query(Assignment).all()
    
    result = []
    for student in students:
        row = {"student_id": student.student_id, "name": student.name, "submissions": {}}
        for assignment in assignments:
            sub = db.query(Submission).filter(
                Submission.student_id == student.id,
                Submission.assignment_id == assignment.id
            ).order_by(Submission.version_no.desc()).first()
            row["submissions"][assignment.id] = sub.version_no if sub else 0
        result.append(row)
    return result

@router.get("/assignments/{assignment_id}/submissions")
def get_submissions(assignment_id: int, db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    res = []
    for sub in subs:
        res.append({
            "id": sub.id,
            "student_id": sub.student.student_id,
            "version": sub.version_no,
            "time": sub.submitted_at
        })
    return res

@router.get("/assignments/{assignment_id}/download")
def download_submissions(assignment_id: int, mode: str = "latest", db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    from app.cos_utils import client as cos_client
    from app.config import settings
    import tempfile
    import os
    import zipfile
    from fastapi.responses import FileResponse
    from collections import defaultdict
    
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    subs = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    if not subs:
        raise HTTPException(status_code=404, detail="No submissions found to download")
        
    subs_to_download = []
    if mode == "latest":
        student_subs = {}
        for sub in subs:
            if sub.student_id not in student_subs or sub.version_no > student_subs[sub.student_id].version_no:
                student_subs[sub.student_id] = sub
        subs_to_download = list(student_subs.values())
        zip_filename = f"HW{assignment_id}_latest_only.zip"
    else:
        subs_to_download = subs
        zip_filename = f"HW{assignment_id}_all_versions.zip"
        
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for sub in subs_to_download:
            for file in sub.files:
                try:
                    response = cos_client.get_object(
                        Bucket=settings.COS_BUCKET,
                        Key=file.cos_key
                    )
                    file_bytes = response['Body'].get_raw_stream().read()
                    
                    student_prefix = f"{sub.student.student_id}_{sub.student.name}"
                    if mode == "all":
                        arcname = f"{student_prefix}/v{sub.version_no}/{file.filename}"
                    else:
                        arcname = f"{student_prefix}/{file.filename}"
                    
                    zf.writestr(arcname, file_bytes)
                except Exception as e:
                    print(f"Failed to download {file.cos_key} from COS: {e}")
                    
    temp_zip.close()
    
    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip.name)
        
    return FileResponse(temp_zip.name, media_type="application/zip", filename=zip_filename)

@router.get("/logs")
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return logs
