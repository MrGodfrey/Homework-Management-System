#!/usr/bin/env python3
"""
Automate local test environment for this project.

Features:
- Create backend venv and install requirements
- Detect or prompt to create SQLite DB / super-admin via create_admin.py
- Start backend (uvicorn) on an available port
- Install frontend deps (if needed) and start Vite dev server on an available port
- Print accessible URLs and PIDs and log file locations

Usage: python start_local_test.py
"""
import os
import sys
import socket
import subprocess
import time
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"

def find_free_port(start=8000, host="127.0.0.1"):
    port = start
    while True:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, port))
                return port
            except OSError:
                port += 1

def ensure_venv(venv_dir: Path):
    py = venv_dir / "bin" / "python"
    if not venv_dir.exists():
        print(f"Creating venv at {venv_dir}...")
        venv.create(venv_dir, with_pip=True)
    return str(py)

def pip_install(py_exe: str, requirements: str, cwd: Path):
    print("Installing backend Python dependencies (this may take a while)...")
    subprocess.check_call([py_exe, "-m", "pip", "install", "-r", requirements], cwd=str(cwd))

def get_db_path(backend_dir: Path):
    # Check environment variable
    env_db = os.environ.get("DATABASE_URL")
    if env_db and env_db.startswith("sqlite"):
        if env_db.startswith("sqlite:///"):
            p = env_db.replace("sqlite:///", "")
            return backend_dir / p
    # Check .env file
    env_file = backend_dir / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.strip().startswith("DATABASE_URL"):
                _, val = line.split("=", 1)
                val = val.strip().strip('"').strip("'")
                if val.startswith("sqlite:///"):
                    return backend_dir / val.replace("sqlite:///", "")
    # default fallback
    return backend_dir / "classroom.db"

def run_create_admin(py_exe: str, backend_dir: Path):
    print("Database not found. Running create_admin.py to create DB and admin user.")
    print("Follow the prompts to enter admin username and password.")
    subprocess.check_call([py_exe, "create_admin.py"], cwd=str(backend_dir))

def start_backend(py_exe: str, port: int, backend_dir: Path, logpath: Path):
    cmd = [py_exe, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", str(port)]
    f = open(logpath, "a")
    print(f"Starting backend on port {port} (logs -> {logpath})")
    p = subprocess.Popen(cmd, cwd=str(backend_dir), stdout=f, stderr=subprocess.STDOUT)
    return p

def ensure_node_deps(frontend_dir: Path):
    nm = frontend_dir / "node_modules"
    if not nm.exists():
        print("Installing frontend npm dependencies...")
        subprocess.check_call(["npm", "install"], cwd=str(frontend_dir))

def start_frontend(port: int, backend_port: int, frontend_dir: Path, logpath: Path):
    cmd = ["npm", "run", "dev", "--", "--port", str(port), "--host", "127.0.0.1", "--strictPort"]
    env = os.environ.copy()
    env["VITE_API_URL"] = f"http://127.0.0.1:{backend_port}"
    f = open(logpath, "a")
    print(f"Starting frontend on port {port} (logs -> {logpath})")
    p = subprocess.Popen(cmd, cwd=str(frontend_dir), stdout=f, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, env=env)
    return p

def wait_for_port(port, host="127.0.0.1", timeout=10.0):
    start = time.time()
    while time.time() - start < timeout:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.connect((host, port))
                return True
            except Exception:
                time.sleep(0.5)
    return False

def main():
    # Backend venv and requirements
    venv_dir = BACKEND / ".venv"
    py = ensure_venv(venv_dir)
    req = BACKEND / "requirements.txt"
    if req.exists():
        pip_install(py, str(req), BACKEND)

    dbpath = get_db_path(BACKEND)
    if not dbpath.exists():
        run_create_admin(py, BACKEND)
    else:
        print(f"Found DB at {dbpath}")

    # Start backend
    backend_port = find_free_port(8000)
    backend_log = ROOT / "backend_dev.log"
    backend_proc = start_backend(py, backend_port, BACKEND, backend_log)
    if not wait_for_port(backend_port, timeout=8.0):
        print("Warning: backend did not respond quickly; check logs.")

    # Start frontend
    ensure_node_deps(FRONTEND)
    frontend_port = find_free_port(5173)
    frontend_log = ROOT / "frontend_dev.log"
    frontend_proc = start_frontend(frontend_port, backend_port, FRONTEND, frontend_log)
    if not wait_for_port(frontend_port, timeout=10.0):
        print("Warning: frontend did not respond quickly; check logs.")

    print("")
    print("Local test environment started:")
    print(f"- Backend: http://127.0.0.1:{backend_port} (docs: /docs)")
    print(f"- Frontend: http://127.0.0.1:{frontend_port}")
    print("")
    print("Press Ctrl+C to stop all services.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        print("All services stopped.")

if __name__ == '__main__':
    main()
