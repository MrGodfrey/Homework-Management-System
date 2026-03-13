from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

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

class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=False)
    allow_late = Column(Boolean, default=False)
    file_rules = Column(String, nullable=True) # e.g., allowed extensions
    created_at = Column(DateTime, default=datetime.utcnow)
    submissions = relationship("Submission", back_populates="assignment")
    attachment_files = relationship("AssignmentFile", back_populates="assignment", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    version_no = Column(Integer, nullable=False, default=1)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    score = Column(Float, nullable=True)  # 具体分数
    is_graded = Column(Boolean, default=False, nullable=False)  # 是否已批改
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")
    files = relationship("SubmissionFile", back_populates="submission")

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
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    assignment = relationship("Assignment", back_populates="attachment_files")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_type = Column(String, nullable=False) # 'instructor' or 'student'
    user_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
