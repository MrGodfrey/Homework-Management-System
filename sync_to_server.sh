#!/usr/bin/env bash
# 将本地代码同步到腾讯云服务器（绕过 GitHub）
# 用法：./sync_to_server.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -d backend || ! -d frontend || ! -f sync_to_server.sh ]]; then
  echo "错误：未定位到项目根目录，已中止同步。"
  exit 1
fi

REMOTE="tencent-prod:/home/ubuntu/classroom/"
EXCLUDES=(
  ".git/"
  ".DS_Store"
  ".idea/"
  ".vscode/"
  ".tmp/"
  ".venv/"
  "venv/"
  "env/"
  "node_modules/"
  "dist/"
  "__pycache__/"
  ".pytest_cache/"
  "htmlcov/"
  "playwright-report/"
  "test-results/"
  ".coverage"
  ".env"
  ".env.local"
  "backend/.env"
  "backups/"
  "*.py[cod]"
  "*.log"
  "*.db"
  "*.sqlite3"
  "*.backup_*"
  "passwords.csv"
  "true_password.csv"
  "true_students.csv"
)

echo "开始同步代码到服务器：$REMOTE"
echo "同步源目录：$SCRIPT_DIR"

RSYNC_ARGS=(-avz --progress)

for exclude in "${EXCLUDES[@]}"; do
  RSYNC_ARGS+=(--exclude="$exclude")
done

# 生产同步默认不使用 --delete，避免误删服务器侧运行时文件。
rsync "${RSYNC_ARGS[@]}" ./ "$REMOTE"

echo "同步完成！"
