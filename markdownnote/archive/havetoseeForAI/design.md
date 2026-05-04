你的需求是一个面向小班课程的作业提交系统。下面是经过审核并补充细节后的版本，重点解决你提出的三个核心问题：

1. 学生必须使用个人专属密码提交，避免他人冒用。
2. 教师后台可为每个学号生成并管理密码。
3. 每次上传都保留独立版本目录，不允许简单覆盖历史文件。

---

# 一、方案审核结论（先给结论）

你原方案整体方向正确，适合 30 人左右课程，具备可落地性。

原方案的主要风险点有 4 个：

1. 缺少身份校验，学生可互相冒用身份提交。
2. 上传采用“覆盖”思路，历史版本丢失，不利于追溯。
3. 下载规则不够明确，无法区分“全量版本”与“最新版本”。
4. 缺少操作日志与失败重试机制，后续排查困难。

本次修订已将以上风险补齐，并保持实现复杂度可控。

---

# 二、项目目标（修订版）

构建一个简易的课程作业提交系统，用于教师收集和管理学生作业。

系统目标：

1. 学生无需注册账号，但必须通过 `学号 + 姓名 + 专属密码` 进行身份验证。
2. 系统支持 6–8 次作业，每次作业有独立说明、截止时间、文件规则。
3. 学生可多次上传，每次上传保留为独立版本（不可覆盖历史）。
4. 教师可在后台查看提交记录并按需下载：
   - 全量版本下载
   - 仅下载每个学生的最新版本
5. 系统主要面向小规模课程，优先“稳定、简单、可维护”。

---

# 三、用户角色

## 1 学生（Student）

功能：

- 输入学号、姓名、密码登录提交页
- 查看作业内容
- 上传作业文件（可多文件）
- 查看自己历史提交版本
- 查看当前“最新版本”标记

特点：

- 不注册
- 不需要复杂找回密码流程
- 流程尽可能短（1 分钟内完成一次提交）

## 2 教师（Instructor）

功能：

- 管理学生名单
- 批量生成或重置学生密码
- 发布和编辑作业
- 查看所有提交版本
- 下载全部版本或仅最新版本
- 导出提交统计报表

---

# 四、核心功能需求（修订版）

## 1 学生身份验证（新增密码）

学生进入系统后，需要填写：

```
学号 + 姓名 + 密码
```

校验规则：

1. 学号必须存在于学生名单。
2. 姓名需与学号匹配。
3. 密码需与该学号匹配。
4. 连续输错超过 5 次，锁定 10 分钟（防爆破）。

登录成功后进入作业列表。

## 2 教师后台密码管理（新增）

教师在后台可执行：

1. 为全部学生批量生成初始密码。
2. 为单个学生重置密码。
3. 导出密码发放清单（CSV，仅教师可见）。
4. 标记密码状态：`初始` / `已重置` / `已启用`。

密码生成与导出流程：

1. 教师点击"批量生成密码"→ 系统生成随机明文密码。
2. 系统**立即**将明文密码导出为 CSV 供教师下载保存。
3. 系统将密码用 bcrypt 哈希后存入数据库，**明文不落库**。
4. 此后教师只能"重置密码"（生成新密码），不能"查看旧密码"。

建议密码策略：

- 长度至少 8 位
- 包含字母和数字
- 避免纯学号或姓名拼音

说明：你可在系统外（课程群、资料区）发送密码，系统不负责消息触达。

## 3 作业列表

页面显示：

- 作业标题
- 截止日期
- 提交状态（未提交 / 已提交）
- 最新提交时间
- 提交次数

示例：

```
作业1：Python基础练习     已提交（2次）
作业2：数据分析 Notebook  未提交
作业3：机器学习报告       已提交（1次）
```

## 4 作业详情页

显示字段：

- 作业标题
- 作业说明
- 截止时间
- 允许文件类型
- 单文件大小限制
- 本人历史提交版本

例如：

```
作业2：数据分析 Notebook

要求：
1. 完成 notebook 中的任务
2. 输出结果必须可运行

允许提交文件：
pdf / ipynb / md / txt / docx / zip

单文件限制：50MB
```

