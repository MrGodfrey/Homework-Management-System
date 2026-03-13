<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <el-button @click="$router.push('/admin/assignments')" class="back-btn">
            <span class="back-icon">←</span>
            <span class="back-text">返回作业管理</span>
          </el-button>
        </div>
        <div class="header-center">
          <span class="title">提交详情</span>
        </div>
        <div class="header-actions">
          <el-button @click="exportCSV" :loading="exporting" size="small">
            <span class="btn-text">导出CSV</span>
            <span class="btn-icon">📊</span>
          </el-button>
          <el-button @click="downloadZip('latest')" :loading="downloading === 'latest'" size="small">
            <span class="btn-text">最新版</span>
            <span class="btn-icon">📄</span>
          </el-button>
          <el-button type="primary" @click="downloadZip('all')" :loading="downloading === 'all'" size="small">
            <span class="btn-text">全部版本</span>
            <span class="btn-icon">📦</span>
          </el-button>
        </div>
      </el-header>
      <el-main class="main-content">
        <!-- 桌面/平板端表格视图 -->
        <div class="desktop-view">
          <el-table :data="groupedSubmissions" v-loading="loading" style="width:100%">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="expand-content">
                  <el-table :data="row.submissions" style="width: 100%">
                    <el-table-column prop="id" label="ID" width="80" />
                    <el-table-column label="版本" width="80" align="center">
                      <template #default="{ row: sub }">v{{ sub.version }}</template>
                    </el-table-column>
                    <el-table-column label="提交时间" min-width="150">
                      <template #default="{ row: sub }">{{ formatDate(sub.time) }}</template>
                    </el-table-column>
                    <el-table-column label="分数" width="120" align="center">
                      <template #default="{ row: sub }">
                        <el-tag v-if="sub.is_graded" type="success" size="small">{{ sub.score }}分</el-tag>
                        <el-tag v-else type="info" size="small">待评分</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="180" align="center">
                      <template #default="{ row: sub }">
                        <div class="action-buttons">
                          <el-button size="small" @click="downloadSingle(sub)" :loading="downloadingSingle === sub.id">
                            下载
                          </el-button>
                          <el-button size="small" type="primary" @click="openGradeDialog(sub)">
                            评分
                          </el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="student_id" label="学号" min-width="110" />
            <el-table-column prop="student_name" label="姓名" min-width="90" />
            <el-table-column label="提交次数" min-width="90" align="center">
              <template #default="{ row }">{{ row.submissions.length }} 次</template>
            </el-table-column>
            <el-table-column label="最新版本" min-width="80" align="center">
              <template #default="{ row }">v{{ row.latestVersion }}</template>
            </el-table-column>
            <el-table-column label="最新时间" min-width="140">
              <template #default="{ row }">{{ formatDate(row.latestTime) }}</template>
            </el-table-column>
            <el-table-column label="最新分数" min-width="120" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.latestGraded" type="success" size="small">{{ row.latestScore }}分</el-tag>
                <el-tag v-else type="warning" size="small">需更新</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 移动端卡片视图 -->
        <div class="mobile-view" v-loading="loading">
          <div class="submission-card" v-for="group in groupedSubmissions" :key="group.student_id">
            <div class="card-header">
              <div class="student-info">
                <h3 class="student-name">{{ group.student_name }}</h3>
                <span class="student-id">{{ group.student_id }}</span>
              </div>
              <div class="version-count">{{ group.submissions.length }} 次提交</div>
            </div>
            
            <!-- 多个版本列表 -->
            <div class="versions-list">
              <div class="version-item" v-for="sub in group.submissions" :key="sub.id">
                <div class="version-header">
                  <div class="version-badge">v{{ sub.version }}</div>
                  <div class="version-time">{{ formatDate(sub.time) }}</div>
                  <el-tag v-if="sub.is_graded" type="success" size="small">{{ sub.score }}分</el-tag>
                  <el-tag v-else type="info" size="small">待评分</el-tag>
                </div>
                <div class="version-actions">
                  <el-button size="small" @click="downloadSingle(sub)" :loading="downloadingSingle === sub.id" style="flex: 1;">
                    下载
                  </el-button>
                  <el-button size="small" type="primary" @click="openGradeDialog(sub)" style="flex: 1;">
                    评分
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 评分对话框 -->
    <el-dialog v-model="gradeDialogVisible" title="评分" :width="dialogWidth">
      <el-form :model="gradeForm" label-width="80px">
        <el-form-item label="学生">
          <span>{{ currentStudent?.student_name }} ({{ currentStudent?.student_id }})</span>
        </el-form-item>
        <el-form-item label="分数">
          <el-input-number 
            v-model="gradeForm.score" 
            :min="0" 
            :max="100" 
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="快捷调整">
          <el-button-group>
            <el-button size="small" @click="adjustScore(-5)">-5</el-button>
            <el-button size="small" @click="adjustScore(-1)">-1</el-button>
            <el-button size="small" @click="adjustScore(1)">+1</el-button>
            <el-button size="small" @click="adjustScore(5)">+5</el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="gradeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="grading" @click="submitGrade">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const submissions = ref([])
