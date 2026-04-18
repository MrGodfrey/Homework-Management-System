<template>
  <AppShell role="instructor" display-name="教师账号" display-meta="班级名单与口令">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <span class="page-eyebrow">Student Management</span>
          <h1 class="page-title">学生管理</h1>
          <p class="page-subtitle">保留原有导入名单、添加学生、密码重置、密码下载和删除学生等完整流程。</p>
        </div>

        <div class="page-hero-actions">
          <el-upload
            :before-upload="importCSV"
            accept=".csv"
            :show-file-list="false"
            data-testid="student-import-upload"
          >
            <el-button>导入名单</el-button>
          </el-upload>
        </div>
      </section>

      <section class="toolbar-panel">
        <div class="toolbar-row">
          <el-button type="primary" @click="openAddDialog">添加学生</el-button>
          <el-button @click="generatePasswords" :loading="generating">批量重新生成密码</el-button>
          <el-button type="success" @click="downloadPasswords" :loading="downloading">下载密码</el-button>
        </div>

        <el-input v-model="search" placeholder="搜索姓名或学号" class="search-input">
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </section>

      <section class="summary-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><User /></el-icon>
            <span>学生人数</span>
          </div>
          <div class="summary-tile-value">{{ filteredStudents.length }}</div>
          <div class="summary-tile-hint">当前筛选结果中的学生总数</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Download /></el-icon>
            <span>口令导出</span>
          </div>
          <div class="summary-tile-value">{{ students.length > 0 ? 'Ready' : 'Idle' }}</div>
          <div class="summary-tile-hint">可随时导出最新密码文件</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Upload /></el-icon>
            <span>名单导入</span>
          </div>
          <div class="summary-tile-value">{{ students.length > 0 ? 'Active' : 'Empty' }}</div>
          <div class="summary-tile-hint">支持 CSV 批量录入学生</div>
        </article>
      </section>

      <section class="surface-card soft">
        <div class="section-header">
          <div>
            <h2 class="section-title">学籍列表</h2>
            <p class="section-subtitle">桌面端保留表格操作入口，移动端以信息卡片显示。</p>
          </div>
        </div>

        <div class="table-shell desktop-view">
          <el-table :data="filteredStudents" v-loading="loading" style="width: 100%">
            <el-table-column prop="id" label="ID" min-width="60" />
            <el-table-column prop="student_id" label="学号" min-width="130" />
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="password" label="密码" min-width="140" />
            <el-table-column label="操作" min-width="250" align="center">
              <template #default="{ row }">
                <div class="inline-actions">
                  <el-button size="small" type="primary" @click="openEditDialog(row)">编辑</el-button>
                  <el-button size="small" type="warning" @click="resetPassword(row)">重置密码</el-button>
                  <el-button size="small" type="danger" @click="deleteStudent(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="table-shell mobile-view">
          <div v-if="loading" class="card-stack">
            <el-skeleton v-for="item in 3" :key="item" animated :rows="4" />
          </div>

          <div v-else-if="filteredStudents.length === 0" class="empty-panel">
            暂无学生数据
          </div>

          <div v-else class="card-grid">
            <article v-for="student in filteredStudents" :key="student.id" class="list-card">
              <div class="list-card-header">
                <div>
                  <h3 class="list-card-title">{{ student.name }}</h3>
                  <p class="list-card-subtitle">{{ student.student_id }}</p>
                </div>
                <span class="id-pill">#{{ student.id }}</span>
              </div>

              <div class="password-card">
                <span class="meta-label">当前密码</span>
                <span class="mono-text">{{ student.password }}</span>
              </div>

              <div class="inline-actions card-actions">
                <el-button size="small" type="primary" style="flex: 1" @click="openEditDialog(student)">编辑</el-button>
                <el-button size="small" type="warning" style="flex: 1" @click="resetPassword(student)">重置密码</el-button>
                <el-button size="small" type="danger" style="flex: 1" @click="deleteStudent(student)">删除</el-button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <el-dialog
        v-model="dialogVisible"
        :title="isEditing ? '编辑学生' : '添加学生'"
        width="min(420px, 92vw)"
        :close-on-click-modal="false"
      >
        <el-form :model="dialogForm" label-width="80px" @submit.prevent>
          <el-form-item label="学号">
            <el-input v-model="dialogForm.student_id" placeholder="请输入学号" />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="dialogForm.name" placeholder="请输入姓名" />
          </el-form-item>
        </el-form>
        <template #footer>
          <div class="inline-actions" style="justify-content: flex-end">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitDialog" :loading="submitting">
              {{ isEditing ? '保存' : '添加' }}
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Download, Search, Upload, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const students = ref([])
const loading = ref(false)
const generating = ref(false)
const downloading = ref(false)
const search = ref('')

