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
          <el-button @click="generatePasswords" :loading="generating" class="gen-pwd-btn">
            <span class="btn-text">批量生成密码并下载</span>
            <span class="btn-icon">🔑</span>
          </el-button>
        </div>
        
        <!-- 桌面/平板端表格视图 -->
        <div class="desktop-view">
          <el-table :data="students" v-loading="loading" style="width:100%">
            <el-table-column prop="id" label="ID" min-width="50" />
            <el-table-column prop="student_id" label="学号" min-width="120" />
            <el-table-column prop="name" label="姓名" min-width="100" />
            <el-table-column label="操作" min-width="100" align="center">
              <template #default="{ row }">
                <el-button size="small" type="warning" @click="resetPassword(row)">重置密码</el-button>
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
            <div class="card-actions">
              <el-button size="small" type="warning" @click="resetPassword(student)" style="width: 100%;">
                重置密码
              </el-button>
            </div>
          </div>
          <div class="empty-state" v-if="!loading && students.length === 0">
            <p>暂无学生数据</p>
            <p class="hint">请使用"导入名单"功能添加学生</p>
          </div>
        </div>
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
      '批量生成密码',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
  } catch (e) {
    // 用户取消操作
    return
  }
  
  generating.value = true
  try {
    const res = await api.post('/admin/students/generate-passwords', {}, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'passwords.csv'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('密码已生成并开始下载')
  } catch {
    ElMessage.error('生成密码失败')
  } finally {
    generating.value = false
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
    ElMessageBox.alert(
      `新密码：<b>${res.data.new_password}</b>`,
      `${student.name} 的新密码`,
      { dangerouslyUseHTMLString: true, confirmButtonText: '已记录' }
    )
  } catch (e) {
    if (e !== 'cancel' && e.message !== 'cancel') ElMessage.error('重置失败')
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

.card-actions {
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
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
  }

  .gen-pwd-btn {
    width: 100%;
  }

  .gen-pwd-btn .btn-text {
    display: inline;
  }

  .gen-pwd-btn .btn-icon {
    display: none;
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

  .gen-pwd-btn {
    font-size: 13px;
    padding: 8px;
  }
}
</style>
