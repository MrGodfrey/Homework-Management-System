# 作业提交系统 · 开发 TODO

> 当前状态：仅文档，**零代码**。逐步打勾直至完成。

---

## 阶段 1：项目初始化

- [x] 1.1 创建后端目录结构（`backend/app/`, `routers/` 等）
- [x] 1.2 创建 `backend/requirements.txt`（fastapi, uvicorn, sqlalchemy, python-jose, passlib, python-multipart, cos-python-sdk-v5）
- [x] 1.3 创建 `backend/app/config.py`（SECRET_KEY, COS 密钥, DB 路径等，从环境变量读取）
- [x] 1.4 创建 `backend/app/database.py`（SQLite + SQLAlchemy 引擎 + Session）
- [x] 1.5 创建 `backend/app/models.py`（6 张表：instructors, students, assignments, submissions, submission_files, audit_logs）
- [x] 1.6 创建 `backend/app/schemas.py`（Pydantic 请求/响应模型）
- [x] 1.7 创建 `backend/app/main.py`（FastAPI 入口，注册路由，CORS）
- [x] 1.8 创建 `backend/create_admin.py`（命令行脚本：创建初始教师账号）
- [x] 1.9 验收：`python -c "from app.models import *"` 无报错

---

## 阶段 2：认证系统

- [x] 2.1 创建 `backend/app/auth.py`
  - [x] 2.1.1 `hash_password(plain)` → bcrypt 哈希
  - [x] 2.1.2 `verify_password(plain, hashed)` → bool
  - [x] 2.1.3 `create_access_token(data, role, expires)` → JWT 字符串
  - [x] 2.1.4 `decode_access_token(token)` → payload dict
- [x] 2.2 创建 `backend/app/dependencies.py`
  - [x] 2.2.1 `get_current_student(token)` — 从 JWT 解析学生身份
  - [x] 2.2.2 `get_current_instructor(token)` — 从 JWT 解析教师身份
- [x] 2.3 创建 `backend/app/routers/auth.py`
  - [x] 2.3.1 `POST /api/auth/student/login`（学号+姓名+密码，连续错误 5 次锁定 10 分钟）
  - [x] 2.3.2 `POST /api/auth/instructor/login`（用户名+密码）
- [x] 2.4 验收：用 test 脚本/curl 测试学生/教师登录，验证返回 JWT

---

## 阶段 3：核心业务 — 作业与提交

- [x] 3.1 创建 COS 工具函数（`backend/app/cos_utils.py`）
  - [x] 3.1.1 `upload_file_to_cos(file_bytes, cos_key)` → COS URL
  - [x] 3.1.2 `generate_presigned_url(cos_key, expires=600)` → 临时下载 URL
  - [x] 3.1.3 验收：上传测试文件，通过预签名 URL 能下载
- [x] 3.2 创建 `backend/app/routers/student.py`
  - [x] 3.2.1 `GET /api/assignments` — 作业列表 + 当前学生提交状态
  - [x] 3.2.2 `GET /api/assignments/{id}` — 作业详情
  - [x] 3.2.3 `POST /api/assignments/{id}/submit`
    - [x] 校验截止时间（按 allow_late 决定是否拒绝/标记迟交）
    - [x] 服务端校验文件类型和大小
    - [x] 计算 version_no（MAX + 1）
    - [x] 上传到 COS：`/{assignment_id}/{student_id}/v{version_no}/{filename}`
    - [x] 写入 submissions + submission_files 记录
    - [x] 写入 audit_logs
    - [x] 返回版本号和提交时间
  - [x] 3.2.4 `GET /api/assignments/{id}/submissions` — 自己的提交历史（含预签名下载链接）
- [x] 3.3 验收：学生完整走通"登录 → 查看作业 → 上传 → 查看历史"流程

---

## 阶段 4：教师后台

