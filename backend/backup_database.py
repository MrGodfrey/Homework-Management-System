#!/usr/bin/env python3
"""
数据库备份脚本
用途：在执行 Alembic 迁移前备份数据库，防止数据丢失
"""
import os
import shutil
from datetime import datetime
from pathlib import Path

def backup_database():
    # 项目根目录
    project_root = Path(__file__).parent
    
    # 数据库文件路径
    db_files = [
        project_root / "classroom.db",
        project_root / "classroom.sqlite3",
        project_root / "app" / "classroom.db",
    ]
    
    # 备份目录
    backup_dir = project_root / "backups"
    backup_dir.mkdir(exist_ok=True)
    
    # 时间戳
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # 查找并备份数据库
    backup_count = 0
    for db_file in db_files:
        if db_file.exists():
            # 生成备份文件名
            backup_name = f"{db_file.stem}_backup_{timestamp}{db_file.suffix}"
            backup_path = backup_dir / backup_name
            
            # 复制文件
            shutil.copy2(db_file, backup_path)
            file_size = backup_path.stat().st_size / 1024  # KB
            
            print(f"✅ 备份成功: {db_file.name}")
            print(f"   → {backup_path}")
            print(f"   大小: {file_size:.2f} KB")
            backup_count += 1
    
    if backup_count == 0:
        print("❌ 未找到数据库文件！")
        print("   检查路径：")
        for db_file in db_files:
            print(f"   - {db_file}")
        return False
    
    print(f"\n✅ 共备份 {backup_count} 个数据库文件")
    print(f"📁 备份目录: {backup_dir}")
    
    # 列出最近5个备份
    all_backups = sorted(backup_dir.glob("*_backup_*"), key=os.path.getmtime, reverse=True)
    if len(all_backups) > 1:
        print(f"\n📜 最近的备份文件（最多显示5个）：")
        for i, backup in enumerate(all_backups[:5], 1):
            mtime = datetime.fromtimestamp(backup.stat().st_mtime)
            size_kb = backup.stat().st_size / 1024
            print(f"   {i}. {backup.name} ({size_kb:.1f} KB, {mtime.strftime('%Y-%m-%d %H:%M:%S')})")
    
    # 清理旧备份（保留最近10个）
    if len(all_backups) > 10:
        print(f"\n🧹 清理旧备份（保留最近10个）...")
        for old_backup in all_backups[10:]:
            old_backup.unlink()
            print(f"   删除: {old_backup.name}")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("数据库备份工具")
    print("=" * 60)
    print()
    
    success = backup_database()
    
    print()
    print("=" * 60)
    if success:
        print("✅ 备份完成！可以安全执行 Alembic 迁移了。")
        print()
        print("恢复备份示例：")
        print("  cp backups/classroom_backup_YYYYMMDD_HHMMSS.db ./classroom.db")
    else:
        print("❌ 备份失败，请检查数据库文件路径。")
    print("=" * 60)
