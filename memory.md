# Classroom Working Memory

Last updated: 2026-04-27

## 1. Repo Snapshot

This is a Vue 3 + Vite frontend with a FastAPI + SQLAlchemy backend for classroom assignment submission and grading. Runtime-critical directories are:

- `frontend/`: SPA, routes, auth store, axios client, student/admin views.
- `backend/`: API, models, auth, COS integration, Alembic files, DB helper scripts.
- root scripts: `start_local_test.py`, `switch_env.sh`, `sync_to_server.sh`, `deploy.sh`.
- docs/history: `README.md`, `使用说明.md`, `srever.md`, `ai/`, `havetoseeForAI/`, `MYSELFTEST.md`.

The `ai/` and `havetoseeForAI/` trees are historical design/deployment notes. They are useful for context, but they are not runtime entrypoints.

## 2. Runtime Architecture

### Frontend

- Framework: Vue 3
- Bundler/dev server: Vite
- UI: Element Plus
- Router: `frontend/src/router/index.js`
- API client: `frontend/src/utils/api.js`
- Auth state: `frontend/src/stores/auth.js`

### Backend

- Framework: FastAPI
- ORM: SQLAlchemy 2.x
- Auth: JWT + bcrypt/passlib
- File storage: Tencent COS via `backend/app/cos_utils.py`
- API entrypoint: `backend/app/main.py`
- Student endpoints: `backend/app/routers/student.py`
- Admin endpoints: `backend/app/routers/admin.py`
- Auth endpoints: `backend/app/routers/auth.py`

### Database

- Code default: SQLite at `backend/classroom.db` via `sqlite:///./classroom.db`
- Docs mention PostgreSQL as the recommended production engine, but the checked-in deployment scripts and rollback docs are SQLite-oriented.
- Current actual operational assumption from scripts/docs: production still centers on a SQLite file under `backend/`.
- Important nuance: because `DATABASE_URL` is relative, the actual SQLite file depends on process working directory. The production/local backend processes are started from `backend/`, so the intended live file is `backend/classroom.db`. Running ad hoc scripts from repo root can accidentally create a second DB at `./classroom.db` if they do not `chdir` first.

## 3. Production Topology In Repo

Most concrete production facts come from `sync_to_server.sh`, `deploy.sh`, `使用说明.md`, `srever.md`, and `ai/阶段 6 在服务器上操作.md`.

### Canonical current deployment facts

- Host alias: `tencent-prod`
- Public IP: `162.14.78.163`
- Server type: Tencent Cloud CVM
- Expected OS: Ubuntu
- Project directory: `/home/ubuntu/classroom`
- Backend service name: `classroom-backend`
- Backend bind target behind reverse proxy: FastAPI/Uvicorn on `127.0.0.1:8000`
- Frontend static files deployed to: `/var/www/classroom`
- Web server: Nginx

### Important legacy/alternate paths found in docs

Some older docs still reference:

- `/home/ubuntu/app`
- systemd service name `app`
- frontend served directly from `/home/ubuntu/app/frontend/dist`

Those look historical. Current root scripts (`sync_to_server.sh`, `deploy.sh`) point to `/home/ubuntu/classroom` and `classroom-backend`. Treat those as the current source of truth unless the user says production was changed.

### Production config drift noted on 2026-04-27

Docs say Nginx should set `client_max_body_size 50M`, matching the app's default submission limit. Actual production `/etc/nginx/sites-available/classroom` was missing that directive, so multi-file uploads over Nginx's default 1MB failed with HTTP 413 before reaching FastAPI. The live config was backed up to `/etc/nginx/sites-available/classroom.backup_20260427_211105`, updated with `client_max_body_size 50M;`, validated with `nginx -t`, and reloaded. `deploy.sh` now includes a 2MB upload-size smoke probe to catch this drift.

## 4. Deployment Paths In Repo

### Preferred scripted path

1. Full deploy from local machine: `./deploy.sh`
   - runs a remote preflight on `tencent-prod`
   - confirms remote `ENV=PROD` and the effective `DATABASE_URL`
   - backs up `/home/ubuntu/classroom/backend/classroom.db`
   - verifies the backup file exists
   - rsyncs repo contents to `tencent-prod:/home/ubuntu/classroom/`
   - runs remote backend install + Alembic upgrade + `sudo systemctl restart classroom-backend`
   - runs remote frontend build and publishes to `/var/www/classroom`
   - runs remote smoke checks against backend root, frontend root, admin login page, and invalid-login probe
2. Sync only: `./sync_to_server.sh`
   - thin wrapper around `./deploy.sh --sync-only`
   - uses the same rsync excludes as full deploy

### Safety status

The old safety gap in `deploy.sh` was closed on 2026-04-18:

- backup now happens before sync and migration
- backup verification is explicit
- deploy order now matches the repo rule: backup -> verify backup -> sync -> install deps -> migrate -> restart -> smoke test

## 5. Database Safety Model

### Existing protection already in repo

- `.gitignore` excludes `*.db` and `*.sqlite3`
- `sync_to_server.sh` excludes the production DB and backup DB files
- `backend/backup_database.py` creates timestamped DB copies in `backend/backups/`
- `backend/DATABASE_MIGRATION.md` and `backend/README.md` document backup + restore workflows

### Restore path currently documented

For SQLite rollback, docs consistently use:

```bash
cp backups/<backup-file>.db ./classroom.db
```

For full deploy rollback, `使用说明.md` also documents:

- stop backend service
- reset code to last known good revision
- restore `classroom.db`
- restore `.env`
- reinstall dependencies
- restart backend

### Safe production update sequence

Use this order unless a future verified process replaces it:

