#!/bin/bash
# 快速切换 DEV/PROD 环境

ENV_FILE="backend/.env"

# 显示当前环境
show_current() {
    echo "=========================================="
    echo "当前环境配置："
    echo "=========================================="
    cd backend && python3 -c "
from app.config import settings
print(f'环境: {settings.ENV}')
print(f'文件路径前缀: {\"dev_env\" if settings.ENV == \"DEV\" else \"prod_env\"}')
print(f'COS 存储桶: {settings.COS_BUCKET}')
" 2>/dev/null || echo "❌ 无法读取配置，请确保 backend 目录存在"
    echo "=========================================="
}

# 切换到 DEV 环境
switch_to_dev() {
    echo "🔄 切换到 DEV 环境..."
    
    # 删除旧的 ENV 配置
    sed -i '' '/^ENV=/d' "$ENV_FILE"
    sed -i '' '/^# 环境配置/d' "$ENV_FILE"
    
    # 在文件开头添加新配置
    echo "# 环境配置 (DEV=开发环境, PROD=生产环境)" > "$ENV_FILE.tmp"
    echo "ENV=DEV" >> "$ENV_FILE.tmp"
    echo "" >> "$ENV_FILE.tmp"
    cat "$ENV_FILE" >> "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
    
    echo "✅ 已切换到 DEV 环境"
    echo ""
    show_current
    echo ""
    echo "⚠️  需要重启服务才能生效："
    echo "   pkill -f uvicorn && python3 start_local_test.py"
}

# 切换到 PROD 环境
switch_to_prod() {
    echo "🔄 切换到 PROD 环境..."
    
    # 删除旧的 ENV 配置
    sed -i '' '/^ENV=/d' "$ENV_FILE"
    sed -i '' '/^# 环境配置/d' "$ENV_FILE"
    
    # 在文件开头添加新配置
    echo "# 环境配置 (DEV=开发环境, PROD=生产环境)" > "$ENV_FILE.tmp"
    echo "ENV=PROD" >> "$ENV_FILE.tmp"
    echo "" >> "$ENV_FILE.tmp"
    cat "$ENV_FILE" >> "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
    
    echo "✅ 已切换到 PROD 环境"
    echo ""
    show_current
    echo ""
    echo "⚠️  需要重启服务才能生效："
    echo "   pkill -f uvicorn && python3 start_local_test.py"
}

# 主菜单
show_menu() {
    echo ""
    echo "=========================================="
    echo "  环境切换工具"
    echo "=========================================="
    show_current
    echo ""
    echo "请选择操作："
    echo "  1) 切换到 DEV 环境（开发测试）"
    echo "  2) 切换到 PROD 环境（生产环境）"
    echo "  3) 仅查看当前环境"
    echo "  4) 退出"
    echo ""
    read -p "请输入选项 (1-4): " choice
    
    case $choice in
        1)
            switch_to_dev
            ;;
        2)
            switch_to_prod
            ;;
        3)
            show_current
            ;;
        4)
            echo "退出"
            exit 0
            ;;
        *)
            echo "❌ 无效选项"
            show_menu
            ;;
    esac
}

# 命令行参数处理
if [ "$1" == "dev" ] || [ "$1" == "DEV" ]; then
    switch_to_dev
elif [ "$1" == "prod" ] || [ "$1" == "PROD" ]; then
    switch_to_prod
elif [ "$1" == "status" ] || [ "$1" == "show" ]; then
    show_current
else
    show_menu
fi