## 5 上传规则（从覆盖改为版本化）

学生每次点击“提交”后：

1. 系统创建新的提交记录（submission version）。
2. 云端新建一个独立目录存储本次上传文件。
3. 历史版本全部保留，不做覆盖。

目录建议：

```
/{assignment_id}/{student_id}/{submission_id}/
```

说明：系统定位为单课程，不需要 `course_id` 层级。

文件命名建议：

```
HW2_20230001_v003_report.pdf
```

其中 `v003` 为该学生在该作业下的第 3 次提交。文件名只使用学号标识学生（无需拼音转换）。

## 6 提交成功反馈

提交成功后显示：

```
提交成功
提交版本：v003
提交时间：2026-03-11 21:35
```

并展示：

- 本次上传文件列表
- 历史版本列表
- 当前最新版本标记

## 7 截止时间规则（建议明确）

可配置两种模式：

1. 严格截止：过期后禁止提交。
2. 允许迟交：可提交但标记 `late=true`，并记录迟交分钟数。

---

# 五、教师后台功能（修订版）

## 1 提交看板

按“学生 x 作业”展示矩阵：

| 学号 | 姓名 | 作业1 | 作业2 | 作业3 |
| --- | --- | --- | --- | --- |
| 20230001 | 张三 | v2 | v3 | - |
| 20230002 | 李四 | v1 | - | v1 |

说明：

- `v3` 表示最新版本号
- 鼠标悬停可查看最近提交时间

## 2 查看某次作业详情

例如查看“作业2”：

| 学号 | 姓名 | 提交次数 | 最新版本 | 最新时间 | 操作 |
| --- | --- | --- | --- | --- | --- |
| 20230001 | 张三 | 3 | v3 | 2026-03-11 21:35 | 查看版本 / 下载 |

可点开某学生查看版本明细：v1、v2、v3。

## 3 下载策略（重点修订）

后台提供两个明确选项：

1. `全量下载`：下载所有学生所有版本文件。
   - 压缩包命名：`HW2_all_versions.zip`
2. `仅最新下载`：每个学生仅打包其最新版本文件。
   - 压缩包命名：`HW2_latest_only.zip`

按学生下载时同样支持两种模式：

1. 全版本：`20230001_all_versions.zip`
2. 仅最新：`20230001_latest.zip`

## 4 作业管理

教师可以：

- 新建作业
- 编辑作业说明
- 设置截止时间
- 设置允许文件类型
- 配置是否允许迟交
- 配置每次最多上传文件数（例如最多 10 个）

## 5 学生与密码管理（新增）

教师可以：

- 导入学生名单（CSV）
- 一键生成密码
- 单个重置密码
- 导出发放清单
- 查看密码最后更新时间

---

# 六、数据结构设计（修订版）

## 0 教师表（新增）

```sql
instructors
--------
id
username             -- 登录用户名
password_hash        -- 密码哈希（bcrypt）
name                 -- 教师姓名
created_at
updated_at
```

说明：教师通过 `用户名 + 密码` 登录后台。初始管理员账号在系统部署时通过命令行脚本创建。

## 1 学生表

```sql
students
--------
id
student_id           -- 学号（唯一）
name                 -- 姓名
password_hash        -- 密码哈希（不存明文）
password_updated_at
is_active
created_at
updated_at
```

## 2 作业表

```sql
assignments
--------
id
title
description
deadline
week                 -- 所属教学周次（用于排序展示，例如 week=3 表示第 3 周作业）
allow_late           -- 是否允许迟交
max_files_per_submit
max_file_size_mb
allowed_extensions   -- JSON 数组，例 ["pdf","ipynb","zip"]
created_at
updated_at
```

## 3 提交主表（一次提交一条记录）

```sql
submissions
--------
id
student_id           -- 外键 → students.id
assignment_id        -- 外键 → assignments.id
version_no           -- 版本号：1,2,3...（同一 student_id + assignment_id 下自增）
storage_dir          -- COS 目录，例：/hw2/20230001/sub_0003/
submitted_at
is_late
late_minutes
client_ip
user_agent
```

