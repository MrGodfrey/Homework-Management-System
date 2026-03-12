from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import decode_access_token
from app.models import Student, Instructor

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/student/login") # Will be overridden in logic anyway

def get_current_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    sub = payload.get("sub")
    role: str = payload.get("role")
    if sub is None or role is None:
        raise credentials_exception
    user_id: int = int(sub)

    return {"user_id": user_id, "role": role}

def get_current_student(token_data: dict = Depends(get_current_user_from_token), db: Session = Depends(get_db)):
    if token_data["role"] != "student":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    student = db.query(Student).filter(Student.id == token_data["user_id"]).first()
    if student is None:
        raise HTTPException(status_code=401, detail="User not found")
    return student

def get_current_instructor(token_data: dict = Depends(get_current_user_from_token), db: Session = Depends(get_db)):
    if token_data["role"] != "instructor":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    instructor = db.query(Instructor).filter(Instructor.id == token_data["user_id"]).first()
    if instructor is None:
        raise HTTPException(status_code=401, detail="User not found")
    return instructor
