#!/usr/bin/env bash
# 一键发布到腾讯云服务器：
# 1) 远端预检并备份数据库
# 2) 本地 rsync 同步代码
# 3) 远端安装依赖、迁移、重启、前端构建发布
# 4) 远端冒烟测试
#
# 默认用法（在本地项目根目录执行）：
#   ./deploy.sh
#
# 仅同步代码：
#   ./deploy.sh --sync-only
#
# 远端执行阶段（内部使用，不需要手动调用）：
#   ./deploy.sh --remote-phase

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

REMOTE_ALIAS="${REMOTE_ALIAS:-tencent-prod}"
REMOTE_PUBLIC_URL="${REMOTE_PUBLIC_URL:-http://162.14.78.163}"
PROJECT_DIR="${PROJECT_DIR:-/home/ubuntu/classroom}"
BACKEND_DIR="${BACKEND_DIR:-$PROJECT_DIR/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$PROJECT_DIR/frontend}"
BACKEND_SERVICE="${BACKEND_SERVICE:-classroom-backend}"
FRONTEND_PUBLISH_DIR="${FRONTEND_PUBLISH_DIR:-/var/www/classroom}"

MODE="full"

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

usage() {
  cat <<EOF
用法：
  ./deploy.sh                本地一键发布到 ${REMOTE_ALIAS}
  ./deploy.sh --sync-only    仅同步代码到服务器
  ./deploy.sh --remote-phase 远端部署阶段（内部使用）
EOF
}

log_step() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$1"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少命令：$1"
    exit 1
  fi
}

ensure_project_root() {
  if [[ ! -d backend || ! -d frontend || ! -f deploy.sh ]]; then
    echo "错误：未定位到项目根目录，已中止。"
    exit 1
  fi
}

build_rsync_args() {
  RSYNC_ARGS=(-avz --progress)
  for exclude in "${EXCLUDES[@]}"; do
    RSYNC_ARGS+=(--exclude="$exclude")
  done
}

run_sync() {
  log_step "同步代码到服务器"
  build_rsync_args
  echo "目标：${REMOTE_ALIAS}:${PROJECT_DIR}/"
  echo "源目录：$SCRIPT_DIR"
  rsync "${RSYNC_ARGS[@]}" ./ "${REMOTE_ALIAS}:${PROJECT_DIR}/"
}

run_remote_preflight_and_backup() {
  log_step "远端预检并备份数据库"
  ssh "$REMOTE_ALIAS" 'bash -s' -- \
    "$PROJECT_DIR" \
    "$BACKEND_DIR" \
    "$FRONTEND_DIR" \
    "$BACKEND_SERVICE" \
    "$FRONTEND_PUBLISH_DIR" <<'REMOTE'
set -euo pipefail

PROJECT_DIR="$1"
BACKEND_DIR="$2"
FRONTEND_DIR="$3"
BACKEND_SERVICE="$4"
FRONTEND_PUBLISH_DIR="$5"

cd "$BACKEND_DIR"

if [[ ! -d venv ]]; then
  echo "错误：远端后端虚拟环境不存在：$BACKEND_DIR/venv"
  exit 1
fi

if [[ ! -f classroom.db ]]; then
  echo "错误：远端数据库不存在：$BACKEND_DIR/classroom.db"
  exit 1
fi

if ! sudo -n true >/dev/null 2>&1; then
  echo "错误：当前服务器未配置 sudo 免密，deploy.sh 无法非交互执行。"
  exit 1
fi

. venv/bin/activate

readarray -t SETTINGS_INFO < <(python - <<'PY'
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd()))
from app.config import settings
print(settings.ENV)
print(settings.DATABASE_URL)
PY
)

ENV_VALUE="${SETTINGS_INFO[0]}"
DATABASE_URL="${SETTINGS_INFO[1]}"

if [[ "$ENV_VALUE" != "PROD" ]]; then
  echo "错误：远端 ENV=$ENV_VALUE，不是 PROD，已中止。"
  exit 1
fi

mkdir -p backups
backup_timestamp="$(date +%Y%m%d_%H%M%S)"
backup_path="backups/classroom_backup_${backup_timestamp}.db"
cp classroom.db "$backup_path"

if [[ ! -f "$backup_path" ]]; then
  echo "错误：数据库备份失败，未生成 $BACKEND_DIR/$backup_path"
  exit 1
fi

echo "数据库引擎/路径：$DATABASE_URL"
echo "数据库实际文件：$BACKEND_DIR/classroom.db"
echo "备份文件：$BACKEND_DIR/$backup_path"
echo "恢复命令：cd $BACKEND_DIR && cp $backup_path ./classroom.db"
echo "迁移命令：cd $BACKEND_DIR && . venv/bin/activate && alembic upgrade head"
echo "回滚命令：cd $BACKEND_DIR && . venv/bin/activate && alembic downgrade -1"
echo "服务名称：$BACKEND_SERVICE"
echo "前端发布目录：$FRONTEND_PUBLISH_DIR"
REMOTE
}