1. SSH to server
2. `cd /home/ubuntu/classroom/backend`
3. `python backup_database.py` or manual `cp classroom.db classroom.db.backup_<timestamp>`
4. Verify backup file exists
5. Sync/pull code
6. Install backend deps
7. Review Alembic history/current
8. Run migration
9. Restart `classroom-backend`
10. Rebuild frontend and publish to `/var/www/classroom`
11. Smoke test login/API/basic pages

### Fast rollback checklist

1. Stop backend: `sudo systemctl stop classroom-backend`
2. Restore DB from the last verified backup
3. Restore `.env` if config changed
4. Reset code to last known good revision
5. Restart backend
6. Re-test admin login, student login, assignment list

## 6. Alembic Reality Check

The migration chain is not a clean greenfield migration history.

Observed facts:

- `1778070f9adb_initial_baseline_migration.py` is a no-op baseline.
- Later migrations assume tables already exist.
- `backend/app/main.py` calls `Base.metadata.create_all(bind=engine)` on startup.
- `backend/create_admin.py` also calls `Base.metadata.create_all(bind=engine)`.
- `backend/init_database.py` creates tables with ORM and then runs `alembic stamp head`.

Conclusion:

- Fresh local DB bootstrap is currently ORM-first, not Alembic-first.
- `alembic upgrade head` is not safe to assume on an empty database.
- For production, treat Alembic as an incremental migration tool for an already-existing schema and always test on a copied DB first.

## 7. Local Preview Workflow

### Current local startup path

- `python start_local_test.py`

What it does:

1. creates `backend/.venv` if needed
2. installs backend requirements
3. checks for `backend/classroom.db`
4. if DB is missing, runs `backend/create_admin.py`
5. starts FastAPI on a free `127.0.0.1` port
6. installs frontend deps if needed
7. starts Vite on a free `127.0.0.1` port
8. passes dynamic backend port to frontend via `VITE_API_URL`

### Local preview data

Local preview should stay on `ENV=DEV`.

Seed strategy for local work:

- local admin account
- test students from `student.csv`
- no production DB copy

Tracked helper added for this workflow:

- `backend/seed_local_preview.py`

Default local credentials it creates:

- admin username: `local_admin`
- admin password: `LocalAdmin123!`

Default students come from `student.csv` and use:

- password = student ID

Current sample students in repo:

- `2022113851 / 张三`
- `2023113827 / 李四`
- `2023113828 / 王五`

Credential source conflict noted on 2026-04-18:

- `backend/seed_local_preview.py` defaults to `local_admin / LocalAdmin123!`
- `scripts/seed_e2e_data.py` seeds `teacher / teacher-pass`
- current live local DB file `backend/classroom.db` actually contains instructor username `admin`
- current live local DB also stores student plaintext passwords in `students.plain_password`, so current student test logins should be read from the DB, not inferred from seed docs

### Local preview limitation

The app still expects Tencent COS for real file upload/download flows. Without valid COS config, login/list/dashboard/student-management preview works, but upload/download endpoints are not guaranteed to work end to end.

If future tasks require full local upload preview, add a DEV-only storage fallback rather than touching production storage behavior.

## 8. Security Findings To Keep In Mind

These are important and should influence every future change:

1. `backend/app/main.py` uses `allow_origins=["*"]` together with `allow_credentials=True`. That is not a good production CORS posture.
2. Student plaintext passwords are stored in `students.plain_password` and exposed in admin APIs/UI. This is a real security tradeoff, not just a cosmetic issue.
3. Default `SECRET_KEY` is hardcoded in `backend/app/config.py`. Missing `.env` means the app can run with an unsafe default.
4. Student login lockout is in-memory only (`backend/app/routers/auth.py`), so it resets on process restart and does not scale across workers.
5. Admin attachment uploads are not ENV-prefixed like student submissions. Current key pattern is `assignments/{assignment_id}/attachments/{timestamp}_{filename}`.
6. `Base.metadata.create_all()` at app startup weakens migration discipline and can hide schema drift.

These are not all fixed yet. Do not forget them during future optimization work.

## 9. File Inventory Notes

### Root

- `README.md`: high-level product + setup
- `使用说明.md`: most complete mixed user/dev/deploy guide
- `srever.md`: SSH and server-access setup
- `start_local_test.py`: local dev entrypoint
- `switch_env.sh`: toggles `ENV` inside `backend/.env`
- `sync_to_server.sh`: sync-only wrapper around `deploy.sh --sync-only`
- `deploy.sh`: canonical local one-command production deploy entrypoint
- `student.csv`: sample student seed data
- `MYSELFTEST.md`: local test rationale/history

### Backend

- `app/`: runtime code
- `alembic/versions/`: migration history
- `backup_database.py`: DB backup helper
- `create_admin.py`: manual admin bootstrap
- `init_database.py`: destructive re-init helper, not for casual use
- `verify_stage5.py`: mostly historical validation script
- `tests.py`: placeholder tests, not a real regression suite yet

### Frontend

- `src/views/student/*.vue`: student login/list/detail/history
- `src/views/admin/*.vue`: admin login/dashboard/student management/assignment management/submission detail
- `src/router/index.js`: role-based route guard
- `src/utils/api.js`: axios auth injection and 401 redirect
- `tests/api.spec.js`: minimal interceptor test only

## 10. Working Rules For Future Tasks

1. Any DB schema change needs:
   - local reproduction
   - backup plan
   - rollback note
   - migration review against copied data
2. Any deploy-script change must preserve DB and `.env`.
3. Any preview/test setup must stay isolated from production COS paths and production DB files.
4. Prefer updating this file whenever a new server path, service name, restore command, or local preview fact is confirmed.
