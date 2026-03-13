#!/usr/bin/env python3
"""
阶段 5 验证脚本
自动检查系统配置和接口实现是否符合要求
"""
import sys
import os
from pathlib import Path

# 添加 backend 到路径
sys.path.insert(0, str(Path(__file__).parent))

def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_result(item, status, message=""):
    icon = "✅" if status else "❌"
    print(f"{icon} {item}")
    if message:
        print(f"   → {message}")

def check_alembic_config():
    """检查 Alembic 配置"""
    print_header("1. 检查 Alembic 配置")
    
    alembic_ini = Path(__file__).parent / "alembic.ini"
    alembic_dir = Path(__file__).parent / "alembic"
    versions_dir = alembic_dir / "versions"
    
    print_result("alembic.ini 文件", alembic_ini.exists())
    print_result("alembic/ 目录", alembic_dir.exists())
    print_result("alembic/versions/ 目录", versions_dir.exists())
    
    if versions_dir.exists():
        migrations = list(versions_dir.glob("*.py"))
        migrations = [m for m in migrations if not m.name.startswith("__")]
        print_result(f"迁移脚本数量", len(migrations) > 0, f"找到 {len(migrations)} 个迁移文件")

def check_environment_config():
    """检查环境配置"""
    print_header("2. 检查环境配置")
    
    try:
        from app.config import settings
        
        env = settings.ENV
        print_result("ENV 配置", env in ["DEV", "PROD"], f"当前: {env}")
        
        cos_configured = all([
            settings.COS_SECRET_ID,
            settings.COS_SECRET_KEY,
            settings.COS_BUCKET
        ])
        print_result("COS 配置", cos_configured, 
                    f"Bucket: {settings.COS_BUCKET or '未配置'}")
        
        print_result("数据库路径", bool(settings.DATABASE_URL), 
                    settings.DATABASE_URL)
        
    except Exception as e:
        print_result("配置加载", False, str(e))

def check_api_interfaces():
    """检查 API 接口实现"""
    print_header("3. 检查 API 接口")
    
    try:
        # 检查学生 /me 接口
        student_router_path = Path(__file__).parent / "app" / "routers" / "student.py"
        if student_router_path.exists():
            content = student_router_path.read_text()
            has_me_endpoint = '@router.get("/me"' in content
            print_result("GET /api/assignments/me", has_me_endpoint)
            
            # 检查返回字段
            has_student_id = 'student_id' in content
            has_name = '"name":' in content or '.name' in content
            print_result("  └─ 返回 student_id", has_student_id)
            print_result("  └─ 返回 name", has_name)
        else:
            print_result("student.py 文件", False)
        
        # 检查管理员下载接口
        admin_router_path = Path(__file__).parent / "app" / "routers" / "admin.py"
        if admin_router_path.exists():
            content = admin_router_path.read_text()
            has_single_download = 'student_no: str' in content
            print_result("单学生下载接口参数", has_single_download, 
                        "使用 student_no: str（学号字符串）")
            
            has_csv_export = 'export_csv' in content or 'csv' in content.lower()
            print_result("CSV 导出功能", has_csv_export)
            
            has_grading = 'grade' in content or 'score' in content
            print_result("评分功能", has_grading)
        else:
            print_result("admin.py 文件", False)
            
    except Exception as e:
        print_result("接口检查", False, str(e))

def check_cos_key_generation():
    """检查 COS Key 生成逻辑"""
    print_header("4. 检查 COS 存储防覆盖机制")
    
    try:
        student_router_path = Path(__file__).parent / "app" / "routers" / "student.py"
        if student_router_path.exists():
            content = student_router_path.read_text()
            
            # 检查关键组件
            has_env_prefix = 'env_prefix' in content
            print_result("环境前缀隔离", has_env_prefix, 
                        "dev_env / prod_env")
            
            has_timestamp = 'timestamp' in content and 'strftime' in content
            print_result("时间戳", has_timestamp)
            
            has_uuid = 'uuid.uuid4()' in content or 'uuid4()' in content
            print_result("UUID", has_uuid)
            
            # 检查 Key 格式
            expected_format = '{env_prefix}/submissions/{assignment_id}/{student_no}/{timestamp}_{uuid}_{filename}'
            key_format_good = all([
                'submissions/' in content,
                'student_id' in content or 'student_no' in content,
                'f"' in content or "f'" in content
            ])
            print_result("Key 格式正确", key_format_good, expected_format)
            
    except Exception as e:
        print_result("COS Key 检查", False, str(e))

def check_database_structure():
    """检查数据库模型"""
    print_header("5. 检查数据库模型")
    
    try:
        from app.models import Submission
        
        # 检查评分字段
        submission_fields = [attr for attr in dir(Submission) if not attr.startswith('_')]
        
        has_score = 'score' in submission_fields
        print_result("Submission.score 字段", has_score)
        
        has_grade = 'grade' in submission_fields
        print_result("Submission.grade 字段", has_grade)
        
        has_is_graded = 'is_graded' in submission_fields
        print_result("Submission.is_graded 字段", has_is_graded)
        
    except Exception as e:
        print_result("数据库模型检查", False, str(e))

def check_backup_script():
    """检查备份脚本"""
    print_header("6. 检查数据库备份工具")
    
    backup_script = Path(__file__).parent / "backup_database.py"
    print_result("backup_database.py", backup_script.exists())
    
    backups_dir = Path(__file__).parent / "backups"
    if backups_dir.exists():
        existing_backups = list(backups_dir.glob("*_backup_*"))
        print_result("backups/ 目录", True, 
                    f"已有 {len(existing_backups)} 个备份文件")
    else:
        print_result("backups/ 目录", False, "尚未创建（首次备份时会自动创建）")

def main():
    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + " " * 20 + "阶段 5 验证检查工具" + " " * 26 + "║")
    print("╚" + "═" * 68 + "╝")
    
    check_alembic_config()
    check_environment_config()
    check_api_interfaces()
    check_cos_key_generation()
    check_database_structure()
    check_backup_script()
    
    print_header("检查完成")
    print("\n📋 下一步操作：")
    print("   1. 运行备份脚本: python backup_database.py")
    print("   2. 测试数据库迁移: alembic upgrade head")
    print("   3. 测试文件上传（DEV 环境）")
    print("   4. 测试文件上传（PROD 环境）")
    print("   5. 查看详细测试指南: ai/stage5_testing_guide.md")
    print()

if __name__ == "__main__":
    main()
