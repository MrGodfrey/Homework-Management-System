<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <span class="title">作业列表</span>
        <div class="user-info">
          <span v-if="userInfo" class="user-name">{{ userInfo.name }} <span class="user-id">({{ userInfo.student_id }})</span></span>
          <el-button type="danger" plain size="small" @click="logout" class="logout-btn">
            <span class="btn-text">退出登录</span>
            <span class="btn-icon">⎋</span>
          </el-button>
        </div>
      </el-header>
      <el-main class="main-content">
        <!-- 桌面/平板端表格视图 -->
        <div class="desktop-view">
          <el-table :data="assignments" v-loading="loading" style="width:100%">
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
            <el-table-column label="提交状态" min-width="100" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status.submitted" type="success">已提交 v{{ row.status.version_no }}</el-tag>
                <el-tag v-else type="info">未提交</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最终得分" min-width="90" align="center">
              <template #default="{ row }">
                <span v-if="row.status.is_graded" class="score-text">{{ row.status.score }}</span>
                <span v-else style="color: #909399;">{{ row.status.submitted ? '待批改' : '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="150">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button size="small" type="primary" @click="$router.push(`/assignments/${row.id}`)">提交</el-button>
                  <el-button size="small" @click="$router.push(`/assignments/${row.id}/submissions`)">历史</el-button>
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
              <el-tag v-if="assignment.status.submitted" type="success" size="small">
                v{{ assignment.status.version_no }}
              </el-tag>
              <el-tag v-else type="info" size="small">未提交</el-tag>
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
                <span class="label">最终得分:</span>
                <span v-if="assignment.status.is_graded" class="score-text">{{ assignment.status.score }}</span>
                <span v-else style="color: #909399;">{{ assignment.status.submitted ? '待批改' : '-' }}</span>
              </div>
            </div>
            <div class="card-actions">
              <el-button size="small" type="primary" @click="$router.push(`/assignments/${assignment.id}`)" style="flex: 1;">
                提交作业
              </el-button>
              <el-button size="small" @click="$router.push(`/assignments/${assignment.id}/submissions`)" style="flex: 1;">
                提交历史
              </el-button>
            </div>
          </div>
          <div class="empty-state" v-if="!loading && assignments.length === 0">
            <p>暂无作业</p>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const assignments = ref([])
const userInfo = ref(null)
const loading = ref(false)

// 响应式窗口尺寸
const windowWidth = ref(window.innerWidth)
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

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

function logout() {
  auth.logout()
  router.push('/login')
}

async function loadData() {
  loading.value = true
  try {
    // 获取用户信息
    const userRes = await api.get('/assignments/me')
    userInfo.value = userRes.data
    
    // 获取作业列表
    const res = await api.get('/assignments')
    assignments.value = res.data
  } catch {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
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

.title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #303133; 
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  color: #606266;
  font-size: 14px;
}

.user-id {
  color: #909399;
  font-size: 13px;
}

.logout-btn .btn-text {
  display: inline;
}

.logout-btn .btn-icon {
  display: none;
}

.main-content {
  padding: 20px;
  overflow-x: hidden;
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

.action-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 移动端卡片视图 */
.mobile-view {
  display: none;
}

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
  
  .user-name {
    font-size: 13px;
  }
  
  .desktop-view :deep(.el-table) {
    font-size: 13px;
  }
  
  .desktop-view :deep(.el-table th),
  .desktop-view :deep(.el-table td) {
    padding: 6px 0;
  }
  
  .desktop-view :deep(.el-button--small) {
    padding: 4px 8px;
    font-size: 12px;
  }
  
  .action-buttons {
    gap: 4px;
  }
}

/* 移动端 (< 768px) */
@media (max-width: 768px) {
  .app-header {
    padding: 10px 12px;
    gap: 8px;
  }

  .title {
    font-size: 16px;
  }

  .user-name {
    font-size: 13px;
  }

  .user-id {
    display: none;
  }

  .logout-btn {
    padding: 8px 12px;
  }

  .logout-btn .btn-text {
    display: none;
  }

  .logout-btn .btn-icon {
    display: inline;
    font-size: 16px;
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

  .title {
    font-size: 15px;
  }

  .user-name {
    font-size: 12px;
  }

  .logout-btn {
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
}

/* 横屏手机优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .app-header {
    min-height: 50px;
  }

  .assignment-card {
    padding: 10px;
  }
}

.score-text {
  font-weight: 600;
  color: #409eff;
}
</style>