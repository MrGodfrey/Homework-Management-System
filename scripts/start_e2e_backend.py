#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
RUNTIME_DIR = ROOT / ".tmp" / "e2e"
DB_PATH = RUNTIME_DIR / "classroom_e2e.db"
STORAGE_DIR = RUNTIME_DIR / "storage"
BACKEND_PORT = "18000"


def build_env() -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "ENV": "DEV",
            "DATABASE_URL": f"sqlite:///{DB_PATH}",
            "LOCAL_STORAGE_DIR": str(STORAGE_DIR),
            "PUBLIC_BASE_URL": f"http://127.0.0.1:{BACKEND_PORT}",
            "SECRET_KEY": "e2e-secret-key",
            "COS_SECRET_ID": "dummy",
            "COS_SECRET_KEY": "dummy",
            "COS_REGION": "ap-guangzhou",
            "COS_BUCKET": "classroom-e2e",
            "PYTHONPATH": str(BACKEND),
        }
    )
    return env


def reset_runtime_dir() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()
    if STORAGE_DIR.exists():
        shutil.rmtree(STORAGE_DIR)
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    env = build_env()
    reset_runtime_dir()

    seed_script = ROOT / "scripts" / "seed_e2e_data.py"
    subprocess.run([sys.executable, str(seed_script)], check=True, cwd=str(ROOT), env=env)

    os.chdir(BACKEND)
    os.execvpe(
        sys.executable,
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            BACKEND_PORT,
        ],
        env,
    )


if __name__ == "__main__":
    main()
