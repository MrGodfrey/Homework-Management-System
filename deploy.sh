#!/bin/bash
set -e

PROJECT_DIR="/home/ubuntu/classroom"

echo "=== 开始部署 ==="

# 后端
cd "$PROJECT_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt -q
alembic upgrade head
sudo systemctl restart classroom-backend
echo "✅ 后端部署完成"

# 前端
cd "$PROJECT_DIR/frontend"
npm install --silent
npm run build
sudo cp -r dist/* /var/www/classroom/
echo "✅ 前端部署完成"

echo "=== 部署完成 ==="
