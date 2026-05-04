<template>
  <AppShell role="instructor" display-name="教师账号" display-meta="作业发布与批改">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <h1 class="page-title">作业管理</h1>
        </div>

        <div class="page-hero-actions">
          <el-button type="success" :disabled="exportState.active" @click="exportAllGradesCSV">导出成绩</el-button>
          <el-button
            type="warning"
            plain
            :loading="exportState.active && exportState.mode === 'all'"
            :disabled="exportState.active && exportState.mode !== 'all'"
            @click="exportAllSubmissionsZip('all')"
          >
            导出所有作业
          </el-button>
          <el-button
            type="warning"
            :loading="exportState.active && exportState.mode === 'latest'"
            :disabled="exportState.active && exportState.mode !== 'latest'"
            @click="exportAllSubmissionsZip('latest')"
          >
            导出最新版
          </el-button>
          <el-button type="primary" @click="openCreate">新建作业</el-button>
        </div>
      </section>

      <section v-if="showExportProgress" class="export-progress-panel" aria-live="polite">
        <div class="export-progress-head">
          <div>
            <div class="export-progress-title">{{ exportModeLabel }}</div>
            <div class="export-progress-copy">{{ exportState.message }}</div>
          </div>
          <div class="export-progress-percent">{{ exportState.percent }}%</div>
        </div>
        <el-progress
          :percentage="exportState.percent"
          :stroke-width="10"
          :status="exportProgressStatus"
        />
        <div class="export-progress-meta">
          <span>已处理 {{ exportState.processedFiles }} / {{ exportState.totalFiles }} 个文件</span>
          <span v-if="exportState.skippedFiles > 0">{{ exportState.skippedFiles }} 个文件读取失败已跳过</span>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Document /></el-icon>
            <span>作业总数</span>
          </div>
          <div class="summary-tile-value">{{ assignments.length }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><User /></el-icon>
            <span>学生人数</span>
          </div>
          <div class="summary-tile-value">{{ totalStudents }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><FolderOpened /></el-icon>
            <span>附件能力</span>
          </div>
          <div class="summary-tile-value">{{ attachmentReadyCount }}</div>
        </article>
      </section>

      <section class="surface-card soft">
        <div class="section-header">
          <div>
            <h2 class="section-title">作业列表</h2>
          </div>
        </div>

        <div class="table-shell desktop-view">
          <el-table :data="assignments" v-loading="loading" style="width: 100%" :flexible="true">
            <el-table-column prop="id" label="ID" min-width="60" />
            <el-table-column prop="title" label="作业名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="截止时间" min-width="160">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="迟交" min-width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.allow_late ? 'success' : 'danger'" effect="light">
                  {{ row.allow_late ? '允许' : '禁止' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="已提交" min-width="90" align="center">
              <template #default="{ row }">{{ row.submitted_count || 0 }}</template>
            </el-table-column>
            <el-table-column label="已评分" min-width="90" align="center">
              <template #default="{ row }">{{ row.graded_count || 0 }}</template>
            </el-table-column>
            <el-table-column prop="file_rules" label="文件规则" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" min-width="170">
              <template #default="{ row }">
                <div class="inline-actions">
                  <el-button size="small" @click="openEdit(row)">编辑</el-button>
                  <el-button size="small" type="info" @click="$router.push(`/admin/assignments/${row.id}/submissions`)">查看</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="table-shell mobile-view">
          <div v-if="loading" class="card-stack">
            <el-skeleton v-for="item in 3" :key="item" animated :rows="4" />
          </div>

          <div v-else-if="assignments.length === 0" class="empty-panel">暂无作业</div>

          <div v-else class="card-stack">
            <article v-for="assignment in assignments" :key="assignment.id" class="list-card">
              <div class="list-card-header">
                <div>
                  <h3 class="list-card-title">{{ assignment.title }}</h3>
                  <p class="list-card-subtitle">截止于 {{ formatDate(assignment.deadline) }}</p>
                </div>
                <span class="id-pill">#{{ assignment.id }}</span>
              </div>

              <div class="info-list compact">
                <div class="meta-pair">
                  <span class="meta-label">迟交</span>
                  <span class="meta-value">{{ assignment.allow_late ? '允许' : '禁止' }}</span>
                </div>
                <div class="meta-pair">
                  <span class="meta-label">提交</span>
                  <span class="meta-value">已提交 {{ assignment.submitted_count || 0 }} / 已评分 {{ assignment.graded_count || 0 }}</span>
                </div>
                <div v-if="assignment.file_rules" class="meta-pair">
                  <span class="meta-label">文件规则</span>
                  <span class="meta-value mono-text">{{ assignment.file_rules }}</span>
                </div>
              </div>

              <div class="inline-actions card-actions">
                <el-button size="small" style="flex: 1" @click="openEdit(assignment)">编辑</el-button>
                <el-button size="small" type="info" style="flex: 1" @click="$router.push(`/admin/assignments/${assignment.id}/submissions`)">查看提交</el-button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <el-dialog v-model="dialogVisible" :title="editingId ? '编辑作业' : '新建作业'" width="min(720px, 94vw)" class="assignment-dialog">
        <el-form :model="form" label-width="96px">
          <el-form-item label="作业名称" required>
            <el-input v-model="form.title" placeholder="请输入作业名称" />
          </el-form-item>
          <el-form-item label="作业说明">
            <el-input v-model="form.description" type="textarea" :rows="4" placeholder="可选" />
          </el-form-item>
          <el-form-item label="截止时间" required>
            <el-date-picker
              v-model="form.deadline"
              type="datetime"
              placeholder="选择截止日期时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="允许迟交">
            <el-switch v-model="form.allow_late" />
          </el-form-item>
          <el-form-item label="允许格式">
            <el-checkbox-group v-model="selectedFormats" class="format-checkboxes">
              <el-checkbox label=".pdf">PDF</el-checkbox>
              <el-checkbox label=".docx">Word</el-checkbox>
              <el-checkbox label=".md">Markdown</el-checkbox>
              <el-checkbox label=".txt">文本</el-checkbox>
              <el-checkbox label=".ipynb">Jupyter</el-checkbox>
              <el-checkbox label=".py">Python</el-checkbox>
              <el-checkbox label=".zip">压缩包</el-checkbox>
            </el-checkbox-group>
            <el-input v-model="form.file_rules" placeholder="或手动输入，逗号分隔" style="margin-top: 10px" />
          </el-form-item>
          <el-alert
            class="upload-limit-alert"
            :title="`学生每次提交文件总大小上限：${uploadLimit.label}`"
            description="压缩包也计入总大小。布置作业时请提醒学生，超过上限需要重新压缩或分拆后再提交。"
            type="warning"
            :closable="false"
            show-icon
          />
          <el-form-item label="作业附件" v-if="editingId">
            <div class="attachment-panel">
              <el-upload
                :auto-upload="false"
                :on-change="handleAttachmentChange"
                :show-file-list="false"
                accept="*"
                data-testid="admin-attachment-upload"
              >
                <el-button size="small" type="primary" :loading="uploadingAttachment">
                  {{ uploadingAttachment ? '上传中...' : '上传附件' }}
                </el-button>
              </el-upload>

              <div v-if="attachmentFiles.length > 0" class="attachment-stack">
                <div v-for="file in attachmentFiles" :key="file.id" class="attachment-item">
                  <span class="attachment-name">📎 {{ file.filename }}</span>
                  <div class="inline-actions">
                    <el-button size="small" text @click="downloadAttachment(file)">下载</el-button>
                    <el-button size="small" text type="danger" @click="deleteAttachment(file.id)">删除</el-button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-inline">暂无附件</div>
            </div>
          </el-form-item>
          <el-alert
            v-if="!editingId"
            title="提示：请先保存作业后，再上传附件文件"
            type="info"
            :closable="false"
          />
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <div>
              <el-button
                v-if="editingId"
                type="danger"
                plain
                :loading="deleting"
                @click="handleDelete"
              >
                删除作业
              </el-button>
            </div>
            <div class="inline-actions">
              <el-button @click="dialogVisible = false">取消</el-button>
              <el-button type="primary" :loading="saving" @click="saveAssignment">保存</el-button>
            </div>
          </div>
        </template>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Document, FolderOpened, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'
import {
  DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES,
  formatFileSize,
  loadSubmissionUploadLimit
} from '@/utils/uploadLimits'

const assignments = ref([])
const totalStudents = ref(0)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const form = reactive({ title: '', description: '', deadline: null, allow_late: false, file_rules: '' })
const selectedFormats = ref(['.pdf', '.docx', '.md', '.txt', '.ipynb', '.py', '.zip'])
const attachmentFiles = ref([])
const uploadingAttachment = ref(false)
const EXPORT_POLL_INTERVAL_MS = 600
const exportPollingTimer = ref(null)
const exportResetTimer = ref(null)
const exportDownloadStarted = ref(false)
const exportState = reactive({
  active: false,
  jobId: null,
  mode: null,
  status: 'idle',
  percent: 0,
  processedFiles: 0,
  totalFiles: 0,
  skippedFiles: 0,
  filename: '',
  message: ''
})
const uploadLimit = reactive({
  maxBytes: DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES,
  label: formatFileSize(DEFAULT_SUBMISSION_UPLOAD_LIMIT_BYTES)
})

const attachmentReadyCount = computed(() => assignments.value.filter((item) => item.id).length)
const showExportProgress = computed(() => exportState.active || ['complete', 'failed'].includes(exportState.status))
const exportModeLabel = computed(() => (exportState.mode === 'all' ? '导出所有作业' : '导出最新版'))
const exportProgressStatus = computed(() => {
  if (exportState.status === 'failed') return 'exception'
  if (exportState.status === 'complete') return 'success'
  return undefined
})

watch(
  selectedFormats,
  (newVal) => {
    if (newVal.length > 0) {
      form.file_rules = newVal.join(',')
    }
  },
  { deep: true }
)

function formatDate(d) {
  if (!d) return '-'
  const date = new Date(d)
  const now = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function openCreate() {
  editingId.value = null
  attachmentFiles.value = []
  Object.assign(form, {
    title: '',
    description: '',
    deadline: null,
    allow_late: false,
    file_rules: '.pdf,.docx,.md,.txt,.ipynb,.py,.zip'
  })
  selectedFormats.value = ['.pdf', '.docx', '.md', '.txt', '.ipynb', '.py', '.zip']
  dialogVisible.value = true
}

async function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    title: row.title,
    description: row.description || '',
    deadline: row.deadline ? new Date(row.deadline) : null,
    allow_late: row.allow_late,
    file_rules: row.file_rules || ''
  })
  selectedFormats.value = row.file_rules ? row.file_rules.split(',').map((s) => s.trim()) : []
  await loadAttachments(row.id)
  dialogVisible.value = true
}

async function loadAttachments(assignmentId) {
  try {
    const res = await api.get(`/admin/assignments/${assignmentId}/with-files`)
    attachmentFiles.value = res.data.attachment_files || []
  } catch (e) {
    console.error('Failed to load attachments:', e)
    attachmentFiles.value = []
  }
}

async function handleAttachmentChange(file) {
  if (!editingId.value) {
    ElMessage.warning('请先保存作业')
    return
  }

  uploadingAttachment.value = true
  try {
    const formData = new FormData()
    formData.append('file', file.raw)

    const res = await api.post(`/admin/assignments/${editingId.value}/upload-attachment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    attachmentFiles.value.push(res.data)
    ElMessage.success('附件上传成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '上传失败')
  } finally {
    uploadingAttachment.value = false
  }
}

async function downloadAttachment(file) {
  try {
    const res = await api.get(`/admin/assignments/${editingId.value}/attachments/${file.id}/download`)
    window.open(res.data.download_url, '_blank')
  } catch {
    ElMessage.error('获取下载链接失败')
  }
}

async function deleteAttachment(fileId) {
  try {
    await ElMessageBox.confirm('确定删除此附件吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await api.delete(`/admin/assignments/${editingId.value}/attachments/${fileId}`)
    attachmentFiles.value = attachmentFiles.value.filter((file) => file.id !== fileId)
    ElMessage.success('附件删除成功')
  } catch (e) {
    if (e !== 'cancel' && e !== 'close') {
      ElMessage.error('删除失败')
    }
  }
}

async function saveAssignment() {
  if (!form.title || !form.deadline) {
    ElMessage.warning('请填写作业名称和截止时间')
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title,
      description: form.description,
      deadline: form.deadline instanceof Date ? form.deadline.toISOString() : form.deadline,
      allow_late: form.allow_late,
      file_rules: form.file_rules
    }
    if (editingId.value) {
      await api.put(`/admin/assignments/${editingId.value}`, payload)
      ElMessage.success('修改成功')
    } else {
      await api.post('/admin/assignments', payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadAssignments()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function exportAllGradesCSV() {
  try {
    const res = await api.get('/admin/export_all_grades_csv', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'all_grades.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('CSV 导出成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '导出失败')
  }
}

function clearExportPolling() {
  if (exportPollingTimer.value) {
    window.clearInterval(exportPollingTimer.value)
    exportPollingTimer.value = null
  }
}

function clearExportResetTimer() {
  if (exportResetTimer.value) {
    window.clearTimeout(exportResetTimer.value)
    exportResetTimer.value = null
  }
}

function resetExportState() {
  clearExportPolling()
  clearExportResetTimer()
  exportDownloadStarted.value = false
  Object.assign(exportState, {
    active: false,
    jobId: null,
    mode: null,
    status: 'idle',
    percent: 0,
    processedFiles: 0,
    totalFiles: 0,
    skippedFiles: 0,
    filename: '',
    message: ''
  })
}

function applyExportProgress(data) {
  exportState.jobId = data.job_id || exportState.jobId
  exportState.mode = data.mode || exportState.mode
  exportState.status = data.status || exportState.status
  exportState.percent = Math.max(0, Math.min(100, Number(data.percent || 0)))
  exportState.processedFiles = Number(data.processed_files || 0)
  exportState.totalFiles = Number(data.total_files || 0)
  exportState.skippedFiles = Number(data.skipped_files || 0)
  exportState.filename = data.filename || exportState.filename
  exportState.message = data.message || exportState.message
}

function scheduleExportReset() {
  clearExportResetTimer()
  exportResetTimer.value = window.setTimeout(() => {
    resetExportState()
  }, 1800)
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function handleExportFailure(error) {
  clearExportPolling()
  exportState.active = false
  exportState.status = 'failed'
  exportState.message = error?.response?.data?.detail || error?.message || '导出失败'
  ElMessage.error(exportState.message)
  scheduleExportReset()
}

async function downloadCompletedExport() {
  if (!exportState.jobId || exportDownloadStarted.value) return
  exportDownloadStarted.value = true
  clearExportPolling()

  try {
    const res = await api.get(`/admin/assignments/download-all/jobs/${exportState.jobId}/file`, {
      responseType: 'blob'
    })
    triggerBlobDownload(new Blob([res.data], { type: 'application/zip' }), exportState.filename || 'assignments.zip')
    exportState.active = false
    exportState.status = 'complete'
    exportState.percent = 100
    exportState.message = '下载已开始'
    ElMessage.success('作业导出成功')
    scheduleExportReset()
  } catch (e) {
    exportDownloadStarted.value = false
    handleExportFailure(e)
  }
}

async function pollExportJob() {
  if (!exportState.jobId || exportDownloadStarted.value) return

  try {
    const res = await api.get(`/admin/assignments/download-all/jobs/${exportState.jobId}`)
    applyExportProgress(res.data)

    if (exportState.status === 'complete') {
      await downloadCompletedExport()
    } else if (exportState.status === 'failed') {
      throw new Error(exportState.message || '导出失败')
    }
  } catch (e) {
    handleExportFailure(e)
  }
}

async function exportAllSubmissionsZip(mode) {
  if (exportState.active) return

  resetExportState()
  exportState.active = true
  exportState.mode = mode
  exportState.status = 'pending'
  exportState.message = '正在创建导出任务'

  try {
    const res = await api.post('/admin/assignments/download-all/jobs', null, { params: { mode } })
    applyExportProgress(res.data)
    exportState.active = true
    await pollExportJob()
    if (exportState.active && !exportPollingTimer.value) {
      exportPollingTimer.value = window.setInterval(pollExportJob, EXPORT_POLL_INTERVAL_MS)
    }
  } catch (e) {
    handleExportFailure(e)
  }
}

async function loadAssignments() {
  loading.value = true
  try {
    const res = await api.get('/admin/assignments')
    assignments.value = res.data
  } catch {
    ElMessage.error('加载作业列表失败')
  } finally {
    loading.value = false
  }
}

async function loadTotalStudents() {
  try {
    const res = await api.get('/admin/students')
    totalStudents.value = res.data.length
  } catch {
    // ignore
  }
}

async function loadUploadLimit() {
  const limit = await loadSubmissionUploadLimit(api)
  uploadLimit.maxBytes = limit.maxBytes
  uploadLimit.label = limit.label
}

async function handleDelete() {
  if (!editingId.value) return

  try {
    await ElMessageBox.confirm('你确定要删除吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    deleting.value = true
    const res = await api.delete(`/admin/assignments/${editingId.value}`)

    if (res.data.status === 'confirm_required') {
      deleting.value = false

      await ElMessageBox.confirm('已有学生上传作业，请问您确认删除吗？', '删除确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
        distinguishCancelAndClose: true
      })

      deleting.value = true
      const forceRes = await api.delete(`/admin/assignments/${editingId.value}?force=true`)

      if (forceRes.data.status === 'success') {
        ElMessage.success(forceRes.data.message || '删除成功')
        dialogVisible.value = false
        loadAssignments()
      }
    } else if (res.data.status === 'success') {
      ElMessage.success(res.data.message || '删除成功')
      dialogVisible.value = false
      loadAssignments()
    }
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return
    }
    ElMessage.error(error.response?.data?.detail || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadUploadLimit()
  loadAssignments()
  loadTotalStudents()
})

onBeforeUnmount(() => {
  clearExportPolling()
  clearExportResetTimer()
})
</script>

<style scoped>
.id-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 800;
}

.card-actions {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.attachment-panel {
  width: 100%;
  display: grid;
  gap: 14px;
}

.upload-limit-alert {
  margin: 0 0 18px;
}

.export-progress-panel {
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.export-progress-head,
.export-progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.export-progress-title {
  color: var(--text-strong);
  font-size: 0.96rem;
  font-weight: 800;
}

.export-progress-copy,
.export-progress-meta {
  color: var(--text-muted);
  font-size: 0.86rem;
  font-weight: 600;
}

.export-progress-copy {
  margin-top: 4px;
}

.export-progress-percent {
  color: var(--brand);
  font-size: 1rem;
  font-weight: 800;
  white-space: nowrap;
}

.attachment-stack {
  display: grid;
  gap: 10px;
}

.empty-inline {
  color: var(--text-soft);
  font-size: 0.92rem;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

@media (max-width: 640px) {
  .dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .export-progress-head,
  .export-progress-meta {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
