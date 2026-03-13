# 本地测试指南

根据项目文档和当前架构（FastAPI 后端 + Vue 3 前端），以下是在本地运行和测试该作业提交系统的方法：

## 1. 准备环境配置

在后端目录中，你需要准备环境变量配置文件 `.env`（可以在 `backend` 目录下创建）：

```ini
# .env 示例配置
SECRET_KEY=your_super_secret_key
COS_SECRET_ID=your_tencent_cos_secret_id
COS_SECRET_KEY=your_tencent_cos_secret_key
COS_REGION=ap-guangzhou
COS_BUCKET=your_bucket_name-1250000000
```

## 2. 启动后端 (FastAPI)

后端以 Python FastAPI 编写，使用 SQLite 作为本地数据库。

1. **进入后端目录**:
   ```bash
   cd backend
   ```
2. **创建并激活虚拟环境**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # macOS/Linux
   # 或者在 Windows 上使用: venv\Scripts\activate
   ```
3. **安装依赖**:
   ```bash
   pip install -r requirements.txt
   ```
4. **初始化数据（创建超级管理员账号）**:
   ```bash
   python create_admin.py
   ```
5. **启动后端服务**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   > 启动后，可以访问 http://127.0.0.1:8000/docs 查看自动生成的 API 文档 (Swagger UI) 并直接测试接口。
 > 可能正好命令强行删掉这个实例 pgrep -af uvicorn && pkill -f uvicorn
 > 或者可以更换一个端口号，如 `--port 8001`。


关于“直接测试接口”的说明

“直接测试接口”指的是利用 FastAPI 自带的交互式 API 文档（基于 Swagger UI）来向后端发送真实的 HTTP 请求，而**不需要写前端代码，也不需要使用 Postman 或 curl 等额外的工具**。

具体步骤如下：

1. 当你在浏览器中打开 `http://127.0.0.1:8000/docs` 时，你会看到一个网页，上面列出了你后端代码中定义的所有路由（比如登录、获取学生列表、上传文件）。
2. 你可以展开任意一个接口，点击 **"Try it out"**（尝试一下）按钮。
3. 接着，页面会提供输入框让你填写这个接口需要的参数（比如请求体中的用户名和密码 JSON、查询参数或文件上传等）。
4. 填写完毕后点击 **"Execute"**（执行），页面就会向你本地运行的后端发起真实的请求，并直接在网页上展示后端的返回结果（成功的数据、报错信息、状态码等）。

这样可以让你在**启动前端项目（Vue 3）之前**，就独立验证后端的逻辑（如鉴权、数据库读写、COS 上传）是否正常工作。

## 3. 启动前端 (Vue 3)

前端基于 Vue 3 + Vite 开发。

1. **进入前端目录**:
   ```bash
   cd frontend
   ```
2. **安装 Node 依赖**:
   ```bash
   npm install
   ```
3. **配置前端代理 (可选)**:
   > 确保 `frontend/vite.config.js` 中已经配置了代理，将 `/api` 的请求转发到 `http://127.0.0.1:8000`。
4. **启动开发服务器**:
   ```bash
   npm run dev
   ```
   > 运行成功后，会在终端输出本地访问地址（类似 http://localhost:5173）。



## 4. 核心流程测试

打开前端开发页面（例如 http://localhost:5173），按以下流程测试功能：

1. **教师端流程**:
   - 访问 `/admin/login`，使用第一步 `create_admin.py` 创建的管理员账号登录。
   - 导入学生名单（生成初始账号并设置密码）。
   - 创建一个新的作业，设置截止时间、文件要求等。
   - 检查提交看板和日志流。
2. **学生端流程**:
   - 打开新的无痕浏览窗口，访问 `/login`，使用上面生成的学生学号和密码登录。
   - 在“作业列表”查看教师布置的作业。
   - 尝试上传符合要求的文件，完成提交。
   - 查看“提交历史”并尝试通过预签名链接下载刚刚提交的文件。
3. **闭环验证**:
   - 切换回教师端，验证刚才学生的提交是否显示在了看板上，并尝试打包下载提交文件。

 