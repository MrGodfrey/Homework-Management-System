# DEV 和 PROD 环境切换指南

## 环境变量说明

系统通过 `ENV` 环境变量来区分开发环境和生产环境：
- **ENV=DEV** → 文件上传到 `dev_env/` 路径（开发测试）
- **ENV=PROD** → 文件上传到 `prod_env/` 路径（生产环境）

---

## 📌 方法 1：在 .env 文件中设置（推荐）

### 适用场景
适合长期使用某个环境，不需要频繁切换。

### 操作步骤

**编辑文件** [backend/.env](../backend/.env)：

```bash
# 在文件中添加这一行：
ENV=DEV
```

或者使用命令行快速添加：
```bash
# 设置为 DEV 环境
echo "ENV=DEV" >> backend/.env

# 设置为 PROD 环境（先删除旧配置）
sed -i '' '/^ENV=/d' backend/.env && echo "ENV=PROD" >> backend/.env
```

**重启服务**：
```bash
pkill -f uvicorn
python3 start_local_test.py
```

---

## 📌 方法 2：临时设置环境变量（推荐用于测试）

### 适用场景
快速切换环境测试，不修改配置文件。

### 操作步骤

**DEV 环境**：
```bash
# macOS/Linux
export ENV=DEV
python3 start_local_test.py
```

**PROD 环境**：
```bash
# macOS/Linux
export ENV=PROD
python3 start_local_test.py
```

**一次性运行**（命令执行后环境变量自动失效）：
```bash
# DEV
ENV=DEV python3 start_local_test.py

# PROD
ENV=PROD python3 start_local_test.py
```

---

## 📌 方法 3：修改启动脚本（持久化）

### 适用场景
希望启动脚本自动设置环境，不依赖 .env 文件。

### 操作步骤

编辑 `start_local_test.py`，在文件开头添加：

```python
# 在导入语句之后添加
import os

# 强制设置为 DEV 环境
os.environ['ENV'] = 'DEV'
```

---

## ✅ 验证当前环境

### 快速检查
```bash
cd backend
python3 -c "from app.config import settings; print(f'当前环境: {settings.ENV}')"
```

### 详细检查（包括 COS 配置）
```bash
cd backend
python3 -c "
from app.config import settings
print('=' * 50)
print(f'当前环境: {settings.ENV}')
print(f'COS 存储桶: {settings.COS_BUCKET}')
print(f'数据库: {settings.DATABASE_URL}')
print('=' * 50)
print(f'文件上传路径前缀: {\"dev_env\" if settings.ENV == \"DEV\" else \"prod_env\"}')
print('=' * 50)
"
```

---

## 🧪 测试环境隔离

### 完整测试流程

#### 1. 测试 DEV 环境
```bash
# 设置环境
export ENV=DEV

# 或在 .env 中设置
echo "ENV=DEV" >> backend/.env

# 启动服务
python3 start_local_test.py

# 验证环境
cd backend && python3 -c "from app.config import settings; print(settings.ENV)"
```

登录学生端，上传作业后，检查腾讯云 COS：
- 路径应为：`dev_env/submissions/{作业ID}/{学号}/文件名`

#### 2. 测试 PROD 环境
```bash
# 停止服务
pkill -f uvicorn

# 切换环境
export ENV=PROD

# 或修改 .env
sed -i '' '/^ENV=/d' backend/.env && echo "ENV=PROD" >> backend/.env

# 重启服务
python3 start_local_test.py

# 验证环境
cd backend && python3 -c "from app.config import settings; print(settings.ENV)"
```

再次上传作业，检查 COS：
- 路径应为：`prod_env/submissions/{作业ID}/{学号}/文件名`

#### 3. 验证隔离性
- ✅ `dev_env/` 和 `prod_env/` 的文件互不影响
- ✅ 切换环境不会覆盖对方的文件

---

## 🎯 推荐配置

### 开发阶段（当前）
```bash
# backend/.env
ENV=DEV
```

### 部署到服务器
```bash
# backend/.env
ENV=PROD
```

或者在服务器上设置环境变量：
```bash
# /etc/systemd/system/classroom.service
[Service]
Environment="ENV=PROD"
```

---

## ⚠️ 常见问题

### 1. 修改 .env 后不生效？
**原因**：服务还在运行，需要重启。
```bash
pkill -f uvicorn
python3 start_local_test.py
```

### 2. export ENV=PROD 不生效？
**原因**：每个新的终端会话需要重新设置。

**解决方案**：
- 写入 .env 文件（持久化）
- 或者使用一次性命令：`ENV=PROD python3 start_local_test.py`

### 3. 如何查看日志中的环境信息？
```bash
# 查看后端启动日志
cat backend_dev.log | head -20
```

启动时会自动加载 .env 配置。

---

## 📝 快速参考卡

| 操作 | 命令 |
|------|------|
| 查看当前环境 | `cd backend && python3 -c "from app.config import settings; print(settings.ENV)"` |
| 设置 DEV（临时） | `export ENV=DEV` |
| 设置 PROD（临时） | `export ENV=PROD` |
| 设置 DEV（持久） | `echo "ENV=DEV" >> backend/.env` |
| 设置 PROD（持久） | `sed -i '' '/^ENV=/d' backend/.env && echo "ENV=PROD" >> backend/.env` |
| 重启服务 | `pkill -f uvicorn && python3 start_local_test.py` |
