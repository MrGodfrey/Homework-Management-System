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
          <span class="title">学生管理 <span class="student-count" v-if="students.length > 0">({{ students.length }}人)</span></span>
        </div>
        <div class="header-actions">
          <el-upload
            :before-upload="importCSV"
            accept=".csv"
            :show-file-list="false"
            data-testid="student-import-upload"
          >
            <el-button type="primary" class="import-btn">
              <span class="btn-text">导入名单</span>
              <span class="btn-icon">📥</span>
            </el-button>
          </el-upload>
        </div>
      </el-header>
      <el-main class="main-content">
        <div class="action-bar">
          <el-button @click="openAddDialog" type="primary" class="add-btn">
            <span class="btn-text">添加学生</span>
            <span class="btn-icon">➕</span>
          </el-button>
          <el-button @click="generatePasswords" :loading="generating" class="gen-pwd-btn">
            <span class="btn-text">批量重新生成密码</span>
            <span class="btn-icon">🔑</span>
          </el-button>
          <el-button @click="downloadPasswords" :loading="downloading" class="dl-pwd-btn" type="success">
            <span class="btn-text">下载密码</span>
            <span class="btn-icon">⬇️</span>
          </el-button>
        </div>
        
        <!-- 桌面/平板端表格视图 -->
        <div class="desktop-view">
          <el-table :data="students" v-loading="loading" style="width:100%">
            <el-table-column prop="id" label="ID" min-width="50" />
            <el-table-column prop="student_id" label="学号" min-width="120" />
            <el-table-column prop="name" label="姓名" min-width="100" />
            <el-table-column prop="password" label="密码" min-width="120" />
            <el-table-column label="操作" min-width="240" align="center">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button size="small" type="primary" @click="openEditDialog(row)">编辑</el-button>
                  <el-button size="small" type="warning" @click="resetPassword(row)">重置密码</el-button>
                  <el-button size="small" type="danger" @click="deleteStudent(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 移动端卡片视图 -->
        <div class="mobile-view" v-loading="loading">
          <div class="student-card" v-for="student in students" :key="student.id">
            <div class="card-header">
              <div class="student-info">
                <h3 class="student-name">{{ student.name }}</h3>
                <span class="student-id-badge">{{ student.student_id }}</span>
              </div>
              <span class="student-id-label">#{{ student.id }}</span>
            </div>
            <div class="student-password">
              <span class="password-label">密码：</span>
              <span class="password-value">{{ student.password }}</span>
            </div>
            <div class="card-actions">
              <el-button size="small" type="primary" @click="openEditDialog(student)">
                编辑
              </el-button>
              <el-button size="small" type="warning" @click="resetPassword(student)">
                重置密码
              </el-button>
              <el-button size="small" type="danger" @click="deleteStudent(student)">
                删除
              </el-button>
            </div>
          </div>
          <div class="empty-state" v-if="!loading && students.length === 0">
            <p>暂无学生数据</p>
            <p class="hint">请使用"导入名单"或"添加学生"功能添加学生</p>
          </div>
        </div>

        <!-- 添加/编辑学生对话框 -->
        <el-dialog
          v-model="dialogVisible"
          :title="isEditing ? '编辑学生' : '添加学生'"
          width="400px"
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
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitDialog" :loading="submitting">
              {{ isEditing ? '保存' : '添加' }}
            </el-button>
          </template>
        </el-dialog>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const students = ref([])