注意：不再使用 `is_latest` 字段。"最新版本"通过查询 `MAX(version_no) WHERE student_id=? AND assignment_id=?` 动态计算，避免数据不一致风险。

建议索引：`(student_id, assignment_id, version_no)` 联合索引。

## 4 提交文件表（一次提交可能多个文件）

```sql
submission_files
--------
id
submission_id
original_filename
stored_filename
file_path
file_size
file_ext
checksum_sha256
created_at
```

## 5 操作日志表（建议新增）

```sql
audit_logs
--------
id
operator_role        -- student / instructor / system
operator_id
action               -- login_success / login_failed / upload / download_zip / reset_password
target_type
target_id
detail_json
created_at
```

---

# 七、系统流程（修订版）

## 学生流程

```
进入网站
↓
输入学号 + 姓名 + 密码
↓
查看作业列表
↓
进入作业详情
↓
上传文件
↓
系统创建新版本目录
↓
提交成功并显示版本号
```

## 教师流程

```
登录后台
↓
管理作业 / 管理学生密码
↓
查看提交情况与版本
↓
选择下载模式（全量 or 最新）
↓
下载压缩包并批改
```

---

# 八、非功能要求（建议补充）

1. 安全：
   - 密码仅存哈希（推荐 `bcrypt`）。
   - 接口全站 HTTPS。
   - 下载链接使用 COS 预签名 URL（有效期 10 分钟）。
   - 前后端分离需配置 CORS 白名单（仅允许前端域名）。
   - 文件上传需服务端校验文件类型和大小（不能仅靠前端校验）。

2. 稳定性：
   - 上传失败可重试。
   - 大文件上传采用分片或断点续传（可选）。

3. 可追溯：
   - 所有提交保留时间戳。
   - 所有下载动作记录到日志。

4. 性能（30 人规模）：
   - 单次下载打包时间控制在 30 秒内。
   - 普通查询响应控制在 1 秒内。

---

# 九、推荐技术实现（可落地）

## 方案A（你这个场景最推荐）

前端：

```
Vue 3
```

后端：

```
FastAPI（Python）
```

数据库：

```
SQLite（30 人规模完全足够，无需 MySQL）
```

文件存储：

```
腾讯云 COS（已开通）
```

认证方案：

```
JWT（JSON Web Token）
- 学生登录后签发短期 token（有效期 2 小时）
- 教师登录后签发 token（有效期 8 小时）
- Token 放在 HTTP Header: Authorization: Bearer <token>
```

部署架构：

```
腾讯云 CVM（<server-ip-or-domain>）
├── Nginx（反向代理 + HTTPS + 静态文件）
│   ├── / → Vue 前端静态文件
│   └── /api/ → FastAPI 后端（uvicorn，端口 8000）
├── Let's Encrypt（免费 SSL 证书）
└── systemd（进程管理）
```

理由：

- FastAPI 对文件上传和后台接口开发效率高。
- 对“版本化提交 + 下载打包”实现清晰。- SQLite 对 30 人小班完全够用，免运维。- 后期扩展到查重/自动评分更方便。

## 最小可用版本（MVP）建议工期

1. 第 1 天：学生登录、作业列表、上传、版本记录。
2. 第 2 天：后台查看、密码生成、下载打包两种模式。
3. 第 3 天：异常处理、日志、部署和联调。

---

# 十、API 路由设计

## 认证相关

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/auth/student/login | 学生登录（学号+姓名+密码） | 无 |
| POST | /api/auth/instructor/login | 教师登录（用户名+密码） | 无 |

## 学生端

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/assignments | 获取作业列表（含提交状态） | 学生JWT |
| GET | /api/assignments/{id} | 获取作业详情 | 学生JWT |
| POST | /api/assignments/{id}/submit | 提交作业文件（multipart） | 学生JWT |
| GET | /api/assignments/{id}/submissions | 获取自己的提交历史 | 学生JWT |

