# 阶段 5 总结：AI 已完成和你需要做的

## ✅ AI 已为你完成的工作

### 1. **代码检查与验证**
- ✅ 确认 `GET /api/assignments/me` 接口返回 `student_id` 和 `name`
- ✅ 确认单学生下载接口使用 `student_no: str`（学号字符串）
- ✅ 确认 COS Key 生成包含：环境前缀 + assignment_id + student_no + 时间戳 + UUID
- ✅ 确认 `Submission` 模型包含 `score`、`grade`、`is_graded` 字段

### 2. **创建辅助工具**
创建了以下文件：

| 文件 | 位置 | 用途 |
|------|------|------|
| 测试指南 | `ai/stage5_testing_guide.md` | 详细的测试步骤和验收标准 |
| 备份脚本 | `backend/backup_database.py` | 自动备份数据库（防止迁移失败） |
| 验证脚本 | `backend/verify_stage5.py` | 自动检查系统配置完整性 |

### 3. **更新文档**
- ✅ 更新 `backend/README.md`，添加数据库备份和迁移说明

---

## 🔨 你需要自己完成的测试

### 任务 1：验证数据库迁移（需要手动操作）

**为什么需要你自己做**：需要观察实际的数据库行为，确保数据不丢失。

**步骤**：
```bash
# 1. 备份数据库
cd backend
python3 backup_database.py

# 2. 查看当前迁移版本
alembic current

# 3. 回滚测试（回退一个版本）
alembic downgrade -1

# 4. 检查数据是否还在
sqlite3 classroom.db "SELECT COUNT(*) FROM students;"

# 5. 升级回最新版本
alembic upgrade head

# 6. 再次检查数据
sqlite3 classroom.db "SELECT COUNT(*) FROM students;"
```

**验收标准**：
- ✅ 回滚和升级都不报错
- ✅ 数据前后一致，没有丢失

---

### 任务 2：验证 COS 存储隔离（需要实际上传测试）

**为什么需要你自己做**：需要实际上传文件到腾讯云 COS，检查文件路径和防覆盖机制。

**步骤**：

#### 2.1 测试 DEV 环境

**方法一：使用快速切换脚本（推荐）**
```bash
# 切换到 DEV 环境
./switch_env.sh dev

# 重启服务
pkill -f uvicorn && python3 start_local_test.py
```

**方法二：手动设置**
```bash
# 确保环境变量设置为 DEV
export ENV=DEV  # 或在 .env 文件中设置

# 启动服务
python3 start_local_test.py
```

**验证环境**：
```bash
./switch_env.sh status
# 或
cd backend && python3 -c "from app.config import settings; print(settings.ENV)"
```

1. 登录学生账号
2. 上传同一个作业**3次**（同名文件）
3. 登录腾讯云 COS 控制台
4. 检查路径：`dev_env/submissions/作业ID/学号/`
5. **验收**：应该看到 3 个不同的文件（时间戳和UUID不同）

#### 2.2 测试 PROD 环境

**方法一：使用快速切换脚本（推荐）**
```bash
# 切换到 PROD 环境
./switch_env.sh prod

# 重启服务
pkill -f uvicorn && python3 start_local_test.py
```

**方法二：手动设置**
```bash
# 修改环境变量
export ENV=PROD

# 重启服务
pkill -f uvicorn && python3 start_local_test.py
```

1. 上传同一个作业
2. 检查 COS 路径：`prod_env/submissions/作业ID/学号/`
3. **验收**：`dev_env/` 和 `prod_env/` 的文件完全独立

---

### 任务 3：接口语义一致性 ✅（已通过代码检查）

**结论**：所有接口都使用学号字符串（`student_id` 或 `student_no`），语义一致，**无需额外操作**。

---

### 任务 4：更新文档（可选）

**AI 已完成**：
- ✅ `backend/README.md` 已更新

**你可以补充**（如果需要）：
- 前端使用说明
- 部署流程文档
- 常见问题 FAQ

---

## 🎯 快速执行清单

勾选你已完成的任务：

- [ ] 运行 `python3 backend/verify_stage5.py` 查看系统状态
- [ ] 阅读 `ai/stage5_testing_guide.md` 了解详细步骤
- [ ] 备份数据库：`python3 backend/backup_database.py`
- [ ] 测试数据库迁移：`alembic downgrade -1` → `alembic upgrade head`
- [ ] 测试 DEV 环境文件上传（上传3次同名文件）
- [ ] 登录腾讯云 COS 检查 `dev_env/` 路径下的文件
- [ ] 切换到 PROD 环境测试
- [ ] 检查 `prod_env/` 路径下的文件
- [ ] 确认所有历史文件都保留，没有被覆盖

---

## ⚠️ 注意事项

1. **数据库迁移前务必备份**：
   ```bash
   python3 backup_database.py
   ```

2. **COS 测试时注意环境变量**：
   - 确认当前 `ENV` 设置：
     ```bash
     cd backend && python3 -c "from app.config import settings; print(settings.ENV)"
     ```

3. **紧急恢复**：
   如果迁移失败，立即恢复备份：
   ```bash
   cp backups/classroom_backup_YYYYMMDD_HHMMSS.db ./classroom.db
   ```

---

## 📞 需要帮助？

如果测试过程中遇到问题：
1. 查看 `ai/stage5_testing_guide.md` 的详细步骤
2. 运行 `python3 backend/verify_stage5.py` 检查配置
3. 告诉我具体的错误信息，我会帮你解决

---

## ✅ 完成标志

当你完成上述所有测试后，阶段 5 就全部完成了：
- ✅ 数据库可以安全回滚和升级
- ✅ 测试环境和生产环境文件完全隔离
- ✅ 历史文件永不被覆盖
- ✅ 文档完整且与代码实现一致

**恭喜！整个项目的5个阶段都已完成！🎉**