const loading = ref(false)
const generating = ref(false)
const downloading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const isEditing = ref(false)
const submitting = ref(false)
const editingId = ref(null)
const dialogForm = ref({ student_id: '', name: '' })

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
  // 第一次确认
  try {
    await ElMessageBox.confirm(
      `确认删除学生 ${student.name}（${student.student_id}）？该操作不可撤销，学生的所有提交记录也将一并删除。`,
      '删除学生',
      { type: 'warning', confirmButtonText: '继续', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
    )
  } catch {
    return
  }
  // 第二次确认
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
    await ElMessageBox.confirm(
      '你确定要这么做吗？每一位学生的密码都会被修改',
      '批量重新生成密码',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
  } catch (e) {
    // 用户取消操作
    return
  }
  
  generating.value = true
  try {
    const res = await api.post('/admin/students/generate-passwords')
    ElMessage.success(res.data?.message || '密码批量重新生成成功')
    // 刷新学生列表以显示新密码
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
    await ElMessageBox.confirm(
      `确认重置 ${student.name}（${student.student_id}）的密码？`,
      '重置密码',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    const res = await api.post(`/admin/students/${student.id}/reset-password`)
    // 立即更新本地显示的密码
    student.password = res.data.new_password
    ElMessageBox.alert(
      `新密码：<b>${res.data.new_password}</b>`,
      `${student.name} 的新密码`,
      { dangerouslyUseHTMLString: true, confirmButtonText: '已记录' }
    )
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

.student-count {
  font-size: 14px;
  font-weight: 400;
  color: #909399;
  margin-left: 8px;
}

.header-actions { 
  display: flex; 
  gap: 8px;
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

.action-bar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 桌面/平板端表格视图 */
.desktop-view {
  display: block;
  overflow-x: auto;
}

.desktop-view :deep(.el-table) {
  font-size: 14px;
}

.desktop-view :deep(.el-table th) {
  padding: 8px 0;
  font-size: 13px;
}

.desktop-view :deep(.el-table td) {
  padding: 8px 0;
}

.desktop-view :deep(.el-button--small) {
  padding: 5px 12px;
  font-size: 13px;
}

.table-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  justify-content: center;
  align-items: center;
}

/* 移动端卡片视图 */
.mobile-view {
  display: none;
}

.student-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.student-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.student-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.student-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.student-id-badge {
  font-size: 13px;
  color: #606266;
  background: #f0f0f0;
  padding: 2px 10px;
  border-radius: 12px;
}

.student-id-label {
  font-size: 12px;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.student-password {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 6px;
  font-size: 14px;
}

.password-label {
  color: #606266;
  font-weight: 500;
  margin-right: 8px;
}

.password-value {
  color: #409eff;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 1px;
}

.card-actions {
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
}

.card-actions :deep(.el-button) {
  flex: 1;
  min-width: 0;
  padding-left: 6px;
  padding-right: 6px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-state p {
  margin: 8px 0;
  font-size: 14px;
}

.empty-state .hint {
  font-size: 12px;
  color: #c0c4cc;
}

/* 平板/桌面端 (>= 768px) */
@media (min-width: 768px) {
  .desktop-view {
    display: block;
  }
  
  .mobile-view {
    display: none;
  }
  
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
  
  .student-count {
    font-size: 13px;
  }
  
  .header-actions :deep(.el-button) {
    padding: 8px 12px;
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

  .student-count {
    font-size: 12px;
    margin-left: 4px;
  }

  .header-left {
    order: 1;
  }

  .header-actions {
    order: 2;
  }

  .back-btn {
    padding: 8px 12px;
  }

  .import-btn {
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

  .action-bar {
    margin-bottom: 12px;
    flex-wrap: nowrap;
  }

  .action-bar :deep(.el-button) {
    flex: 1;
    min-width: 0;
    padding-left: 8px;
    padding-right: 8px;
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

  .back-btn {
    padding: 6px 10px;
    font-size: 14px;
  }

  .back-btn .back-text {
    display: none;
  }

  .import-btn {
    padding: 6px 10px;
    font-size: 14px;
  }

  .student-count {
    display: block;
    margin-left: 0;
    margin-top: 2px;
  }

  .main-content {
    padding: 10px;
  }

  .student-card {
    padding: 12px;
  }

  .student-name {
    font-size: 15px;
  }

  .student-id-badge {
    font-size: 12px;
  }
}
</style>
