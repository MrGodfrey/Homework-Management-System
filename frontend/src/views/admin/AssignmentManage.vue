<template>
  <AppShell role="instructor" display-name="教师账号" display-meta="作业发布与批改">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <h1 class="page-title">作业管理</h1>
        </div>

        <div class="page-hero-actions">
          <el-button type="success" @click="exportAllGradesCSV">导出成绩</el-button>
          <el-button type="primary" @click="openCreate">新建作业</el-button>
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
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { Document, FolderOpened, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

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

const attachmentReadyCount = computed(() => assignments.value.filter((item) => item.id).length)

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
  loadAssignments()
  loadTotalStudents()
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
}
</style>
