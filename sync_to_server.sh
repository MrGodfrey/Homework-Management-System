#!/bin/bash
# 将本地代码同步到腾讯云服务器（绕过 GitHub）
# 用法：./sync_to_server.sh

set -e

REMOTE="tencent-prod:/home/ubuntu/classroom/"

echo "开始同步代码到服务器：$REMOTE"

rsync -avz --progress \
  --exclude='.git/' \
  --exclude='backend/.env' \
  --exclude='backend/classroom.db' \
  --exclude='backend/classroom.db.backup_*' \
  --exclude='backend/venv/' \
  --exclude='backend/__pycache__/' \
  --exclude='backend/app/__pycache__/' \
  --exclude='backend/alembic/__pycache__/' \
  --exclude='backend/alembic/versions/__pycache__/' \
  --exclude='frontend/node_modules/' \
  --exclude='frontend/dist/' \
  --exclude='*.pyc' \
  --exclude='*.log' \
  ./ "$REMOTE"

echo "同步完成！"
