from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Student, Instructor
from app.auth import verify_password, create_access_token
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])

class StudentLogin(BaseModel):
    student_id: str
    password: str

class InstructorLogin(BaseModel):
    username: str
    password: str

# In-memory dict and lockout tracker: student_id -> {"attempts": count, "locked_until": timestamp}
login_attempts = {}

@router.post("/student/login")
def login_student(data: StudentLogin, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # Check lock
    tracker = login_attempts.get(data.student_id, {"attempts": 0, "locked_until": None})
    if tracker["locked_until"] and now < tracker["locked_until"]:
        raise HTTPException(status_code=403, detail="Account locked due to too many failed attempts. Try again later.")

    # Reset attempts if lock expired
    if tracker["locked_until"] and now >= tracker["locked_until"]:
        tracker = {"attempts": 0, "locked_until": None}
        login_attempts[data.student_id] = tracker

    student = db.query(Student).filter(Student.student_id == data.student_id).first()
    
    if not student or not verify_password(data.password, student.hashed_password):
        tracker["attempts"] += 1
        if tracker["attempts"] >= 5:
            tracker["locked_until"] = now + timedelta(minutes=10)
            login_attempts[data.student_id] = tracker
            raise HTTPException(status_code=403, detail="Account locked due to too many failed attempts. Try again later.")
        login_attempts[data.student_id] = tracker
        raise HTTPException(status_code=401, detail="Incorrect credentials")

    # Reset tracker on success
    if data.student_id in login_attempts:
        del login_attempts[data.student_id]

    token = create_access_token({"sub": str(student.id)}, role="student")
    return {"access_token": token, "token_type": "bearer"}

@router.post("/instructor/login")
def login_instructor(data: InstructorLogin, db: Session = Depends(get_db)):
    instructor = db.query(Instructor).filter(Instructor.username == data.username).first()
    
    if not instructor or not verify_password(data.password, instructor.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token({"sub": str(instructor.id)}, role="instructor")
    return {"access_token": token, "token_type": "bearer"}