- [x] 4.1 学生与密码管理（`backend/app/routers/admin.py`）
  - [x] 4.1.1 `GET /api/admin/students` — 学生列表
  - [x] 4.1.2 `POST /api/admin/students/import` — 解析 CSV 并批量写入 students 表
  - [x] 4.1.3 `POST /api/admin/students/generate-passwords` — 批量生成密码，返回 CSV 流，哈希存库
  - [x] 4.1.4 `POST /api/admin/students/{id}/reset-password` — 重置单个学生密码，返回明文，存哈希
- [x] 4.2 作业管理
  - [x] 4.2.1 `GET /api/admin/assignments` — 作业列表
  - [x] 4.2.2 `POST /api/admin/assignments` — 新建作业
  - [x] 4.2.3 `PUT /api/admin/assignments/{id}` — 编辑作业（含截止时间、允许迟交、文件规则）
- [x] 4.3 提交看板与下载
  - [x] 4.3.1 `GET /api/admin/dashboard` — 学生×作业矩阵数据
  - [x] 4.3.2 `GET /api/admin/assignments/{id}/submissions` — 某作业所有提交列表
  - [x] 4.3.3 `GET /api/admin/assignments/{id}/download?mode=all` — 全量下载 zip（`HW{n}_all_versions.zip`）
  - [x] 4.3.4 `GET /api/admin/assignments/{id}/download?mode=latest` — 仅最新版本 zip（`HW{n}_latest_only.zip`）
- [x] 4.4 日志
  - [x] 4.4.1 `GET /api/admin/logs` — 操作日志列表（支持分页）
- [x] 4.5 验收：教师完整走通"导入学生 → 生成密码 → 创建作业 → 查看提交 → 下载压缩包"流程

---

## 阶段 5：前端开发

- [x] 5.1 初始化 Vue 3 项目（`npm create vue@latest frontend`）
- [x] 5.2 安装依赖：`axios`, `vue-router`, `pinia`, `element-plus`
- [x] 5.3 创建项目结构（views/student, views/admin, router, stores, utils/api.js）
- [x] 5.4 配置 Axios 实例（base URL、JWT 拦截器、401 自动跳转登录）
- [x] 5.5 配置 vue-router（学生路由 + 教师路由 + 路由守卫）
- [x] 5.6 学生端页面
  - [x] 5.6.1 `Login.vue` — 学号+姓名+密码登录
  - [x] 5.6.2 `AssignmentList.vue` — 作业列表（含提交状态标签）
  - [x] 5.6.3 `AssignmentDetail.vue` — 作业详情 + 文件上传（支持多文件，进度条）
  - [x] 5.6.4 `SubmissionHistory.vue` — 历史提交版本 + 预签名下载链接
- [x] 5.7 教师端页面
  - [x] 5.7.1 `admin/Login.vue` — 用户名+密码登录
  - [x] 5.7.2 `Dashboard.vue` — 提交看板矩阵
  - [x] 5.7.3 `AssignmentManage.vue` — 作业新建/编辑
  - [x] 5.7.4 `StudentManage.vue` — 学生名单导入、密码生成、单人重置
  - [x] 5.7.5 `SubmissionDetail.vue` — 某作业提交详情 + 下载按钮
- [x] 5.8 验收：前端完整走通学生提交流程和教师管理流程

---

## 阶段 6：部署（腾讯云 CVM 162.14.78.163）

- [x] 6.1 服务器环境准备（python3-venv, nginx, certbot）
- [x] 6.2 上传代码，安装 Python 依赖（venv）
- [x] 6.3 配置 `.env` 文件（SECRET_KEY, COS 密钥等）
- [x] 6.4 初始化数据库（运行 `create_tables.py` 或 alembic migrate）
- [x] 6.5 创建初始教师账号（`python create_admin.py`）
- [x] 6.6 配置 systemd 服务（`/etc/systemd/system/classroom.service`）
- [x] 6.7 构建前端（`npm run build`），产物放入服务器
- [x] 6.8 配置 Nginx（静态文件 + 反向代理 `/api/`，`client_max_body_size 50M`）

---

