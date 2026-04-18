<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <span class="title">信息看板</span>
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
              <el-table-column label="互动" min-width="130" align="center">
                <template #default="{ row }">
                  <span class="interaction-count">{{ row.interaction_count }}</span>
                  <el-button
                    size="small"
                    type="primary"
                    circle
                    @click="quickAddInteraction(row)"
                    style="margin-left:4px;"
                    :data-testid="`quick-add-${row.student_id}`"
                  >+</el-button>
                  <el-button
                    size="small"
                    circle
                    @click="openManageDialog(row)"
                    style="margin-left:4px;"
                    :data-testid="`manage-interactions-${row.student_id}`"
                  >⋯</el-button>
                </template>
              </el-table-column>
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
                <div class="submission-item">
                  <span class="assignment-title">课堂互动</span>
                  <div style="display:flex;align-items:center;gap:4px;">
                    <span class="interaction-count">{{ student.interaction_count }} 次</span>
                    <el-button
                      size="small"
                      type="primary"
                      circle
                      @click="quickAddInteraction(student)"
                      :data-testid="`quick-add-${student.student_id}`"
                    >+</el-button>
                    <el-button
                      size="small"
                      circle
                      @click="openManageDialog(student)"
                      :data-testid="`manage-interactions-${student.student_id}`"
                    >⋯</el-button>
                  </div>
                </div>
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

        <!-- 快速添加互动弹窗 -->
        <el-dialog v-model="addDialogVisible" title="添加互动记录" width="400px" :close-on-click-modal="false">
          <p>学生: <strong>{{ currentStudent?.name }}</strong> ({{ currentStudent?.student_id }})</p>
          <el-input v-model="newNote" type="textarea" :rows="3" placeholder="备注（可选）" />
          <template #footer>
            <el-button @click="addDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="addLoading" @click="confirmAddInteraction">确认添加</el-button>
          </template>
        </el-dialog>

        <!-- 管理互动记录弹窗 -->
        <el-dialog v-model="manageDialogVisible" title="互动记录管理" width="550px">
          <p>学生: <strong>{{ currentStudent?.name }}</strong> ({{ currentStudent?.student_id }})</p>
          <el-table :data="interactionList" v-loading="manageLoading" style="width:100%" max-height="400">
            <el-table-column label="时间" min-width="160">
              <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
            </el-table-column>
            <el-table-column prop="note" label="备注" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ row.note || '-' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button size="small" type="danger" @click="deleteInteraction(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="!manageLoading && interactionList.length === 0" style="text-align:center;padding:20px;color:#909399;">暂无互动记录</div>
        </el-dialog>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const matrix = ref([])
const assignments = ref([])
const loading = ref(false)

// 互动相关
const addDialogVisible = ref(false)
const manageDialogVisible = ref(false)
const currentStudent = ref(null)
const newNote = ref('')
const addLoading = ref(false)
const manageLoading = ref(false)
const interactionList = ref([])

function logout() {
  auth.logout()
  router.push('/admin/login')
}

function formatDate(d) {
  if (!d) return '-'
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

// 找到 matrix 中对应 student_id 的行的内部 DB id
function findStudentDbId(row) {
  // row comes from dashboard, we need the db id; dashboard doesn't return it,
  // so we must fetch from the students list or derive from interactions endpoint.
  // The admin interaction endpoint uses db id. We'll store it in matrix.
  return row._dbId
}

async function quickAddInteraction(row) {
  currentStudent.value = row
  newNote.value = ''
  addDialogVisible.value = true
}

async function confirmAddInteraction() {
  addLoading.value = true
  try {
    await api.post(`/admin/students/${currentStudent.value._dbId}/interactions`, { note: newNote.value || null })
    ElMessage.success('互动记录已添加')
    addDialogVisible.value = false
    // 更新本地计数
    const idx = matrix.value.findIndex(s => s.student_id === currentStudent.value.student_id)
    if (idx !== -1) matrix.value[idx].interaction_count++
  } catch {
    ElMessage.error('添加失败')
  } finally {
    addLoading.value = false
  }
}

async function openManageDialog(row) {
  currentStudent.value = row
  manageDialogVisible.value = true
  manageLoading.value = true
  try {
    const res = await api.get(`/admin/students/${row._dbId}/interactions`)
    interactionList.value = res.data
  } catch {
    ElMessage.error('加载互动记录失败')
  } finally {
    manageLoading.value = false
  }
}

async function deleteInteraction(interactionId) {
  try {
    await ElMessageBox.confirm('确认删除该条互动记录？', '确认', { type: 'warning' })
  } catch { return }
  try {
    await api.delete(`/admin/interactions/${interactionId}`)
    interactionList.value = interactionList.value.filter(i => i.id !== interactionId)
    // 更新本地计数
    const idx = matrix.value.findIndex(s => s.student_id === currentStudent.value.student_id)
    if (idx !== -1) matrix.value[idx].interaction_count--
    ElMessage.success('已删除')
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const [dashRes, assignRes, studentsRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/assignments'),
      api.get('/admin/students')
    ])
    // Build a student_id -> db id map
    const idMap = {}
    for (const s of studentsRes.data) {
      idMap[s.student_id] = s.id
    }
    matrix.value = dashRes.data.map(row => ({ ...row, _dbId: idMap[row.student_id] }))
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

.interaction-count {
  font-weight: 600;
  color: #409eff;
  font-size: 15px;
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
