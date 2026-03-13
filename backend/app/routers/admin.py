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
from app.schemas import StudentOut, AssignmentCreate, AssignmentUpdate, AssignmentOut, GradeSubmission
from app.dependencies import get_current_instructor
from app.auth import hash_password
from app.cos_utils import client as cos_client, generate_presigned_url
from app.config import settings

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
    output.write('\ufeff')  # UTF-8 BOM for Excel
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
            "student_name": sub.student.name,
            "version": sub.version_no,
            "time": sub.submitted_at,
            "score": sub.score,
            "is_graded": sub.is_graded
        })
    return res

@router.get("/assignments/{assignment_id}/submissions/{student_no}/download")
def download_single_student_submission(assignment_id: int, student_no: str, db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    """GET /assignments/{id}/submissions/{student_no}/download - 下载单个学生的作业"""
    import tempfile
    import os
    from fastapi.responses import FileResponse
    
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # 根据学号找学生
    student = db.query(Student).filter(Student.student_id == student_no).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # 找该学生的最新提交
    latest_sub = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.student_id == student.id
    ).order_by(Submission.version_no.desc()).first()
    
    if not latest_sub or not latest_sub.files:
        raise HTTPException(status_code=404, detail="No submission found for this student")
    
    # 创建 ZIP 文件
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    with zipfile.ZipFile(temp_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for file in latest_sub.files:
            try:
                response = cos_client.get_object(
                    Bucket=settings.COS_BUCKET,
                    Key=file.cos_key
                )
                file_bytes = response['Body'].get_raw_stream().read()
                zf.writestr(file.filename, file_bytes)
            except Exception as e:
                print(f"Failed to download {file.cos_key} from COS: {e}")
    
    temp_zip.close()
    zip_filename = f"HW{assignment_id}_{student_no}_{student.name}.zip"
    
    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip.name)
    
    return FileResponse(temp_zip.name, media_type="application/zip", filename=zip_filename)

@router.get("/assignments/{assignment_id}/download")
def download_submissions(assignment_id: int, mode: str = "latest", db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    import tempfile
    import os
    from fastapi.responses import FileResponse
    
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
def grade_submission(sub_id: int, grade_data: GradeSubmission, db: Session = Depends(get_db)):
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
    
    # 构建表头：学号、姓名 + 各个作业标题
    header = ["学号", "姓名"]
    for assignment in assignments:
        header.append(assignment.title)
    writer.writerow(header)
    
    # 为每个学生构建一行数据
    for student in students:
        row = [student.student_id, student.name]
        
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
