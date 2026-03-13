<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <span class="title">提交看板</span>
        </div>
        <div class="nav-btns">
          <el-button @click="$router.push('/admin/assignments')" class="nav-btn">
            <span class="btn-text">作业管理</span>
            <span class="btn-icon">📝</span>
          </el-button>
          <el-button @click="$router.push('/admin/students')" class="nav-btn">
            <span class="btn-text">学生管理</span>
            <span class="btn-icon">👥</span>
          </el-button>
          <el-button type="danger" plain @click="logout" class="logout-btn">
            <span class="btn-text">退出登录</span>
            <span class="btn-icon">🚪</span>
          </el-button>
        </div>
      </el-header>
      <el-main class="main-content">
        <div v-if="loading"><el-skeleton :rows="8" animated /></div>
        
        <div v-else>
          <!-- 桌面/平板端表格视图 -->
          <div class="desktop-view">
            <el-table
              :data="matrix"
              border
              style="width:100%"
              :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
            >
              <el-table-column prop="student_id" label="学号" min-width="110" fixed />
              <el-table-column prop="name" label="姓名" min-width="90" fixed />
              <el-table-column
                v-for="a in assignments"
                :key="a.id"
                :label="a.title"
                min-width="110"
                align="center"
              >
                <template #default="{ row }">
                  <el-tag
                    v-if="row.submissions[a.id] > 0"
                    type="success"
                    size="small"
                    style="cursor:pointer"
                    @click="$router.push(`/admin/assignments/${a.id}/submissions`)"
                  >
                    v{{ row.submissions[a.id] }}
                  </el-tag>
                  <el-tag v-else type="info" size="small">未交</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 移动端卡片视图 -->
          <div class="mobile-view">
            <div class="student-card" v-for="student in matrix" :key="student.student_id">
              <div class="card-header">
                <div class="student-info">
                  <h3 class="student-name">{{ student.name }}</h3>
                  <span class="student-id">{{ student.student_id }}</span>
                </div>
              </div>
              <div class="card-body">
                <div class="submission-item" v-for="a in assignments" :key="a.id">
                  <span class="assignment-title">{{ a.title }}</span>
                  <el-tag
                    v-if="student.submissions[a.id] > 0"
                    type="success"
                    size="small"
                    @click="$router.push(`/admin/assignments/${a.id}/submissions`)"
                    style="cursor: pointer;"
                  >
                    v{{ student.submissions[a.id] }}
                  </el-tag>
                  <el-tag v-else type="info" size="small">未提交</el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const matrix = ref([])
const assignments = ref([])
const loading = ref(false)

function logout() {
  auth.logout()
  router.push('/admin/login')
}

onMounted(async () => {
  loading.value = true
  try {
    const [dashRes, assignRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/assignments')
    ])
    matrix.value = dashRes.data
    assignments.value = assignRes.data
  } catch {
    ElMessage.error('加载看板数据失败')
  } finally {
    loading.value = false
  }
})
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

.title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #303133; 
}

.nav-btns { 
  display: flex; 
  gap: 8px;
  flex-wrap: wrap;
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

/* 桌面端表格视图 */
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

/* 移动端卡片视图 */
.mobile-view {
  display: none;
}

.student-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e4e7ed;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.student-id {
  font-size: 13px;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.submission-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.submission-item:last-child {
  border-bottom: none;
}

.assignment-title {
  font-size: 14px;
  color: #606266;
  flex: 1;
  word-break: break-word;
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
  
  .nav-btns :deep(.el-button) {
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
    gap: 10px;
  }

  .header-left {
    flex-basis: 100%;
    order: -1;
    margin-bottom: 8px;
  }

  .title {
    font-size: 16px;
  }

  .nav-btns {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }

  .nav-btn,
  .logout-btn {
    flex: 1;
    padding: 8px 10px;
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

  .title {
    font-size: 15px;
  }

  .nav-btn,
  .logout-btn {
    padding: 6px 8px;
  }

  .btn-icon {
    font-size: 16px;
  }

  .main-content {
    padding: 10px;
  }

  .student-card {
    padding: 12px;
    margin-bottom: 12px;
  }

  .student-name {
    font-size: 15px;
  }

  .student-id {
    font-size: 12px;
  }

  .assignment-title {
    font-size: 13px;
  }

  .submission-item {
    padding: 6px 0;
  }
}
</style>