## 教师端

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/admin/dashboard | 提交看板数据 | 教师JWT |
| GET | /api/admin/assignments | 作业列表 | 教师JWT |
| POST | /api/admin/assignments | 新建作业 | 教师JWT |
| PUT | /api/admin/assignments/{id} | 编辑作业 | 教师JWT |
| GET | /api/admin/assignments/{id}/submissions | 某作业所有提交 | 教师JWT |
| GET | /api/admin/assignments/{id}/download?mode=all\|latest | 下载提交压缩包 | 教师JWT |
| GET | /api/admin/students | 学生列表 | 教师JWT |
| POST | /api/admin/students/import | 导入学生CSV | 教师JWT |
| POST | /api/admin/students/generate-passwords | 批量生成密码并返回CSV | 教师JWT |
| POST | /api/admin/students/{id}/reset-password | 重置单个学生密码 | 教师JWT |
| GET | /api/admin/logs | 操作日志 | 教师JWT |

---

# 十一、详细行动计划

以下为可供 LLM 直接执行的分步计划。每步说明了要做什么、输入输出和验收标准。

## 阶段 1：项目初始化

### 步骤 1.1 创建后端项目结构

```
classroom/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置（SECRET_KEY, COS 密钥, DB 路径等）
│   │   ├── database.py          # SQLite 连接 + SQLAlchemy 引擎
│   │   ├── models.py            # ORM 模型（5 张表）
│   │   ├── schemas.py           # Pydantic 请求/响应模型
│   │   ├── auth.py              # JWT 签发/验证 + 密码哈希
│   │   ├── dependencies.py      # FastAPI 依赖（获取当前用户等）
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py          # /api/auth/*
│   │       ├── student.py       # /api/assignments/*
│   │       └── admin.py         # /api/admin/*
│   ├── requirements.txt
│   └── create_admin.py          # 命令行脚本：创建初始教师账号
├── frontend/                    # Vue 3 项目（后续步骤创建）
├── design.md
└── myInfo.md
```

