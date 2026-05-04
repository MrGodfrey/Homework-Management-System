from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
from app.database import Base

_beijing_tz = timezone(timedelta(hours=8))

def beijing_now():
    return datetime.now(_beijing_tz).replace(tzinfo=None)

class Instructor(Base):
    __tablename__ = "instructors"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    plain_password = Column(String, nullable=True)  # 明文密码，用于管理员查看
    submissions = relationship("Submission", back_populates="student")
    interactions = relationship("Interaction", back_populates="student", cascade="all, delete-orphan")

class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=False)
    allow_late = Column(Boolean, default=False)
    file_rules = Column(String, nullable=True) # e.g., allowed extensions
    ai_grading_rubric = Column(Text, nullable=True)
    created_at = Column(DateTime, default=beijing_now)
    submissions = relationship("Submission", back_populates="assignment")
    attachment_files = relationship("AssignmentFile", back_populates="assignment", cascade="all, delete-orphan")
    ai_grading_jobs = relationship("AIGradingJob", back_populates="assignment", cascade="all, delete-orphan")
    ai_grading_results = relationship("AIGradingResult", back_populates="assignment", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    version_no = Column(Integer, nullable=False, default=1)
    submitted_at = Column(DateTime, default=beijing_now)
    score = Column(Float, nullable=True)  # 具体分数
    is_graded = Column(Boolean, default=False, nullable=False)  # 是否已批改
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")
    files = relationship("SubmissionFile", back_populates="submission")
    ai_grading_jobs = relationship("AIGradingJob", back_populates="submission", cascade="all, delete-orphan")
    ai_grading_results = relationship("AIGradingResult", back_populates="submission", cascade="all, delete-orphan")

class SubmissionFile(Base):
    __tablename__ = "submission_files"
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    filename = Column(String, nullable=False)
    cos_key = Column(String, nullable=False)
    submission = relationship("Submission", back_populates="files")

class AssignmentFile(Base):
    __tablename__ = "assignment_files"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    filename = Column(String, nullable=False)
    cos_key = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=beijing_now)
    assignment = relationship("Assignment", back_populates="attachment_files")

class Interaction(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    created_at = Column(DateTime, default=beijing_now)
    note = Column(Text, nullable=True)
    student = relationship("Student", back_populates="interactions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(String, nullable=False) # 'instructor' or 'student'
    user_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=beijing_now)

class AIGradingJob(Base):
    __tablename__ = "ai_grading_jobs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String, unique=True, index=True, nullable=False)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    status = Column(String, nullable=False, default="queued")
    provider = Column(String, nullable=False, default="tencent_maas_tokenhub")
    model = Column(String, nullable=False, default="deepseek-v4-flash")
    trigger_type = Column(String, nullable=False, default="single")
    triggered_by_instructor_id = Column(Integer, ForeignKey("instructors.id"), nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=beijing_now)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    assignment = relationship("Assignment", back_populates="ai_grading_jobs")
    submission = relationship("Submission", back_populates="ai_grading_jobs")

class AIGradingResult(Base):
    __tablename__ = "ai_grading_results"
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    job_id = Column(String, nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    version_no = Column(Integer, nullable=False)
    model = Column(String, nullable=False)
    rubric_snapshot = Column(Text, nullable=True)
    file_manifest_json = Column(Text, nullable=True)
    extracted_summary = Column(Text, nullable=True)
    ai_score = Column(Float, nullable=True)
    confidence = Column(String, nullable=True)
    report_json = Column(Text, nullable=True)
    report_text = Column(Text, nullable=True)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=beijing_now)
    is_latest = Column(Boolean, default=True, nullable=False)

    assignment = relationship("Assignment", back_populates="ai_grading_results")
    submission = relationship("Submission", back_populates="ai_grading_results")
