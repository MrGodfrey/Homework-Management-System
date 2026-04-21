<div align="center">
  <h1>📚 Classroom — 课程作业提交与管理系统</h1>
  <p><strong>一站式作业收发、版本管理与评分平台，为小班教学量身打造</strong></p>

  <p>
    <img src="https://img.shields.io/badge/FastAPI-0.135-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
    <img src="https://img.shields.io/badge/Vue_3-3.4-4FC08D?style=flat-square&logo=vuedotjs" alt="Vue 3"/>
    <img src="https://img.shields.io/badge/Element_Plus-2.13-409EFF?style=flat-square&logo=element" alt="Element Plus"/>
    <img src="https://img.shields.io/badge/Tencent_COS-云存储-0052CC?style=flat-square" alt="COS"/>
    <img src="https://img.shields.io/badge/License-Custom-blue?style=flat-square" alt="License"/>
  </p>
</div>

---

## ✨ 项目简介

Classroom 是一个面向高校小班教学场景（30 人左右，6-8 次作业）的 **作业提交与管理系统**。学生可以多次提交作业、查看历史版本；教师可以管理学生、发布作业、在线评分、批量下载，所有文件安全存储在腾讯云 COS。

### 为什么选择 Classroom？

- 🔄 **版本控制** — 每次提交自动创建新版本，不会覆盖旧文件
- ☁️ **云端存储** — 文件统一托管于腾讯云 COS，安全可靠
- 🔒 **安全设计** — JWT 认证 + bcrypt 加密 + 登录锁定 + 审计日志
- 🌐 **环境隔离** — DEV / PROD 一键切换，开发与生产互不干扰
- ⚡ **一键启动** — 单条命令即可搭建本地开发环境

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Vue 3 + Vite | 响应式 SPA，HMR 热重载 |
| **UI 组件** | Element Plus | 开箱即用的企业级组件 |
| **状态管理** | Pinia | 轻量、类型友好的状态管理 |
| **后端** | FastAPI | 高性能异步 Python Web 框架 |
| **ORM** | SQLAlchemy 2.0 | 支持 SQLite（开发）/ PostgreSQL（生产） |
| **数据库迁移** | Alembic | 可追踪的数据库版本管理 |
| **文件存储** | 腾讯云 COS | 对象存储，预签名 URL 安全下载 |
| **认证** | JWT + bcrypt | 无状态 Token 认证 |

---

## 🎯 功能一览

<table>
<tr>
<td width="50%" valign="top">

### 👨‍🎓 学生端

- 学号 + 姓名 + 密码登录
- 查看作业列表与提交状态
- 查看作业详情、截止时间、文件要求
- 多文件上传（带进度条，最大 50MB）
- 无限次版本提交
- 查看提交历史与成绩
- 查看课堂互动次数与详细记录
- 下载作业附件

</td>
<td width="50%" valign="top">

### 👩‍🏫 教师端

- CSV 批量导入学生名单
- 一键生成 & 导出密码
- 创建/编辑/删除作业（含附件）
- 📊 信息看板（学生×作业矩阵 + 互动次数）
- 快速记录 & 管理学生课堂互动
- 在线查看 & 评分每个提交版本
- 批量下载（仅最新 / 全部版本）
- 导出成绩 CSV 报告（含互动次数）
- 审计日志追踪所有操作

</td>
</tr>
</table>

---

## 📂 项目结构

```
classroom/
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口，CORS 配置
│   │   ├── config.py           # 环境变量配置
│   │   ├── models.py           # 数据库模型（8 张表）
│   │   ├── schemas.py          # Pydantic 请求/响应模型
│   │   ├── auth.py             # 密码加密 & JWT 处理
│   │   ├── cos_utils.py        # 腾讯云 COS 工具函数
│   │   └── routers/            # API 路由模块
│   │       ├── auth.py         # 登录认证
│   │       ├── student.py      # 学生相关接口
│   │       └── admin.py        # 教师管理接口
│   ├── alembic/                # 数据库迁移文件
│   └── requirements.txt
├── frontend/                   # Vue 3 前端
│   ├── src/
│   │   ├── views/
│   │   │   ├── student/        # 学生页面
│   │   │   └── admin/          # 教师页面
│   │   ├── router/             # 路由配置
│   │   ├── stores/             # Pinia 状态管理
│   │   └── utils/api.js        # Axios 封装
│   └── vite.config.js
├── start_local_test.py         # 一键启动脚本
├── switch_env.sh               # 环境切换脚本
└── sync_to_server.sh           # 服务器同步脚本
```

---

## 🚀 快速开始

### 环境要求

- Python 3.9+
- Node.js 18+
- 腾讯云 COS 存储桶（需配置密钥）

### 1. 克隆项目

```bash
git clone <仓库地址>
cd classroom
```

