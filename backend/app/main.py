from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Classroom API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import auth, student, admin, storage
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(admin.router)
app.include_router(storage.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Classroom API"}