### 步骤 1.2 创建 requirements.txt

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy==2.0.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
cos-python-sdk-v5==1.9.*
```

### 步骤 1.3 创建数据库模型 (models.py)

按照第六节的 5 张表（instructors, students, assignments, submissions, submission_files）+ audit_logs 创建 SQLAlchemy ORM 模型。

验收：运行 `python -c "from app.models import *"` 无报错。

---

## 阶段 2：认证系统

### 步骤 2.1 实现 auth.py

- `hash_password(plain)` → bcrypt 哈希
- `verify_password(plain, hashed)` → bool
- `create_access_token(data, role, expires)` → JWT 字符串
- `decode_access_token(token)` → payload dict
- 学生 token payload: `{"sub": student_id, "role": "student"}`
- 教师 token payload: `{"sub": instructor_id, "role": "instructor"}`

### 步骤 2.2 实现登录路由 (routers/auth.py)

- `POST /api/auth/student/login`：校验学号+姓名+密码，签发 JWT
  - 连续错误 5 次锁定 10 分钟（用内存计数器或 DB 记录）
- `POST /api/auth/instructor/login`：校验用户名+密码，签发 JWT

### 步骤 2.3 实现 dependencies.py

- `get_current_student(token)`：从 JWT 解析学生身份
- `get_current_instructor(token)`：从 JWT 解析教师身份

验收：用 curl 或 httpie 测试登录流程。

---

## 阶段 3：核心业务——作业与提交

### 步骤 3.1 学生端路由 (routers/student.py)

- `GET /api/assignments`：返回作业列表 + 当前学生提交状态
- `GET /api/assignments/{id}`：返回作业详情
- `POST /api/assignments/{id}/submit`：
  1. 校验截止时间（过期则根据 allow_late 决定是否拒绝）
  2. 校验文件类型和大小
  3. 计算 version_no = 当前最大版本 + 1
  4. 上传文件到腾讯 COS：`/{assignment_id}/{student_id}/v{version_no}/{filename}`
  5. 写入 submissions + submission_files 记录
  6. 写入 audit_logs
  7. 返回提交版本信息
- `GET /api/assignments/{id}/submissions`：返回自己的提交历史

### 步骤 3.2 实现 COS 上传工具函数

- 使用 `cos-python-sdk-v5`
- 封装 `upload_file_to_cos(local_path, cos_key)` → COS URL
- 封装 `generate_presigned_url(cos_key, expires=600)` → 临时下载 URL

验收：上传一个测试文件到 COS 并能通过预签名 URL 下载。

---

## 阶段 4：教师后台

### 步骤 4.1 学生管理 (routers/admin.py)

- `POST /api/admin/students/import`：解析 CSV（学号,姓名），批量插入 students 表
- `POST /api/admin/students/generate-passwords`：
  1. 为所有学生生成随机 8 位密码
  2. 返回 CSV 文件流（学号,姓名,密码明文）
  3. 将哈希存入数据库
- `POST /api/admin/students/{id}/reset-password`：生成新密码，返回明文，存哈希

### 步骤 4.2 作业管理

- `POST /api/admin/assignments`：新建作业
- `PUT /api/admin/assignments/{id}`：编辑作业

### 步骤 4.3 提交查看与下载

- `GET /api/admin/dashboard`：返回学生×作业矩阵数据
- `GET /api/admin/assignments/{id}/submissions`：该作业所有提交列表
- `GET /api/admin/assignments/{id}/download?mode=all`：
  1. 查询所有提交记录
  2. 从 COS 批量下载到临时目录
  3. 打包为 zip 返回
- `GET /api/admin/assignments/{id}/download?mode=latest`：
  1. 查询每个学生的 MAX(version_no) 提交
  2. 从 COS 下载对应文件
  3. 打包为 zip 返回

验收：教师能导入学生、创建作业、查看提交、下载压缩包。

---

## 阶段 5：前端开发

### 步骤 5.1 创建 Vue 3 项目

```bash
npm create vue@latest frontend
cd frontend && npm install
npm install axios vue-router pinia element-plus
```

### 步骤 5.2 页面结构

```
frontend/src/
├── views/
│   ├── student/
│   │   ├── Login.vue              # 学生登录页
│   │   ├── AssignmentList.vue     # 作业列表
│   │   ├── AssignmentDetail.vue   # 作业详情+上传
│   │   └── SubmissionHistory.vue  # 提交历史
│   └── admin/
│       ├── Login.vue              # 教师登录页
│       ├── Dashboard.vue          # 提交看板
│       ├── AssignmentManage.vue   # 作业管理
│       ├── StudentManage.vue      # 学生与密码管理
│       └── SubmissionDetail.vue   # 某作业提交详情
├── router/index.js
├── stores/auth.js                 # Pinia store：token 管理
├── utils/api.js                   # Axios 实例 + 拦截器
└── App.vue
```

### 步骤 5.3 实现各页面

按学生端→教师端顺序实现。每个页面调用对应 API。

验收：前端能完成完整的学生提交流程和教师管理流程。

---

## 阶段 6：部署

### 步骤 6.1 服务器环境准备（腾讯云 CVM <server-ip-or-domain>）

```bash
# SSH 登录服务器
sudo apt update && sudo apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx

# 创建项目目录
mkdir -p /opt/classroom
cd /opt/classroom

# Python 虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 步骤 6.2 配置 systemd 服务

创建 `/etc/systemd/system/classroom.service`，使用 uvicorn 运行 FastAPI。

### 步骤 6.3 配置 Nginx

```nginx
server {
    listen 80;
    server_name <你的域名或IP>;

    location / {
        root /opt/classroom/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50M;
    }
}
```

### 步骤 6.4 HTTPS（可选，需域名）

```bash
sudo certbot --nginx -d yourdomain.com
```

### 步骤 6.5 创建初始教师账号

```bash
cd /opt/classroom
source venv/bin/activate
python create_admin.py --username admin --password <安全密码>
```

验收：浏览器访问 http://<server-ip-or-domain> 能正常使用系统。

---
