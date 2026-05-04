# Classroom Agent Rules

1. Treat this repository as mapped to a live production system. Do not run destructive production operations unless the user explicitly asks.
2. Production target currently documented in-repo:
   - host alias: `<ssh-host-alias>`
   - server IP: `<server-ip-or-domain>`
   - app root: `<project-dir>`
   - backend service: `<backend-service-name>`
   - frontend publish dir: `<frontend-publish-dir>`
3. Before any database-affecting change, confirm:
   - current DB engine/path
   - backup location and restore command
   - migration path and rollback path
4. Deployment order must stay: backup DB -> verify backup exists -> sync code -> install deps -> migrate -> restart -> smoke test.
5. Never sync or commit `backend/.env`, `*.db`, backup files, or exported password CSVs.
6. Default to `ENV=DEV` locally. Do not flip to `ENV=PROD` casually during local work.
7. Prefer additive/local-only setup for preview data. Do not touch production data for testing.
8. When repo docs disagree, do not guess. Record the conflict in `memory.md` and use the most concrete source (scripts over prose, current paths over legacy paths).
