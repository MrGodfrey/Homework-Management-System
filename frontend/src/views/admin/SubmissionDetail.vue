<template>
  <AppShell role="instructor" display-name="教师账号" display-meta="提交批改与导出">
    <div class="page-stack">
      <button type="button" class="back-link" @click="$router.push('/admin/assignments')">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回作业管理</span>
      </button>

      <section class="page-hero">
        <div>
          <h1 class="page-title">{{ assignmentTitle || '提交详情' }}</h1>
        </div>

        <div class="page-hero-actions">
          <el-button @click="exportCSV" :loading="exporting">导出CSV</el-button>
          <el-button @click="downloadZip('latest')" :loading="downloading === 'latest'">最新版</el-button>
          <el-button type="primary" @click="downloadZip('all')" :loading="downloading === 'all'">全部版本</el-button>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><User /></el-icon>
            <span>提交学生</span>
          </div>
          <div class="summary-tile-value">{{ groupedSubmissions.length }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>已评分</span>
          </div>
          <div class="summary-tile-value">{{ gradedCount }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><WarningFilled /></el-icon>
            <span>待处理</span>
          </div>
          <div class="summary-tile-value">{{ pendingCount }}</div>
        </article>
      </section>

      <section class="surface-card soft">
        <div class="section-header">
          <div>
            <h2 class="section-title">提交清单</h2>
          </div>
        </div>

        <div class="table-shell desktop-view">
          <el-table
            ref="tableRef"
            :data="groupedSubmissions"
            v-loading="loading"
            style="width: 100%"
            @row-click="toggleExpand"
            row-class-name="clickable-row"
          >
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="expand-content">
                  <el-table :data="row.submissions" style="width: 100%">
                    <el-table-column prop="id" label="ID" width="80" />
                    <el-table-column label="版本" width="90" align="center">
                      <template #default="{ row: sub }">v{{ sub.version }}</template>
                    </el-table-column>
                    <el-table-column label="提交时间" min-width="160">
                      <template #default="{ row: sub }">{{ formatDate(sub.time) }}</template>
                    </el-table-column>
                    <el-table-column label="分数" width="120" align="center">
                      <template #default="{ row: sub }">
                        <el-tag v-if="sub.is_graded" type="success" effect="light">{{ sub.score }}分</el-tag>
                        <el-tag v-else effect="light">待评分</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="180" align="center">
                      <template #default="{ row: sub }">
                        <div class="inline-actions">
                          <el-button size="small" @click="downloadSingle(sub)" :loading="downloadingSingle === sub.id">下载</el-button>
                          <el-button size="small" type="primary" @click="openGradeDialog(sub)">评分</el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="student_id" label="学号" min-width="120" />
            <el-table-column prop="student_name" label="姓名" min-width="100" />
            <el-table-column label="提交次数" min-width="100" align="center">
              <template #default="{ row }">{{ row.submissions.length }} 次</template>
            </el-table-column>
            <el-table-column label="最新版本" min-width="100" align="center">
              <template #default="{ row }">v{{ row.latestVersion }}</template>
            </el-table-column>
            <el-table-column label="最新时间" min-width="160">
              <template #default="{ row }">{{ formatDate(row.latestTime) }}</template>
            </el-table-column>
            <el-table-column label="最新分数" min-width="120" align="center">
              <template #default="{ row }">
                <el-tooltip v-if="row.latestGraded && row.hasNewUngraded" content="学生有新版本，需要进行更新" placement="top">
                  <el-tag type="warning" effect="light" style="cursor: pointer">{{ row.latestScore }}分</el-tag>
                </el-tooltip>
                <el-tag v-else-if="row.latestGraded" type="success" effect="light">{{ row.latestScore }}分</el-tag>
                <el-tag v-else effect="light">待评分</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="table-shell mobile-view">
          <div class="card-stack">
            <article v-for="group in groupedSubmissions" :key="group.student_id" class="list-card">
              <div class="list-card-header">
                <div>
                  <h3 class="list-card-title">{{ group.student_name }}</h3>
                  <p class="list-card-subtitle">{{ group.student_id }}</p>
                </div>
                <span class="submit-pill">{{ group.submissions.length }} 次提交</span>
              </div>

              <div class="version-stack">
                <div v-for="sub in group.submissions" :key="sub.id" class="version-item">
                  <div class="version-meta">
                    <span class="meta-value">v{{ sub.version }}</span>
                    <span class="meta-label">{{ formatDate(sub.time) }}</span>
                  </div>
                  <div class="inline-actions">
                    <el-tag v-if="sub.is_graded" type="success" effect="light">{{ sub.score }}分</el-tag>
                    <el-tag v-else effect="light">待评分</el-tag>
                    <el-button size="small" @click="downloadSingle(sub)" :loading="downloadingSingle === sub.id">下载</el-button>
                    <el-button size="small" type="primary" @click="openGradeDialog(sub)">评分</el-button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <el-dialog v-model="gradeDialogVisible" title="评分" width="min(520px, 92vw)">
        <el-form :model="gradeForm" label-width="80px">
          <el-form-item label="学生">
            <span>{{ currentStudent?.student_name }} ({{ currentStudent?.student_id }})</span>
          </el-form-item>
          <el-form-item label="分数">
            <el-input-number v-model="gradeForm.score" :min="0" :max="100" :step="1" style="width: 100%" />
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
          <div class="inline-actions" style="justify-content: flex-end">
            <el-button @click="gradeDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="grading" @click="submitGrade">保存</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, CircleCheckFilled, User, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const route = useRoute()
const submissions = ref([])
const loading = ref(false)
const downloading = ref(null)
const downloadingSingle = ref(null)
const exporting = ref(false)
const gradeDialogVisible = ref(false)
const grading = ref(false)
const currentStudent = ref(null)
const gradeForm = reactive({ score: 85 })
const tableRef = ref(null)
const assignmentTitle = ref('提交详情')

const groupedSubmissions = computed(() => {
  const groups = {}

  submissions.value.forEach((sub) => {
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

  return Object.values(groups)
    .map((group) => {
      group.submissions.sort((a, b) => b.version - a.version)
      const latest = group.submissions[0]
      const lastGraded = group.submissions.find((s) => s.is_graded)
      const hasNewUngraded = lastGraded && !latest.is_graded

      return {
        ...group,
        latestVersion: latest.version,
        latestTime: latest.time,
        latestGraded: !!lastGraded,
        latestScore: lastGraded ? lastGraded.score : null,
        hasNewUngraded
      }
    })
    .sort((a, b) => a.student_id.localeCompare(b.student_id))
})

const gradedCount = computed(() => groupedSubmissions.value.filter((group) => group.latestGraded).length)
const pendingCount = computed(() => Math.max(groupedSubmissions.value.length - gradedCount.value, 0))

function toggleExpand(row) {
  tableRef.value?.toggleRowExpansion(row)
}

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
      params: { version: row.version },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `HW${route.params.id}_${row.student_id}_${row.student_name}_v${row.version}.zip`
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
    const filename = mode === 'latest' ? `HW${route.params.id}_latest_only.zip` : `HW${route.params.id}_all_versions.zip`
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

    const assignmentRes = await api.get('/admin/assignments')
    const matched = assignmentRes.data.find((item) => String(item.id) === String(route.params.id))
    if (matched) {
      assignmentTitle.value = matched.title
    }
  } catch {
    ElMessage.error('加载提交列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadSubmissions)
</script>

<style scoped>
:deep(.clickable-row) {
  cursor: pointer;
}

.expand-content {
  padding: 12px 0;
  background: #f8fafc;
}

.submit-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 800;
}

.version-stack {
  display: grid;
  gap: 10px;
}

.version-item {
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.82);
}

.version-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
</style>
