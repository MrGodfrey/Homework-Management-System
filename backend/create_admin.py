import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Instructor
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    username = input("Enter admin username: ")
    password = input("Enter admin password: ")
    
    existing = db.query(Instructor).filter(Instructor.username == username).first()
    if existing:
        print("Admin user already exists.")
        return
        
    hashed_password = pwd_context.hash(password)
    admin = Instructor(username=username, hashed_password=hashed_password)
    db.add(admin)
    db.commit()
    print(f"Admin user '{username}' created successfully.")

if __name__ == "__main__":
    main()