run_remote_phase_via_ssh() {
  log_step "远端安装依赖、迁移、重启、构建和冒烟"
  ssh "$REMOTE_ALIAS" \
    "PROJECT_DIR='$PROJECT_DIR' BACKEND_DIR='$BACKEND_DIR' FRONTEND_DIR='$FRONTEND_DIR' BACKEND_SERVICE='$BACKEND_SERVICE' FRONTEND_PUBLISH_DIR='$FRONTEND_PUBLISH_DIR' REMOTE_PUBLIC_URL='$REMOTE_PUBLIC_URL' bash '$PROJECT_DIR/deploy.sh' --remote-phase"
}

smoke_test_remote() {
  log_step "远端冒烟测试"

  local backend_root_code
  local front_root_code
  local admin_login_code
  local api_probe_code
  local api_probe_body
  local upload_probe_code
  local upload_probe_body
  local upload_probe_payload

  backend_root_code="$(curl -sS -o /tmp/classroom_backend_root.out -w '%{http_code}' http://127.0.0.1:8000/)"
  if [[ "$backend_root_code" != "200" ]]; then
    echo "错误：后端根路径健康检查失败，HTTP $backend_root_code"
    cat /tmp/classroom_backend_root.out || true
    exit 1
  fi

  front_root_code="$(curl -sS -o /tmp/classroom_front_root.out -w '%{http_code}' http://127.0.0.1/)"
  if [[ "$front_root_code" != "200" ]]; then
    echo "错误：前端首页健康检查失败，HTTP $front_root_code"
    cat /tmp/classroom_front_root.out || true
    exit 1
  fi

  admin_login_code="$(curl -sS -o /tmp/classroom_admin_login.out -w '%{http_code}' http://127.0.0.1/admin/login)"
  if [[ "$admin_login_code" != "200" ]]; then
    echo "错误：教师登录页健康检查失败，HTTP $admin_login_code"
    cat /tmp/classroom_admin_login.out || true
    exit 1
  fi

  api_probe_body="$(mktemp)"
  api_probe_code="$(curl -sS -o "$api_probe_body" -w '%{http_code}' \
    http://127.0.0.1/api/auth/instructor/login \
    -X POST \
    -H 'Content-Type: application/json' \
    -d '{"username":"__deploy_probe__","password":"__deploy_probe__"}')"

  if [[ "$api_probe_code" != "401" ]]; then
    echo "错误：登录探测接口返回异常，期望 401，实际 $api_probe_code"
    cat "$api_probe_body" || true
    rm -f "$api_probe_body"
    exit 1
  fi

  rm -f "$api_probe_body"

  upload_probe_payload="$(mktemp)"
  upload_probe_body="$(mktemp)"
  dd if=/dev/zero of="$upload_probe_payload" bs=1M count=2 status=none
  upload_probe_code="$(curl -sS -o "$upload_probe_body" -w '%{http_code}' \
    http://127.0.0.1/api/assignments/1/submit \
    -X POST \
    --data-binary @"$upload_probe_payload" || true)"
  rm -f "$upload_probe_payload"

  if [[ "$upload_probe_code" == "413" ]]; then
    echo "错误：上传探测被 Nginx 拒绝，HTTP 413。请确认站点配置包含 client_max_body_size 50M。"
    cat "$upload_probe_body" || true
    rm -f "$upload_probe_body"
    exit 1
  fi

  rm -f "$upload_probe_body"
  echo "冒烟测试通过：后端 200，前端 200，登录探测 401，2MB 上传探测未被 413 拒绝"
}

remote_phase_main() {
  ensure_project_root
  require_cmd sudo
  require_cmd curl
  require_cmd npm

  log_step "远端后端部署"
  cd "$BACKEND_DIR"

  if [[ ! -d venv ]]; then
    echo "错误：远端后端虚拟环境不存在：$BACKEND_DIR/venv"
    exit 1
  fi

  . venv/bin/activate

  echo "当前 Alembic 版本："
  alembic current

  pip install -r requirements.txt -q
  alembic upgrade head

  echo "迁移后 Alembic 版本："
  alembic current

  sudo systemctl restart "$BACKEND_SERVICE"
  if [[ "$(sudo systemctl is-active "$BACKEND_SERVICE")" != "active" ]]; then
    echo "错误：服务重启后不是 active：$BACKEND_SERVICE"
    exit 1
  fi

  log_step "远端前端构建与发布"
  cd "$FRONTEND_DIR"
  npm install --silent
  npm run build
  sudo mkdir -p "$FRONTEND_PUBLISH_DIR"
  sudo cp -r dist/* "$FRONTEND_PUBLISH_DIR/"

  smoke_test_remote

  log_step "部署完成"
  echo "公网地址：$REMOTE_PUBLIC_URL"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --sync-only)
        MODE="sync-only"
        ;;
      --remote-phase)
        MODE="remote-phase"
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        echo "未知参数：$1"
        usage
        exit 1
        ;;
    esac
    shift
  done
}

main() {
  parse_args "$@"
  ensure_project_root

  case "$MODE" in
    remote-phase)
      remote_phase_main
      ;;
    sync-only)
      require_cmd rsync
      require_cmd ssh
      run_sync
      ;;
    full)
      require_cmd rsync
      require_cmd ssh
      run_remote_preflight_and_backup
      run_sync
      run_remote_phase_via_ssh
      ;;
  esac
}

main "$@"
