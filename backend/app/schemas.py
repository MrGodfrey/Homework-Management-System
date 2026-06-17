from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class StudentBase(BaseModel):
    student_id: str
    name: str

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    student_id: Optional[str] = None
    name: Optional[str] = None

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: datetime
    allow_late: bool = False
    file_rules: Optional[str] = None
    ai_grading_rubric: Optional[str] = None

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

class AssignmentFileOut(BaseModel):
    id: int
    filename: str
    cos_key: str
    uploaded_at: datetime
    class Config:
        from_attributes = True

class AssignmentOutWithFiles(AssignmentOut):
    attachment_files: List['AssignmentFileOut'] = []
    class Config:
        from_attributes = True

class GradeSubmission(BaseModel):
    score: Optional[float] = None
    teacher_comment: Optional[str] = None

class AssignmentAISettings(BaseModel):
    ai_grading_rubric: Optional[str] = None

class AIReviewRequest(BaseModel):
    force: bool = False

class BatchAIReviewRequest(BaseModel):
    scope: str = "latest_unreviewed_per_student"
    selected_submission_ids: Optional[List[int]] = None

class InteractionCreate(BaseModel):
    note: Optional[str] = None

class InteractionOut(BaseModel):
    id: int
    student_id: int
    created_at: datetime
    note: Optional[str] = None
    class Config:
        from_attributes = True
