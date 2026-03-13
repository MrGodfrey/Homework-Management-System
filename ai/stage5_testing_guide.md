# 阶段 5：测试验证指南

## 任务清单

- [ ] 1. 验证 Alembic 迁移可重复执行
- [ ] 2. 验证 COS 存储不覆盖历史文件
- [ ] 3. 验证接口参数语义一致性 ✅（代码检查已通过）
- [ ] 4. 更新项目文档

---

## 任务 1：验证 Alembic 数据库迁移

### 1.1 备份当前数据库
```bash
cd /Users/wangyu/code/classroom/backend
python3 backup_database.py
```
备份文件会保存到 `backend/backups/` 目录。

### 1.2 查看当前迁移版本
```bash
cd backend
alembic current
```

### 1.3 回滚测试（回退一个版本）
```bash
alembic downgrade -1
```

### 1.4 升级测试（恢复到最新版本）
```bash
alembic upgrade head
```

### 1.5 验证数据完整性
- 检查学生表数据是否完整
- 检查作业和提交记录是否正常
- 查看迁移历史：
```bash
alembic history --verbose
```

### 1.6 紧急恢复（如果出现问题）
```bash
# 恢复最近的备份
cp backups/classroom_backup_YYYYMMDD_HHMMSS.db ./classroom.db
```

---

## 任务 2：验证 COS 存储隔离与防覆盖

### 2.1 验证环境变量配置
```bash
cd backend
# 检查当前环境
python3 -c "from app.config import settings; print(f'ENV={settings.ENV}')"
```

### 2.2 测试本地环境（DEV）
确保 `.env` 或环境变量设置：
```
ENV=DEV
```

**测试步骤**：
1. 启动服务：`python3 start_local_test.py`
2. 学生登录并上传作业（同一作业上传3次）
3. 检查腾讯云 COS 控制台，路径应为：
   ```
   dev_env/submissions/{作业ID}/{学号}/YYYYMMDD_HHMMSS_xxx_文件名
   ```
4. 确认3个文件都存在，文件名不同（时间戳+UUID不同）

### 2.3 测试生产环境（PROD）
修改环境变量：
```
ENV=PROD
```

**测试步骤**：
1. 重启服务
2. 上传同一作业
3. 检查 COS 路径应为：
   ```
   prod_env/submissions/{作业ID}/{学号}/YYYYMMDD_HHMMSS_xxx_文件名
   ```
4. 确认 `dev_env/` 和 `prod_env/` 的文件互不影响

### 2.4 验证历史文件不被覆盖
- 上传同名文件多次
- 确认所有版本都保留在 COS 中
- 检查数据库 `submission_files` 表，每次提交应有不同的 `cos_key`

---

## 任务 3：验证接口参数语义一致性 ✅

### 自动检查结果（已通过）

| 接口 | 参数名 | 参数类型 | 含义 |
|------|--------|----------|------|
| `GET /api/assignments/me` | 返回 `student_id` | `str` | 学号 |
| `GET /admin/assignments/{id}/submissions/{student_no}/download` | `student_no` | `str` | 学号 |

✅ **结论**：参数命名统一使用学号字符串，语义一致，无需修改。

---

## 任务 4：更新项目文档

需要更新以下文档：

### 4.1 README.md
- [ ] 添加环境变量说明（`ENV=DEV` / `ENV=PROD`）
- [ ] 添加数据库备份恢复流程
- [ ] 添加 Alembic 迁移使用说明

### 4.2 设计文档
- [ ] 更新 API 接口列表（新增的 `/me`、单学生下载、CSV导出等）
- [ ] 添加 COS 存储隔离方案说明
- [ ] 添加数据库迁移策略

### 4.3 部署文档
- [ ] 生产环境部署清单
- [ ] 数据库迁移 SOP
- [ ] 环境变量配置清单

---

## 完成标准

所有任务完成后，确认：
- ✅ 数据库可以安全回滚和升级
- ✅ 测试环境和生产环境文件完全隔离
- ✅ 历史文件永不被覆盖
- ✅ 文档完整且与代码实现一致