const dialogVisible = ref(false)
const isEditing = ref(false)
const submitting = ref(false)
const editingId = ref(null)
const dialogForm = ref({ student_id: '', name: '' })

const filteredStudents = computed(() => {
  const keyword = search.value.trim()
  if (!keyword) return students.value
  return students.value.filter(
    (student) => student.name.includes(keyword) || student.student_id.includes(keyword)
  )
})

async function loadStudents() {
  loading.value = true
  try {
    const res = await api.get('/admin/students')
    students.value = res.data
  } catch {
    ElMessage.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  isEditing.value = false
  editingId.value = null
  dialogForm.value = { student_id: '', name: '' }
  dialogVisible.value = true
}

function openEditDialog(student) {
  isEditing.value = true
  editingId.value = student.id
  dialogForm.value = { student_id: student.student_id, name: student.name }
  dialogVisible.value = true
}

async function submitDialog() {
  const { student_id, name } = dialogForm.value
  if (!student_id.trim() || !name.trim()) {
    ElMessage.warning('学号和姓名不能为空')
    return
  }
  submitting.value = true
  try {
    if (isEditing.value) {
      await api.put(`/admin/students/${editingId.value}`, { student_id: student_id.trim(), name: name.trim() })
      ElMessage.success('学生信息已更新')
    } else {
      await api.post('/admin/students', { student_id: student_id.trim(), name: name.trim() })
      ElMessage.success('学生添加成功，初始密码为学号')
    }
    dialogVisible.value = false
    loadStudents()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || (isEditing.value ? '更新失败' : '添加失败'))
  } finally {
    submitting.value = false
  }
}

async function deleteStudent(student) {
  try {
    await ElMessageBox.confirm(
      `确认删除学生 ${student.name}（${student.student_id}）？该操作不可撤销，学生的所有提交记录也将一并删除。`,
      '删除学生',
      { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }

  try {
    await ElMessageBox.confirm(
      `请再次确认：你真的要永久删除 ${student.name}（${student.student_id}）吗？`,
      '⚠️ 二次确认删除',
      { type: 'error', confirmButtonText: '确认删除', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }

  try {
    await api.delete(`/admin/students/${student.id}`)
    ElMessage.success(`已删除学生 ${student.name}`)
    loadStudents()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '删除失败')
  }
}

async function importCSV(file) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.post('/admin/students/import', formData)
    ElMessage.success(res.data.message)
    loadStudents()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '导入失败')
  }
  return false
}

async function generatePasswords() {
  try {
    await ElMessageBox.confirm('你确定要这么做吗？每一位学生的密码都会被修改', '批量重新生成密码', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  generating.value = true
  try {
    const res = await api.post('/admin/students/generate-passwords')
    ElMessage.success(res.data?.message || '密码批量重新生成成功')
    await loadStudents()
  } catch (e) {
    console.error('生成密码失败:', e)
    ElMessage.error(e.response?.data?.detail || '生成密码失败')
  } finally {
    generating.value = false
  }
}

async function downloadPasswords() {
  downloading.value = true
  try {
    const res = await api.get('/admin/students/download-passwords', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'passwords.csv'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('密码下载成功')
  } catch (e) {
    console.error('下载密码失败:', e)
    let errorMsg = '下载密码失败'
    if (e.response?.data instanceof Blob) {
      try {
        const text = await e.response.data.text()
        const json = JSON.parse(text)
        errorMsg = json.detail || errorMsg
      } catch {}
    } else if (e.response?.data?.detail) {
      errorMsg = e.response.data.detail
    }
    ElMessage.error(errorMsg)
  } finally {
    downloading.value = false
  }
}

async function resetPassword(student) {
  try {
    await ElMessageBox.confirm(`确认重置 ${student.name}（${student.student_id}）的密码？`, '重置密码', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
    const res = await api.post(`/admin/students/${student.id}/reset-password`)
    student.password = res.data.new_password
    ElMessageBox.alert(`新密码：<b>${res.data.new_password}</b>`, `${student.name} 的新密码`, {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '已记录'
    })
  } catch (e) {
    console.error('重置密码失败:', e)
    if (e !== 'cancel' && e.message !== 'cancel') {
      const errorMsg = e.response?.data?.detail || '重置失败'
      ElMessage.error(errorMsg)
    }
  }
}

onMounted(loadStudents)
</script>

<style scoped>
.toolbar-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: min(320px, 100%);
}

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

.password-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand);
  font-weight: 700;
}

.card-actions {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
</style>