const loading = ref(false)
const downloading = ref(null)
const downloadingSingle = ref(null)
const exporting = ref(false)
const gradeDialogVisible = ref(false)
const grading = ref(false)
const currentStudent = ref(null)
const gradeForm = reactive({ score: 85 })

// 按学生分组的提交记录
const groupedSubmissions = computed(() => {
  const groups = {}
  
  // 按学生ID分组
  submissions.value.forEach(sub => {
    const key = `${sub.student_id}_${sub.student_name}`
    if (!groups[key]) {
      groups[key] = {
        student_id: sub.student_id,
        student_name: sub.student_name,
        submissions: []
      }
    }
    groups[key].submissions.push(sub)
  })
  
  // 转换为数组并添加统计信息
  return Object.values(groups).map(group => {
    // 按版本号降序排序
    group.submissions.sort((a, b) => b.version - a.version)
    
    const latest = group.submissions[0]
    const allGraded = group.submissions.every(s => s.is_graded)
    const someGraded = group.submissions.some(s => s.is_graded)
    
    return {
      ...group,
      latestVersion: latest.version,
      latestTime: latest.time,
      latestGraded: latest.is_graded,
      latestScore: latest.score,
      allGraded,
      someGraded
    }
  }).sort((a, b) => {
    // 按学号排序
    return a.student_id.localeCompare(b.student_id)
  })
})

