#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -x "$ROOT/backend/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT/backend/.venv/bin/python"
else
  PYTHON_BIN="${PYTHON:-python3}"
fi

exec "$PYTHON_BIN" "$ROOT/scripts/start_e2e_backend.py"