### 2. 配置环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
ENV=DEV
DATABASE_URL=sqlite:///./classroom.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
COS_SECRET_ID=your-cos-secret-id
COS_SECRET_KEY=your-cos-secret-key
COS_REGION=ap-guangzhou
COS_BUCKET=your-bucket-name
```

### 3. 一键启动

```bash
python start_local_test.py
```

该脚本将自动完成以下工作：
1. 创建 Python 虚拟环境并安装依赖
2. 初始化 SQLite 数据库 & 创建管理员账户
3. 自动检测可用端口
4. 同时启动后端（Uvicorn）和前端（Vite）开发服务器

启动后访问：
- 🖥️ 前端：`http://127.0.0.1:5173`
- ⚙️ 后端 API：`http://127.0.0.1:8000`
- 📖 API 文档：`http://127.0.0.1:8000/docs`

### 停止服务

```bash
pkill -f uvicorn && pkill -f vite
```

### 自动回归测试

网站改动后的默认回归命令：

```bash
npm run test:web
```

这条命令会自动拉起隔离的前后端测试实例，并执行完整浏览器回归。详细说明见 [MYSELFTEST.md](./MYSELFTEST.md)。

---

## 🔌 API 概览

<details>
<summary><strong>认证接口</strong></summary>

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/student/login` | 学生登录 |
| POST | `/api/auth/instructor/login` | 教师登录 |

</details>

<details>
<summary><strong>学生接口</strong>（需 JWT 认证）</summary>

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/assignments` | 获取作业列表 |
| GET | `/api/assignments/{id}` | 获取作业详情 |
| POST | `/api/assignments/{id}/submit` | 提交作业 |
| GET | `/api/assignments/{id}/submissions` | 查看提交历史 |
| GET | `/api/assignments/{id}/attachments` | 获取作业附件 |
| GET | `/api/assignments/interactions` | 查看课堂互动记录 |

</details>

<details>
<summary><strong>教师管理接口</strong>（需 JWT 认证）</summary>

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/admin/students/import` | 批量导入学生 |
| POST | `/api/admin/students/generate-passwords` | 批量生成密码 |
| POST | `/api/admin/assignments` | 创建作业 |
| GET | `/api/admin/dashboard` | 总览仪表盘数据 |
| GET | `/api/admin/assignments/{id}/submissions` | 查看作业提交 |
| GET | `/api/admin/assignments/{id}/download` | 批量下载提交 |
| POST | `/api/admin/students/{id}/interactions` | 添加互动记录 |
| GET | `/api/admin/students/{id}/interactions` | 查看学生互动 |
| DELETE | `/api/admin/interactions/{id}` | 删除互动记录 |
| GET | `/api/admin/logs` | 查看审计日志 |

</details>

> 完整 API 文档启动后端后访问 `/docs`（Swagger UI）

---

## 🗄️ 数据库设计

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  instructors │     │   students   │     │  assignments   │
├──────────────┤     ├──────────────┤     ├────────────────┤
│ id           │     │ id           │     │ id             │
│ username     │     │ student_id   │     │ title          │
│ hashed_pwd   │     │ name         │     │ description    │
└──────────────┘     │ hashed_pwd   │     │ deadline       │
                     └──────┬───────┘     │ file_rules     │
                            │             └───────┬────────┘
                            │                     │
                     ┌──────┴─────────────────────┴──────┐
                     │           submissions             │
                     ├───────────────────────────────────┤
                     │ id │ student_id │ assignment_id   │
                     │ version_no │ score │ is_graded    │
                     └──────────────┬────────────────────┘
                                    │
                     ┌──────────────┴───────┐
                     │  submission_files    │
                     ├─────────────────────┤
                     │ id │ filename       │
                     │ cos_key             │
                     └─────────────────────┘

┌──────────────┐
│ interactions │  ← 课堂互动记录
├──────────────┤
│ id           │
│ student_id   │
│ created_at   │
│ note         │
└──────────────┘
```

---

## 🔐 安全特性

| 特性 | 实现方式 |
|------|----------|
| 密码加密 | bcrypt 哈希存储 |
| 身份认证 | JWT Token（30 分钟过期） |
| 登录保护 | 5 次失败锁定 10 分钟 |
| 文件下载 | COS 预签名 URL（10 分钟有效） |
| 操作审计 | 全量审计日志记录 |
| 环境隔离 | DEV/PROD 独立存储路径 |
| 文件安全 | 时间戳 + UUID 命名，防覆盖 |

---

## 🛠️ 开发指南

### 数据库迁移

```bash
cd backend

# 修改 models.py 后生成迁移
alembic revision --autogenerate -m "描述信息"

# 应用迁移
alembic upgrade head
```

### 环境切换

```bash
bash switch_env.sh    # 交互式切换 DEV / PROD
```

### 生产部署

1. 配置 `.env`（使用 PostgreSQL + 生产密钥）
2. 安装依赖 & 执行迁移
3. 创建管理员：`python create_admin.py`
4. 构建前端：`cd frontend && npm run build`
5. 配置 Nginx 反向代理 + 静态文件托管
6. 配置 systemd 管理后端服务
7. 使用 certbot 配置 SSL 证书

---

## 📄 License

本项目采用仓库根目录 [LICENSE](./LICENSE) 中的自定义许可协议：

- 允许学习、研究、修改、分发与商用
- 商业使用时必须明确注明原项目出处
- 再分发时需保留许可证文本与版权声明
- 商业分发的修改版本需说明基于原项目进行了修改
