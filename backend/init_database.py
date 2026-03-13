#!/usr/bin/env python3
"""
数据库初始化脚本
用途：安全地重新初始化数据库（备份旧数据库 -> 删除 -> 创建新表 -> 运行迁移）
警告：这将删除所有现有数据！
"""
import os
import sys
import shutil
from datetime import datetime
from pathlib import Path

# 添加项目路径到 sys.path
sys.path.insert(0, str(Path(__file__).parent))

def backup_and_init():
    project_root = Path(__file__).parent
    db_file = project_root / "classroom.db"
    
    print("=" * 60)
    print("数据库初始化脚本")
    print("=" * 60)
    print("⚠️  警告：此操作将删除所有现有数据！")
    print()
    
    # 如果数据库文件存在，先备份
    if db_file.exists():
        print(f"📁 发现现有数据库：{db_file}")
        print()
        
        # 询问是否继续
        confirm = input("是否继续初始化？这将删除所有数据！(输入 'YES' 继续): ")
        if confirm != "YES":
            print("❌ 操作已取消")
            return False
        
        # 创建备份目录
        backup_dir = project_root / "backups"
        backup_dir.mkdir(exist_ok=True)
        
        # 生成备份文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"classroom_backup_{timestamp}.db"
        backup_path = backup_dir / backup_name
        
        # 备份数据库
        print(f"\n📦 正在备份数据库...")
        shutil.copy2(db_file, backup_path)
        file_size = backup_path.stat().st_size / 1024  # KB
        print(f"✅ 备份成功: {backup_path}")
        print(f"   大小: {file_size:.2f} KB")
        
        # 删除旧数据库
        print(f"\n🗑️  删除旧数据库...")
        db_file.unlink()
        print("✅ 删除成功")
    else:
        print("📁 未发现现有数据库，将创建新数据库")
    
    # 导入数据库模块并创建表
    print(f"\n🔨 创建数据库表...")
    from app.database import engine, Base
    from app.models import Instructor, Student, Assignment, Submission, SubmissionFile, AuditLog
    
    Base.metadata.create_all(bind=engine)
    print("✅ 数据库表创建成功")
    
    # 运行 Alembic 迁移（标记为最新版本）
    print(f"\n🔄 同步 Alembic 迁移版本...")
    os.system("cd backend 2>/dev/null || true; alembic stamp head")
    print("✅ Alembic 版本已同步")
    
    print("\n" + "=" * 60)
    print("✅ 数据库初始化完成！")
    print("=" * 60)
    print("\n📝 下一步操作：")
    print("   1. 运行导入学生数据：python3 -c 'from app.routers.admin import import_students'")
    print("   2. 创建管理员账户：python3 create_admin.py")
    print("   3. 启动应用：python3 -m uvicorn app.main:app --reload")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = backup_and_init()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 错误：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
