# 数据库迁移指南 (Database Migration Guide)

## 概述

本项目使用 Alembic 进行数据库迁移管理，确保在更新代码后数据库结构能够安全地升级，而不会丢失数据。

## 环境变量配置

在 `.env` 文件中，需要配置以下环境变量：

```bash
# 环境标识：DEV（开发环境）或 PROD（生产环境）
ENV=DEV

# 数据库 URL（默认使用 SQLite）
DATABASE_URL=sqlite:///./classroom.db

# COS 对象存储配置
COS_SECRET_ID=your_secret_id
COS_SECRET_KEY=your_secret_key
COS_REGION=ap-guangzhou
COS_BUCKET=your_bucket_name

# JWT 密钥
SECRET_KEY=your_secret_key
```

### 环境隔离说明

- **ENV=DEV**: 开发环境，上传到 COS 的文件会自动添加 `dev_env/` 前缀
- **ENV=PROD**: 生产环境，上传到 COS 的文件会添加 `prod_env/` 前缀

这确保开发和生产环境的文件在同一个存储桶中也不会互相覆盖。

## 数据库迁移工作流程

### 1. 查看当前数据库版本

```bash
cd backend
alembic current
```

### 2. 修改模型后创建迁移

当你修改了 `app/models.py` 中的模型（例如添加新字段）后：

```bash
cd backend
alembic revision --autogenerate -m "描述你的更改"
```

这会在 `alembic/versions/` 目录下生成一个新的迁移文件。

### 3. 查看迁移历史

```bash
cd backend
alembic history
```

### 4. 应用迁移（升级数据库）

**重要：在应用迁移前，请务必备份数据库！**

```bash
# 备份数据库
cd backend
cp classroom.db classroom.db.backup_$(date +%Y%m%d_%H%M%S)

# 应用迁移
alembic upgrade head
```

### 5. 回滚迁移（如果出现问题）

```bash
# 回滚到上一个版本
cd backend
alembic downgrade -1

# 或者回滚到特定版本
alembic downgrade <revision_id>
```

## 部署流程（推荐）

### 首次部署

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 更新部署

```bash
# 1. 停止服务
# 使用 Ctrl+C 或相应的进程管理工具停止服务

# 2. 拉取最新代码
git pull

# 3. 备份数据库
cp backend/classroom.db backend/classroom.db.backup_$(date +%Y%m%d_%H%M%S)

# 4. 安装依赖（如有新增）
cd backend
pip install -r requirements.txt

# 5. 应用数据库迁移
alembic upgrade head

# 6. 重启服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 注意事项

### 数据库文件保护

- `.gitignore` 已配置忽略 `*.db` 和 `*.sqlite3` 文件
- **永远不要** 将数据库文件提交到 Git 仓库
- 定期备份生产环境的数据库文件

### COS 文件防覆盖机制

系统已实现以下防覆盖机制：

1. **环境隔离**: 通过 `ENV` 变量自动添加 `dev_env/` 或 `prod_env/` 前缀
2. **唯一文件名**: 每个上传的文件都包含：
   - 作业 ID
   - 学号
   - 时间戳（精确到秒）
   - UUID（8位随机字符）
   - 原始文件名

文件 Key 格式：
```
{env_prefix}/submissions/{assignment_id}/{student_no}/{timestamp}_{uuid}_{filename}
```

示例：
```
dev_env/submissions/1/20230001/20260313_181530_a1b2c3d4_homework.pdf
```

这确保即使是同一个学生提交同名文件，也永远不会覆盖之前的提交。

## 常见问题

### Q: 如果忘记备份就升级了怎么办？
A: 可以使用 `alembic downgrade` 回滚到之前的版本，但这可能会丢失部分数据。始终建议先备份。

### Q: 本地测试时会影响生产环境的数据吗？
A: 不会。只要正确设置 `ENV=DEV`，所有文件上传都会在 `dev_env/` 目录下，与生产环境完全隔离。

### Q: 如何在不同机器之间同步数据库？
A: 数据库文件不应该通过 Git 同步。应该：
- 使用数据库备份工具导出数据
- 或者使用 PostgreSQL/MySQL 等支持远程连接的数据库（生产环境推荐）

### Q: 迁移失败了怎么办？
A: 
1. 不要慌，检查错误信息
2. 使用备份恢复数据库：`cp classroom.db.backup_XXXXXX classroom.db`
3. 检查迁移脚本是否有误
4. 寻求帮助或手动修复迁移脚本