// 响应式窗口尺寸
const windowWidth = ref(window.innerWidth)
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadSubmissions()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const dialogWidth = computed(() => {
  if (windowWidth.value < 576) return '95%'
  if (windowWidth.value < 768) return '90%'
  return '480px'
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
  
  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function adjustScore(delta) {
  const newScore = (gradeForm.score || 85) + delta
  gradeForm.score = Math.max(0, Math.min(100, newScore))
}

function openGradeDialog(row) {
  currentStudent.value = row
  gradeForm.score = row.score || 85
  gradeDialogVisible.value = true
}

async function submitGrade() {
  grading.value = true
  try {
    await api.patch(`/admin/submissions/${currentStudent.value.id}/grade`, {
      score: gradeForm.score
    })
    ElMessage.success('评分成功')
    gradeDialogVisible.value = false
    // 刷新列表
    loadSubmissions()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '评分失败')
  } finally {
    grading.value = false
  }
}

async function downloadSingle(row) {
  downloadingSingle.value = row.id
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/submissions/${row.student_id}/download`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `HW${route.params.id}_${row.student_id}_${row.student_name}.zip`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch {
    ElMessage.error('下载失败')
  } finally {
    downloadingSingle.value = null
  }
}

async function exportCSV() {
  exporting.value = true
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/export_csv`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `assignment_${route.params.id}_grades.csv`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

async function downloadZip(mode) {
  downloading.value = mode
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/download`, {
      params: { mode },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    const filename = mode === 'latest'
      ? `HW${route.params.id}_latest_only.zip`
      : `HW${route.params.id}_all_versions.zip`
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败')
  } finally {
    downloading.value = null
  }
}

async function loadSubmissions() {
  loading.value = true
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/submissions`)
    submissions.value = res.data
  } catch {
    ElMessage.error('加载提交列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadSubmissions)
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f7fa; }

.app-header {
  height: auto !important;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left { flex-shrink: 0; }
.back-btn .back-icon { display: inline; }
.back-btn .back-text { display: inline; }
.header-center { flex: 1; text-align: center; min-width: 0; }
.title { font-size: 18px; font-weight: 600; color: #303133; }
.header-actions { display: flex; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
.btn-text { display: inline; }
.btn-icon { display: none; }

.main-content { padding: 20px; overflow-x: hidden; }

.action-buttons { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }

.desktop-view { display: block; overflow-x: auto; }
.desktop-view :deep(.el-table) { font-size: 14px; }
.desktop-view :deep(.el-table th) { padding: 8px 0; font-size: 13px; }
.desktop-view :deep(.el-table td) { padding: 8px 0; }
.desktop-view :deep(.el-table__cell) { padding-left: 6px; padding-right: 6px; }

.mobile-view { display: none; }

/* 桌面端展开行样式 */
.expand-content {
  padding: 12px 20px;
  background: #fafafa;
}

.expand-content :deep(.el-table) {
  background: transparent;
  font-size: 13px;
}

.expand-content :deep(.el-table::before) {
  display: none;
}

.expand-content :deep(.el-table th) {
  background: #f0f0f0;
}

/* 移动端卡片样式 */
.submission-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e4e7ed;
  gap: 12px;
}

.student-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
.student-name { font-size: 16px; font-weight: 600; color: #303133; margin: 0; }
.student-id { font-size: 13px; color: #606266; background: #f0f0f0; padding: 2px 10px; border-radius: 12px; }
.version-count { font-size: 13px; color: #67c23a; background: #f0f9ff; padding: 4px 12px; border-radius: 12px; font-weight: 500; }

/* 版本列表 */
.versions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.version-item {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #e8e8e8;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.version-badge {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 3px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.version-time {
  font-size: 12px;
  color: #606266;
  flex: 1;
}

.version-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.card-body { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
.info-row:last-child { border-bottom: none; }
.info-row .label { font-size: 13px; color: #606266; font-weight: 500; }
.info-row .value { font-size: 13px; color: #303133; }

.card-actions { display: flex; gap: 8px; padding-top: 8px; border-top: 1px solid #ebeef5; }

@media (min-width: 768px) {
  .desktop-view { display: block; }
  .mobile-view { display: none; }
}

@media (min-width: 768px) and (max-width: 1200px) {
  .app-header { padding: 10px 14px; }
  .main-content { padding: 16px; }
  .title { font-size: 16px; }
  .header-actions :deep(.el-button) { padding: 8px 10px; font-size: 12px; }
  .desktop-view :deep(.el-table) { font-size: 13px; }
  .desktop-view :deep(.el-table th),
  .desktop-view :deep(.el-table td) { padding: 6px 0; }
  .desktop-view :deep(.el-table__cell) { padding-left: 4px; padding-right: 4px; }
}

@media (max-width: 768px) {
  .app-header { padding: 10px 12px; gap: 8px; }
  .header-center { order: -1; flex-basis: 100%; text-align: left; margin-bottom: 8px; }
  .title { font-size: 16px; }
  .header-left { order: 1; }
  .header-actions { order: 2; width: 100%; justify-content: space-between; gap: 4px; }
  .header-actions :deep(.el-button) { flex: 1; padding: 6px 8px; font-size: 12px; min-width: 0; }
  .back-btn { padding: 8px 12px; }
  .btn-text { display: none; }
  .btn-icon { display: inline; font-size: 16px; }
  .main-content { padding: 12px; }
  .desktop-view { display: none; }
  .mobile-view { display: block; }
}

@media (max-width: 576px) {
  .app-header { padding: 8px 10px; }
  .title { font-size: 15px; }
  .back-btn { padding: 6px 10px; font-size: 14px; }
  .back-btn .back-text { display: none; }
  .main-content { padding: 10px; }
  .submission-card { padding: 12px; }
  .student-name { font-size: 15px; }
  .student-id, .info-row .label, .info-row .value { font-size: 12px; }
}
</style>
