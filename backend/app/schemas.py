from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class StudentBase(BaseModel):
    student_id: str
    name: str

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    allow_late: bool = False
    file_rules: Optional[str] = None

from typing import List

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentUpdate(AssignmentBase):
    pass

class StudentOut(StudentBase):
    id: int
    password: Optional[str] = None  # 明文密码
    class Config:
        from_attributes = True

class AssignmentOut(AssignmentBase):
    id: int
    created_at: datetime
    submitted_count: Optional[int] = 0  # 已提交人数
    graded_count: Optional[int] = 0  # 已评分人数
    class Config:
        from_attributes = True

class StudentMeOut(BaseModel):
    student_id: str
    name: str
    class Config:
        from_attributes = True

class GradeSubmission(BaseModel):
    score: Optional[float] = None

