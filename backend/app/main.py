from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.logging_config import configure_logging
from app.middleware import RequestLoggingMiddleware

configure_logging()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Classroom API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)

from app.routers import auth, student, admin, storage, settings
app.include_router(auth.router)
app.include_router(student.router)
app.include_router(admin.router)
app.include_router(storage.router)
app.include_router(settings.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Classroom API"}
