# Classroom Assignment System - Backend

基于 FastAPI 的作业提交系统后端。

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件（参考下面的模板）：

```bash
# 环境标识：DEV（开发）或 PROD（生产）
ENV=DEV

# 数据库配置
DATABASE_URL=sqlite:///./classroom.db

# COS 对象存储配置
COS_SECRET_ID=<set-in-local-env>
COS_SECRET_KEY=<set-in-local-env>
COS_REGION=ap-guangzhou
COS_BUCKET=<set-in-local-env>

# JWT 配置
SECRET_KEY=<set-in-local-env>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. 初始化数据库

```bash
# 应用数据库迁移
alembic upgrade head

# 创建管理员账户
python create_admin.py
```

### 4. 启动服务

```bash
# 开发模式（带热重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 项目结构

```
backend/
├── alembic/              # 数据库迁移文件
│   └── versions/         # 迁移脚本
├── app/
│   ├── routers/          # API 路由
│   │   ├── admin.py      # 教师端接口
│   │   ├── auth.py       # 认证接口
│   │   └── student.py    # 学生端接口
│   ├── auth.py           # 认证工具函数
│   ├── config.py         # 配置管理
│   ├── cos_utils.py      # COS 存储工具
│   ├── database.py       # 数据库连接
│   ├── dependencies.py   # 依赖注入
│   ├── main.py           # FastAPI 应用入口
│   ├── models.py         # 数据库模型
│   └── schemas.py        # Pydantic 数据模式
├── alembic.ini           # Alembic 配置
├── classroom.db          # SQLite 数据库（不提交到 Git）
├── create_admin.py       # 创建管理员脚本
├── requirements.txt      # Python 依赖
└── tests.py              # 测试文件
```

## 关键功能

### 环境隔离

系统支持通过 `ENV` 环境变量实现开发/生产环境隔离：

- **ENV=DEV**: 所有上传的文件会存储在 `dev_env/` 路径下
- **ENV=PROD**: 所有上传的文件会存储在 `prod_env/` 路径下

这确保本地测试和生产环境使用同一个存储桶时也不会互相影响。

### 文件防覆盖

每个上传的文件都使用唯一的 Key：

```
{env_prefix}/submissions/{assignment_id}/{student_no}/{timestamp}_{uuid}_{filename}
```

示例：
```
dev_env/submissions/1/20230001/20260313_181530_a1b2c3d4_homework.pdf
```

### 数据库迁移与备份

#### 执行迁移前务必备份
```bash
# 自动备份数据库（保存到 backups/ 目录）
python backup_database.py

# 然后执行迁移
alembic upgrade head
```

#### 查看迁移状态
```bash
# 查看当前版本
alembic current

# 查看迁移历史
alembic history --verbose
```

#### 回滚迁移（如果需要）
```bash
# 回退一个版本
alembic downgrade -1

# 回退到指定版本
alembic downgrade <revision_id>
```

#### 紧急恢复
如果迁移出现问题，可以从备份恢复：
```bash
cp backups/classroom_backup_YYYYMMDD_HHMMSS.db ./classroom.db
```

详细说明请查看 [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md)

## API 文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 主要 API 端点

### 认证
- `POST /api/auth/student/login` - 学生登录
- `POST /api/auth/instructor/login` - 教师登录

### 学生端
- `GET /api/assignments` - 获取作业列表
- `GET /api/assignments/{id}` - 获取作业详情
- `POST /api/assignments/{id}/submit` - 提交作业
- `GET /api/assignments/{id}/submissions` - 查看提交历史

### 教师/管理员端
- `POST /api/admin/assignments` - 创建作业
- `GET /api/admin/assignments` - 获取所有作业
- `GET /api/admin/assignments/{id}/submissions` - 查看作业提交情况
- `GET /api/admin/assignments/{id}/download` - 下载作业 ZIP

## 开发说明

### 添加新功能

1. 修改 `models.py` 添加/修改数据库模型
2. 创建迁移：`alembic revision --autogenerate -m "描述"`
3. 应用迁移：`alembic upgrade head`
4. 在相应的 router 中添加 API 端点
5. 测试功能

### 运行测试

```bash
python tests.py
```

## 注意事项

- **永远不要提交 `.db` 文件到 Git**
- 修改模型后必须创建并应用迁移
- 生产环境部署时，建议使用 PostgreSQL 而不是 SQLite
- 定期备份数据库文件
- 保护好 `.env` 文件中的敏感信息

## 故障排查

### 数据库锁定错误
SQLite 在并发访问时可能出现锁定。生产环境建议使用 PostgreSQL。

### COS 上传失败
检查 COS 配置是否正确，以及存储桶权限设置。

### 迁移失败
查看 `DATABASE_MIGRATION.md` 中的回滚步骤。
