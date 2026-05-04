# AI 辅助评阅 Goal

本目标以 [改进清单.md](./改进清单.md) 为产品和技术方案来源。本文只定义执行 checklist 和完成判断标准，不重写方案正文。

## Goal

实现一个教师端手动触发的 AI 辅助评阅能力：教师可以为作业配置 AI 评分参考，并对学生某次提交版本或一批提交版本手动生成 AI 初评；AI 结果只给教师参考，绑定具体 `Submission` 版本，不自动覆盖教师最终分数，学生端不展示 AI 流程、AI 报告或 AI 分数。

## checklist.md

- [x] 完成数据库变更前安全确认：当前 DB 引擎和路径、备份位置、恢复命令、migration 路径、rollback 路径。
- [x] 新增 AI 评分参考配置，且该配置仅 admin 接口可读写，学生端接口不返回。
- [x] 新增 AI 评阅任务和结果存储，AI 结果绑定 `submission_id` 和 `version_no`，不写入 `Submission.score`。
- [x] 接入 TokenHub Chat Completions，默认模型为 `deepseek-v4-flash`，key 只从 `.env` 或服务环境读取。
- [x] 所有 AI 调用只允许教师端手动触发，包括单个版本、批量生成和重新生成。
- [x] 学生提交接口不创建 AI 任务、不入队、不调用 TokenHub、不通过后台扫描补触发。
- [x] `.ipynb` 解析只保留 markdown cell source 和 code cell source，不执行代码，不读取 outputs、attachments、图片或 base64。
- [x] 上传阶段禁止压缩包；历史压缩包在 AI 评阅阶段直接跳过，不解压、不送模型。
- [x] 教师端可保存 AI 评分参考，可查看 AI 状态、建议分和报告，可将 AI 分数填入最终分数输入框但不自动保存。
- [x] 学生端只显示教师最终分数，不显示 AI 状态、AI 报告、AI 建议分。
- [x] 增加调用限制、字符/token 限制、失败状态、错误信息和必要日志脱敏。
- [x] 增加后端测试，覆盖版本绑定、手动触发、学生端不可见、压缩包跳过、notebook 提取和最终分不被 AI 覆盖。
- [x] 增加或更新前端/E2E 测试，覆盖教师端 AI 操作和学生端不可见性。
- [x] 本地测试全部通过。
- [x] 在线部署和线上烟测全部通过。

## 执行记录

- 生产安全确认：`./deploy.sh` 远端预检输出 `DATABASE_URL=sqlite:///./classroom.db`，实际 DB 文件 `/home/ubuntu/classroom/backend/classroom.db`，备份 `/home/ubuntu/classroom/backend/backups/classroom_backup_20260504_212513.db`，恢复命令 `cd /home/ubuntu/classroom/backend && cp backups/classroom_backup_20260504_212513.db ./classroom.db`，迁移命令 `alembic upgrade head`，回滚命令 `alembic downgrade -1`。
- 生产部署：`./deploy.sh` 已按 `backup DB -> verify backup exists -> sync code -> install deps -> migrate -> restart -> smoke test` 执行，Alembic 从 `6c9664356acb` 升级到 `91c7b6879b9c (head)`，脚本内置远端 smoke test 通过。
- 本地测试：`npm run setup:test-env`、`npm run test:backend`、`npm --prefix frontend run build`、`npm run test:web` 均通过；`ENV=DEV python start_local_test.py` 已验证可启动本地预览。
- 生产配置补充：线上首次 AI smoke 发现 `TENCENT_MODEL_KEY_SECRET` 未配置到后端运行环境；已将本地 `.env` 中的 AI 模型相关键同步到生产 `/home/ubuntu/classroom/backend/.env`，并先备份为 `/home/ubuntu/classroom/backend/.env.backup_ai_20260504_213305`，随后重启 `classroom-backend` 确认 active。
- 应用级线上烟测：`scripts/smoke_ai_online.py --confirm-production-write` 已通过，覆盖线上学生 Markdown/Notebook 提交、压缩包拒绝、学生提交后不自动生成 AI、教师保存 AI 评分参考、单个版本 AI 初评、批量 AI 初评、Notebook outputs/images/attachments 忽略、教师保存最终分、学生端不展示 AI 字段且只展示最终分。临时 smoke 作业和学生已清理，复查剩余 smoke 记录为 0。
## 完成判断标准

Goal 只有在以下条件全部满足时才算完成：

1. [改进清单.md](./改进清单.md) 中的核心边界全部满足：教师手动触发、按提交版本绑定、学生端不可见、AI 不自动评分、不看图片、不处理压缩包。
2. 教师最终评分仍由现有评分流程保存，AI 建议分不会自动写入最终成绩。
3. 同一学生同一作业的多个提交版本可以分别生成、查看和复用各自的 AI 初评。
4. 学生提交作业后，系统不会自动发起任何 AI 请求。
5. `.ipynb` 大文件不会把 outputs、图片、base64 拼进 prompt；超长内容会被截断或摘要，并在报告中标记。
6. 压缩包上传被拒绝；历史压缩包被 AI 评阅跳过。
7. `.env`、API key、数据库文件、备份文件和导出的密码 CSV 没有被提交或同步。
8. 本地测试通过，且失败项不能只记录为“已知问题”后绕过。
9. 在线部署按生产安全顺序执行并通过线上烟测。

## 本地测试要求

本地完成前至少通过：

```bash
npm run setup:test-env
npm run test:backend
npm --prefix frontend run build
npm run test:web
```

如果 Playwright 依赖缺失，先运行：

```bash
npm run test:web:install
```

本地人工烟测还应覆盖：

- `ENV=DEV python start_local_test.py` 可以启动本地预览。
- 学生提交普通文本/Markdown/Notebook 文件成功。
- 学生提交压缩包被拒绝。
- 学生提交后不会生成 AI 初评。
- 教师手动触发单个版本 AI 初评成功。
- 教师手动触发批量 AI 初评成功。
- 教师保存最终分数后，学生端只看到最终分数。

## 在线测试要求

上线前必须遵守生产部署顺序：

```text
backup DB -> verify backup exists -> sync code -> install deps -> migrate -> restart -> smoke test
```

在线完成前至少满足：

- `./deploy.sh` 成功完成，脚本自带远端 smoke test 通过。
- 生产 DB 备份文件已确认存在，并记录恢复命令。
- 线上学生提交普通文件成功，且提交后不触发 AI。
- 线上学生提交压缩包被拒绝。
- 线上教师可以保存 AI 评分参考。
- 线上教师可以手动生成单个版本 AI 初评。
- 线上教师可以手动批量生成 AI 初评。
- 线上 notebook 评阅只使用 markdown/code cell source，不读取图片。
- 线上学生端不展示 AI 状态、报告或建议分。
- 线上教师保存最终分数后，学生端只展示最终分数。
