<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <el-button @click="$router.push('/admin/dashboard')" class="back-btn">
            <span class="back-icon">←</span>
            <span class="back-text">返回看板</span>
          </el-button>
        </div>
        <div class="header-center">
          <span class="title">作业管理</span>
          <span class="total-students" v-if="totalStudents > 0">({{ totalStudents }}人)</span>
        </div>
        <div class="header-actions">
          <el-button type="success" @click="exportAllGradesCSV" class="export-btn">
            <span class="btn-text">导出成绩</span>
            <span class="btn-icon">📊</span>
          </el-button>
          <el-button type="primary" @click="openCreate" class="create-btn">
            <span class="btn-text">+ 新建作业</span>
            <span class="btn-icon">+</span>
          </el-button>
        </div>
      </el-header>
      <el-main class="main-content">
        <!-- 桌面/平板端表格视图 -->
        <div class="desktop-view">
          <el-table :data="assignments" v-loading="loading" style="width:100%" :flexible="true">
            <el-table-column prop="id" label="ID" min-width="50" />
            <el-table-column prop="title" label="作业名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="截止时间" min-width="140">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="迟交" min-width="60" align="center">
              <template #default="{ row }">
                <el-tag :type="row.allow_late ? 'success' : 'danger'" size="small">
                  {{ row.allow_late ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="已提交" min-width="70" align="center">
              <template #default="{ row }">
                <span>{{ row.submitted_count || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已评分" min-width="70" align="center">
              <template #default="{ row }">
                <span>{{ row.graded_count || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="file_rules" label="文件规则" min-width="100" show-overflow-tooltip />
            <el-table-column label="操作" min-width="150">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button size="small" @click="openEdit(row)">编辑</el-button>
                  <el-button
                    size="small"
                    type="info"
                    @click="$router.push(`/admin/assignments/${row.id}/submissions`)"
                  >查看</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 移动端卡片视图 -->
        <div class="mobile-view" v-loading="loading">
          <div class="assignment-card" v-for="assignment in assignments" :key="assignment.id">
            <div class="card-header">
              <h3 class="card-title">{{ assignment.title }}</h3>
              <span class="card-id">#{{ assignment.id }}</span>
            </div>
            <div class="card-body">
              <div class="card-row">
                <span class="label">截止时间:</span>
                <span class="value">{{ formatDate(assignment.deadline) }}</span>
              </div>
              <div class="card-row">
                <span class="label">允许迟交:</span>
                <el-tag :type="assignment.allow_late ? 'success' : 'danger'" size="small">
                  {{ assignment.allow_late ? '是' : '否' }}
                </el-tag>
              </div>
              <div class="card-row">
                <span class="label">提交情况:</span>
                <span class="value stats">
                  已提交 <strong>{{ assignment.submitted_count || 0 }}</strong> / 
                  已评分 <strong>{{ assignment.graded_count || 0 }}</strong>
                </span>
              </div>
              <div class="card-row" v-if="assignment.file_rules">
                <span class="label">文件规则:</span>
                <span class="value file-rules">{{ assignment.file_rules }}</span>
              </div>
            </div>
            <div class="card-actions">
              <el-button size="small" @click="openEdit(assignment)" style="flex: 1;">编辑</el-button>
              <el-button
                size="small"
                type="info"
                @click="$router.push(`/admin/assignments/${assignment.id}/submissions`)"
                style="flex: 1;"
              >查看提交</el-button>
            </div>
          </div>
          <div class="empty-state" v-if="!loading && assignments.length === 0">
            <p>暂无作业</p>
          </div>
        </div>
      </el-main>
    </el-container>

    <el-dialog 
      v-model="dialogVisible" 
      :title="editingId ? '编辑作业' : '新建作业'" 
      :width="dialogWidth"
      class="assignment-dialog"
    >
      <el-form :model="form" :label-width="formLabelWidth">
        <el-form-item label="作业名称" required>
          <el-input v-model="form.title" placeholder="请输入作业名称" />
        </el-form-item>
        <el-form-item label="作业说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
        <el-form-item label="截止时间" required>
          <el-date-picker
            v-model="form.deadline"
            type="datetime"
            placeholder="选择截止日期时间"
            style="width:100%"
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
          <el-input 
            v-model="form.file_rules" 
            placeholder="或手动输入，逗号分隔" 
            style="margin-top:8px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div>
            <el-button 
              v-if="editingId" 
              type="danger" 
              plain
              :loading="deleting" 
              @click="handleDelete"
            >删除作业</el-button>
          </div>
          <div>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="saveAssignment">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const assignments = ref([])
const totalStudents = ref(0)
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const form = reactive({ title: '', description: '', deadline: null, allow_late: false, file_rules: '' })
const selectedFormats = ref(['.pdf', '.docx', '.md', '.txt', '.ipynb', '.py', '.zip'])

// 响应式窗口尺寸
const windowWidth = ref(window.innerWidth)
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadAssignments()
  loadTotalStudents()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 响应式计算属性
const dialogWidth = computed(() => {
  if (windowWidth.value < 576) return '95%'
  if (windowWidth.value < 768) return '90%'
  return '520px'
})

const formLabelWidth = computed(() => {
  if (windowWidth.value < 576) return '80px'
  return '100px'
})

// 监听勾选变化，自动更新 file_rules
watch(selectedFormats, (newVal) => {
  if (newVal.length > 0) {
    form.file_rules = newVal.join(',')
  }
}, { deep: true })

function formatDate(d) {
  if (!d) return '-'
  const date = new Date(d)
  const now = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  // 如果是今年，不显示年份
  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { title: '', description: '', deadline: null, allow_late: false, file_rules: '.pdf,.docx,.md,.txt,.ipynb,.py,.zip' })
  selectedFormats.value = ['.pdf', '.docx', '.md', '.txt', '.ipynb', '.py', '.zip']
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    title: row.title,
    description: row.description || '',
    deadline: row.deadline ? new Date(row.deadline) : null,
    allow_late: row.allow_late,
    file_rules: row.file_rules || ''
  })
  // 解析已有的 file_rules 设置到勾选框
  if (row.file_rules) {
    selectedFormats.value = row.file_rules.split(',').map(s => s.trim())
  } else {
    selectedFormats.value = []
  }
  dialogVisible.value = true
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
    // 静默失败，不影响主要功能
  }
}

async function handleDelete() {
  if (!editingId.value) return
  
  try {
    // 第一次确认
    await ElMessageBox.confirm(
      '你确定要删除吗？',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    deleting.value = true
    
    // 第一次尝试删除（不带force参数）
    const res = await api.delete(`/admin/assignments/${editingId.value}`)
    
    // 检查是否需要再次确认
    if (res.data.status === 'confirm_required') {
      deleting.value = false
      
      // 第二次确认（提示已有学生提交）
      await ElMessageBox.confirm(
        `已有学生上传作业，请问您确认删除吗？`,
        '删除确认',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true
        }
      )
      
      deleting.value = true
      
      // 强制删除
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
    // 用户取消操作
    if (error === 'cancel' || error === 'close') {
      return
    }
    // API错误
    ElMessage.error(error.response?.data?.detail || '删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* 基础样式 */
.page { 
  min-height: 100vh; 
  background: #f5f7fa; 
}

.app-header {
  height: auto !important;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  flex-shrink: 0;
}

.back-btn .back-icon {
  display: inline;
}

.back-btn .back-text {
  display: inline;
}

.header-center {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #303133; 
}

.total-students { 
  font-size: 14px; 
  font-weight: 400; 
  color: #909399; 
  margin-left: 8px;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-text {
  display: inline;
}

.btn-icon {
  display: none;
}

.main-content {
  padding: 20px;
  overflow-x: hidden;
}

/* 表格操作按钮 */
.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 桌面/平板端表格视图 */
.desktop-view {
  display: block;
  overflow-x: auto;
  width: 100%;
}

.desktop-view :deep(.el-table) {
  font-size: 14px;
  min-width: 100%;
}

.desktop-view :deep(.el-table th) {
  padding: 8px 0;
  font-size: 13px;
  white-space: nowrap;
}

.desktop-view :deep(.el-table td) {
  padding: 8px 0;
}

.desktop-view :deep(.el-button--small) {
  padding: 5px 10px;
  font-size: 13px;
}

/* 让文件规则列可以换行 */
.desktop-view :deep(.el-table__cell) {
  word-break: break-word;
}

/* ID和统计列保持简洁 */
.desktop-view :deep(.el-table__body .cell) {
  line-height: 1.4;
}

.mobile-view {
  display: none;
}

/* 移动端卡片样式 */
.assignment-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.assignment-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  flex: 1;
  word-break: break-word;
}

.card-id {
  font-size: 12px;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.card-row {
  display: flex;
  align-items: center;
  font-size: 14px;
  gap: 8px;
}

.card-row .label {
  color: #606266;
  font-weight: 500;
  min-width: 70px;
  flex-shrink: 0;
}

.card-row .value {
  color: #303133;
  flex: 1;
  word-break: break-word;
}

.card-row .stats strong {
  color: #409eff;
}

.card-row .file-rules {
  font-size: 12px;
  color: #909399;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
  font-size: 14px;
}

/* 对话框响应式样式 */
.assignment-dialog :deep(.el-dialog) {
  margin: 20px auto !important;
}

.format-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.format-checkboxes :deep(.el-checkbox) {
  margin: 0;
}

/* 平板/桌面端 (>= 768px) */
@media (min-width: 768px) {
  .desktop-view {
    display: block;
  }
  
  .mobile-view {
    display: none;
  }
  
  /* 确保表格不超出容器 */
  .desktop-view :deep(.el-table) {
    max-width: 100%;
  }
  
  /* 紧凑模式下的样式调整 */
  .desktop-view :deep(.el-table__cell) {
    padding-left: 6px;
    padding-right: 6px;
  }
}

/* 中等宽度屏幕优化 (768px - 1200px) */
@media (min-width: 768px) and (max-width: 1200px) {
  .app-header {
    padding: 10px 14px;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .title {
    font-size: 16px;
  }
  
  .total-students {
    font-size: 13px;
  }
  
  .desktop-view :deep(.el-table) {
    font-size: 13px;
  }
  
  .desktop-view :deep(.el-table th),
  .desktop-view :deep(.el-table td) {
    padding: 6px 0;
  }
  
  .desktop-view :deep(.el-table__cell) {
    padding-left: 4px;
    padding-right: 4px;
  }
  
  .desktop-view :deep(.el-button--small) {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .action-buttons {
    gap: 4px;
  }
  
  .header-actions :deep(.el-button) {
    padding: 8px 12px;
    font-size: 13px;
  }
}

/* 较窄屏幕 (768px - 960px) */
@media (min-width: 768px) and (max-width: 960px) {
  .header-actions {
    gap: 6px;
  }
  
  .header-actions :deep(.el-button span) {
    font-size: 12px;
  }
}

/* 移动端 (< 768px) */
@media (max-width: 768px) {
  .app-header {
    padding: 10px 12px;
    gap: 8px;
  }

  .header-center {
    order: -1;
    flex-basis: 100%;
    text-align: left;
    margin-bottom: 8px;
  }

  .title {
    font-size: 16px;
  }

  .total-students {
    font-size: 12px;
    margin-left: 4px;
  }

  .header-left {
    order: 1;
  }

  .header-actions {
    order: 2;
    gap: 8px;
  }

  .back-btn {
    padding: 8px 12px;
  }

  .export-btn,
  .create-btn {
    padding: 8px 12px;
  }

  .btn-text {
    display: none;
  }

  .btn-icon {
    display: inline;
    font-size: 18px;
  }

  .main-content {
    padding: 12px;
  }

  /* 切换到卡片视图 */
  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: block;
  }
}

/* 小手机 (< 576px) */
@media (max-width: 576px) {
  .app-header {
    padding: 8px 10px;
  }

  .header-center {
    margin-bottom: 6px;
  }

  .title {
    font-size: 15px;
  }

  .total-students {
    display: block;
    margin-left: 0;
    margin-top: 2px;
  }

  .back-btn {
    padding: 6px 10px;
    font-size: 14px;
  }

  .back-btn .back-text {
    display: none;
  }

  .export-btn,
  .create-btn {
    padding: 6px 10px;
    font-size: 14px;
  }

  .main-content {
    padding: 10px;
  }

  .assignment-card {
    padding: 12px;
    margin-bottom: 12px;
  }

  .card-title {
    font-size: 15px;
  }

  .card-row {
    font-size: 13px;
  }

  .card-row .label {
    min-width: 60px;
    font-size: 12px;
  }

  .card-actions :deep(.el-button) {
    font-size: 13px;
    padding: 6px 12px;
  }

  .assignment-dialog :deep(.el-dialog) {
    margin: 10px !important;
  }

  .format-checkboxes :deep(.el-checkbox__label) {
    font-size: 12px;
  }
}

/* 横屏手机优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .app-header {
    min-height: 50px;
  }

  .header-center {
    flex-basis: auto;
    order: 0;
    margin-bottom: 0;
  }

  .assignment-card {
    padding: 10px;
  }
}
</style>
