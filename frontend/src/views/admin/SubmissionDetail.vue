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
          <el-button type="success" plain :loading="aiBatchLoading" @click="batchGenerateAIReview">批量生成 AI 初评</el-button>
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
          <div class="summary-tile-value">{{ filteredGroupedSubmissions.length }}</div>
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

          <el-input v-model="submissionSearch" clearable placeholder="搜索姓名或学号" class="submission-search">
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="table-shell desktop-view">
          <el-table
            ref="tableRef"
            :data="filteredGroupedSubmissions"
            v-loading="loading"
            empty-text="没有匹配的提交"
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
                        <div class="score-cell">
                          <el-tag v-if="sub.is_graded" type="success" effect="light">{{ sub.score }}分</el-tag>
                          <el-tag v-else effect="light">待评分</el-tag>
                          <el-tag v-if="sub.has_teacher_comment" type="info" effect="plain" size="small">有评语</el-tag>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="AI 初评" min-width="150" align="center">
                      <template #default="{ row: sub }">
                        <div class="ai-status-cell">
                          <el-tag :type="aiStatusType(sub.ai_review_status)" effect="light">
                            {{ aiStatusLabel(sub.ai_review_status) }}
                          </el-tag>
                          <span v-if="sub.ai_score !== null && sub.ai_score !== undefined" class="ai-score">{{ sub.ai_score }}分</span>
                        </div>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="320" align="center">
                      <template #default="{ row: sub }">
                        <div class="submission-actions" @click.stop>
                          <el-button size="small" @click.stop="downloadSingle(sub)" :loading="downloadingSingle === sub.id">下载</el-button>
                          <el-button
                            v-if="sub.ai_review_status === 'succeeded'"
                            size="small"
                            @click.stop="showAIReport(sub)"
                          >
                            查看 AI 报告
                          </el-button>
                          <el-button
                            v-else
                            size="small"
                            type="success"
                            plain
                            :loading="aiGeneratingId === sub.id || sub.ai_review_status === 'running'"
                            :disabled="sub.ai_review_status === 'queued'"
                            @click.stop="generateAIReview(sub, false)"
                          >
                            {{ aiGenerateButtonLabel(sub.ai_review_status) }}
                          </el-button>
                          <span v-if="sub.ai_review_status === 'succeeded'" class="action-dropdown" @click.stop>
                            <el-dropdown trigger="click" @command="(command) => handleAICommand(command, sub)">
                              <el-button size="small">
                                更多
                                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                              </el-button>
                              <template #dropdown>
                                <el-dropdown-menu>
                                  <el-dropdown-item command="regenerate">重新生成 AI 初评</el-dropdown-item>
                                </el-dropdown-menu>
                              </template>
                            </el-dropdown>
                          </span>
                          <el-button size="small" type="primary" @click.stop="openGradeDialog(sub)">评分</el-button>
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
            <div v-if="!loading && filteredGroupedSubmissions.length === 0" class="empty-panel">
              没有匹配的提交
            </div>

            <article v-for="group in filteredGroupedSubmissions" :key="group.student_id" class="list-card">
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
                    <span class="score-cell compact">
                      <el-tag v-if="sub.is_graded" type="success" effect="light">{{ sub.score }}分</el-tag>
                      <el-tag v-else effect="light">待评分</el-tag>
                      <el-tag v-if="sub.has_teacher_comment" type="info" effect="plain" size="small">有评语</el-tag>
                    </span>
                    <el-tag :type="aiStatusType(sub.ai_review_status)" effect="light">{{ aiStatusLabel(sub.ai_review_status) }}</el-tag>
                    <span v-if="sub.ai_score !== null && sub.ai_score !== undefined" class="ai-score">{{ sub.ai_score }}分</span>
                    <el-button size="small" @click="downloadSingle(sub)" :loading="downloadingSingle === sub.id">下载</el-button>
                    <el-button v-if="sub.ai_review_status === 'succeeded'" size="small" @click="showAIReport(sub)">查看 AI 报告</el-button>
                    <el-button
                      v-else
                      size="small"
                      type="success"
                      plain
                      :loading="aiGeneratingId === sub.id || sub.ai_review_status === 'running'"
                      :disabled="sub.ai_review_status === 'queued'"
                      @click="generateAIReview(sub, false)"
                    >
                      {{ aiGenerateButtonLabel(sub.ai_review_status) }}
                    </el-button>
                    <el-button
                      v-if="sub.ai_review_status === 'succeeded'"
                      size="small"
                      type="warning"
                      plain
                      :loading="aiGeneratingId === sub.id"
                      @click="generateAIReview(sub, true)"
                    >
                      重新生成
                    </el-button>
                    <el-button size="small" type="primary" @click="openGradeDialog(sub)">评分</el-button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <el-dialog v-model="gradeDialogVisible" title="评分" width="min(620px, 92vw)">
        <el-form :model="gradeForm" label-width="80px">
          <el-form-item label="学生">
            <span>{{ currentStudent?.student_name }} ({{ currentStudent?.student_id }})</span>
          </el-form-item>
          <el-form-item label="分数">
            <el-input-number v-model="gradeForm.score" :min="0" :max="100" :step="1" style="width: 100%" />
          </el-form-item>
          <el-form-item label="评语">
            <el-input
              v-model="gradeForm.teacher_comment"
              type="textarea"
              :autosize="{ minRows: 4, maxRows: 8 }"
              maxlength="2000"
              show-word-limit
              placeholder="可选，学生端会在成绩处查看"
            />
          </el-form-item>
          <el-form-item v-if="currentStudent?.ai_review_status === 'succeeded'" label="AI 建议">
            <div class="ai-grade-reference">
              <div class="ai-grade-head">
                <span class="ai-score strong">{{ currentStudent.ai_score }}分</span>
                <el-tag :type="aiStatusType(currentStudent.ai_review_status)" effect="light">
                  {{ currentStudent.ai_confidence || 'low' }}
                </el-tag>
                <el-button size="small" type="success" plain @click="useAIScore">使用 AI 分数</el-button>
              </div>
              <pre class="ai-report-preview">{{ currentStudent.ai_report_text }}</pre>
            </div>
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

      <el-dialog v-model="aiReportDialogVisible" title="AI 初评报告" width="min(720px, 94vw)">
        <div class="ai-report-dialog">
          <div class="ai-grade-head">
            <span class="ai-score strong">{{ aiReport?.ai_score ?? '无' }}分</span>
            <el-tag :type="aiStatusType(aiReport?.ai_review_status)" effect="light">
              {{ aiStatusLabel(aiReport?.ai_review_status) }}
            </el-tag>
          </div>
          <pre class="ai-report-text">{{ aiReport?.ai_report_text || '暂无报告' }}</pre>
        </div>
      </el-dialog>

      <el-dialog
        v-model="aiBatchProgress.visible"
        title="批量生成 AI 初评"
        width="min(640px, 94vw)"
        :close-on-click-modal="!aiBatchLoading"
        :close-on-press-escape="!aiBatchLoading"
        :show-close="!aiBatchLoading"
      >
        <div class="ai-batch-dialog">
          <el-progress
            :percentage="aiBatchPercent"
            :status="aiBatchProgressStatus"
            :stroke-width="12"
            striped
            striped-flow
          />

          <div class="ai-batch-meta">
            <span>已处理 {{ aiBatchProgress.processed }} / {{ aiBatchProgress.total }}</span>
            <span>{{ aiBatchProgress.currentLabel || '准备开始' }}</span>
          </div>

          <div class="ai-batch-stats">
            <div class="ai-batch-stat success">
              <span class="stat-label">成功</span>
              <strong>{{ aiBatchProgress.succeeded }}</strong>
            </div>
            <div class="ai-batch-stat danger">
              <span class="stat-label">失败</span>
              <strong>{{ aiBatchProgress.failed }}</strong>
            </div>
            <div class="ai-batch-stat muted">
              <span class="stat-label">跳过</span>
              <strong>{{ aiBatchProgress.skipped }}</strong>
            </div>
          </div>

          <div v-if="aiBatchProgress.failures.length" class="ai-batch-failures">
            <div class="failure-title">失败记录</div>
            <div v-for="failure in aiBatchProgress.failures" :key="failure.submissionId" class="failure-item">
              <span>{{ failure.label }}</span>
              <small>{{ failure.message }}</small>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="inline-actions" style="justify-content: flex-end">
            <el-button :disabled="aiBatchLoading" @click="aiBatchProgress.visible = false">关闭</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowDown, ArrowLeft, CircleCheckFilled, Search, User, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const route = useRoute()
const submissions = ref([])
const loading = ref(false)
const downloading = ref(null)
const downloadingSingle = ref(null)
const exporting = ref(false)
const aiBatchLoading = ref(false)
const aiGeneratingId = ref(null)
const aiReportDialogVisible = ref(false)
const aiReport = ref(null)
const aiBatchProgress = reactive({
  visible: false,
  total: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  currentLabel: '',
  failures: []
})
const gradeDialogVisible = ref(false)
const grading = ref(false)
const currentStudent = ref(null)
const gradeForm = reactive({ score: 85, teacher_comment: '' })
const tableRef = ref(null)
const assignmentTitle = ref('提交详情')
const submissionSearch = ref('')

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

const filteredGroupedSubmissions = computed(() => {
  const keyword = submissionSearch.value.trim().toLowerCase()
  if (!keyword) return groupedSubmissions.value

  return groupedSubmissions.value.filter((group) => (
    group.student_id.toLowerCase().includes(keyword) ||
    group.student_name.toLowerCase().includes(keyword)
  ))
})

const gradedCount = computed(() => filteredGroupedSubmissions.value.filter((group) => group.latestGraded).length)
const pendingCount = computed(() => Math.max(filteredGroupedSubmissions.value.length - gradedCount.value, 0))
const aiBatchPercent = computed(() => {
  if (!aiBatchProgress.total) return 0
  return Math.round((aiBatchProgress.processed / aiBatchProgress.total) * 100)
})
const aiBatchProgressStatus = computed(() => {
  if (aiBatchLoading.value) return undefined
  if (aiBatchProgress.failed > 0) return 'exception'
  if (aiBatchProgress.processed >= aiBatchProgress.total && aiBatchProgress.total > 0) return 'success'
  return undefined
})

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

function aiStatusLabel(status) {
  const labels = {
    none: '未生成',
    queued: '排队中',
    running: '生成中',
    succeeded: '已生成',
    failed: '失败'
  }
  return labels[status] || '未生成'
}

function aiStatusType(status) {
  const types = {
    queued: 'info',
    running: 'warning',
    succeeded: 'success',
    failed: 'danger'
  }
  return types[status] || 'info'
}

function aiGenerateButtonLabel(status) {
  if (status === 'failed') return '重试 AI 初评'
  if (status === 'queued') return '排队中'
  if (status === 'running') return '生成中'
  return '生成 AI 初评'
}

function useAIScore() {
  if (currentStudent.value?.ai_score === null || currentStudent.value?.ai_score === undefined) return
  gradeForm.score = Number(currentStudent.value.ai_score)
}

function handleAICommand(command, row) {
  if (command === 'regenerate') {
    generateAIReview(row, true)
  }
}

function openGradeDialog(row) {
  currentStudent.value = row
  gradeForm.score = row.score ?? 85
  gradeForm.teacher_comment = row.teacher_comment || ''
  gradeDialogVisible.value = true
}

async function generateAIReview(row, force) {
  aiGeneratingId.value = row.id
  try {
    const res = await api.post(`/admin/submissions/${row.id}/ai-review`, { force })
    if (res.data.result) {
      ElMessage.success(force ? 'AI 初评已重新生成' : 'AI 初评已生成')
    } else if (res.data.job?.status === 'failed') {
      ElMessage.error(res.data.job.error_message || 'AI 初评失败')
    } else {
      ElMessage.info('该版本已有 AI 初评')
    }
    await loadSubmissions()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || 'AI 初评生成失败')
  } finally {
    aiGeneratingId.value = null
  }
}

async function batchGenerateAIReview() {
  if (aiBatchLoading.value) return

  const latestSubmissions = groupedSubmissions.value
    .map((group) => group.submissions[0])
    .filter(Boolean)

  resetAIBatchProgress(latestSubmissions.length)
  aiBatchProgress.visible = true

  if (latestSubmissions.length === 0) {
    aiBatchProgress.currentLabel = '当前没有最新版提交'
    ElMessage.info('当前没有可批量生成的提交')
    return
  }

  aiBatchLoading.value = true
  try {
    for (const sub of latestSubmissions) {
      const label = `${sub.student_name || sub.student_id} v${sub.version}`
      aiBatchProgress.currentLabel = `正在处理 ${label}`

      if (shouldSkipBatchAIReview(sub)) {
        aiBatchProgress.skipped += 1
        aiBatchProgress.processed += 1
        continue
      }

      try {
        const res = await api.post(`/admin/submissions/${sub.id}/ai-review`, { force: false })
        const data = res.data || {}
        if (data.reused) {
          aiBatchProgress.skipped += 1
        } else if (data.result) {
          aiBatchProgress.succeeded += 1
        } else {
          const message = data.job?.error_message || 'AI 初评失败'
          aiBatchProgress.failed += 1
          aiBatchProgress.failures.push({
            submissionId: sub.id,
            label,
            message
          })
        }
      } catch (e) {
        aiBatchProgress.failed += 1
        aiBatchProgress.failures.push({
          submissionId: sub.id,
          label,
          message: e.response?.data?.detail || 'AI 初评生成失败'
        })
      } finally {
        aiBatchProgress.processed += 1
      }
    }

    aiBatchProgress.currentLabel = '批量生成已完成'
    const summary = `批量完成：成功 ${aiBatchProgress.succeeded}，失败 ${aiBatchProgress.failed}，跳过 ${aiBatchProgress.skipped}`
    if (aiBatchProgress.failed > 0) {
      ElMessage.warning(summary)
    } else {
      ElMessage.success(summary)
    }
    await loadSubmissions()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '批量生成失败')
  } finally {
    aiBatchLoading.value = false
  }
}

function resetAIBatchProgress(total) {
  aiBatchProgress.total = total
  aiBatchProgress.processed = 0
  aiBatchProgress.succeeded = 0
  aiBatchProgress.failed = 0
  aiBatchProgress.skipped = 0
  aiBatchProgress.currentLabel = ''
  aiBatchProgress.failures = []
}

function shouldSkipBatchAIReview(submission) {
  return ['succeeded', 'queued', 'running'].includes(submission.ai_review_status)
}

async function showAIReport(row) {
  aiReport.value = row
  aiReportDialogVisible.value = true
  if (row.ai_report_text) return
  try {
    const res = await api.get(`/admin/submissions/${row.id}/ai-review`)
    aiReport.value = {
      ...row,
      ai_report_text: res.data.result?.report_text,
      ai_score: res.data.result?.ai_score,
      ai_review_status: res.data.ai_review_status
    }
  } catch {
    ElMessage.error('加载 AI 报告失败')
  }
}

async function submitGrade() {
  grading.value = true
  try {
    await api.patch(`/admin/submissions/${currentStudent.value.id}/grade`, {
      score: gradeForm.score,
      teacher_comment: gradeForm.teacher_comment
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

.submission-search {
  width: min(320px, 100%);
}

.submission-actions {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.submission-actions :deep(.el-button--small) {
  padding-left: 10px;
  padding-right: 10px;
}

.action-dropdown {
  display: inline-flex;
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

.ai-status-cell,
.ai-grade-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.score-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.score-cell.compact {
  justify-content: flex-start;
}

.ai-score {
  color: var(--brand);
  font-weight: 800;
  white-space: nowrap;
}

.ai-score.strong {
  font-size: 1.05rem;
}

.ai-grade-reference,
.ai-report-dialog {
  width: 100%;
  display: grid;
  gap: 12px;
}

.ai-report-preview,
.ai-report-text {
  width: 100%;
  max-height: 280px;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-subtle);
  color: var(--text);
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.ai-batch-dialog {
  display: grid;
  gap: 16px;
}

.ai-batch-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.ai-batch-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ai-batch-stat {
  display: grid;
  gap: 4px;
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-subtle);
}

.ai-batch-stat strong {
  color: var(--text);
  font-size: 1.35rem;
  line-height: 1;
}

.ai-batch-stat.success strong {
  color: #047857;
}

.ai-batch-stat.danger strong {
  color: #b91c1c;
}

.ai-batch-stat.muted strong {
  color: var(--text-muted);
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.ai-batch-failures {
  display: grid;
  gap: 8px;
  max-height: 180px;
  overflow: auto;
  padding: 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fef2f2;
}

.failure-title {
  color: #991b1b;
  font-weight: 800;
}

.failure-item {
  display: grid;
  gap: 2px;
}

.failure-item span {
  color: #7f1d1d;
  font-weight: 700;
}

.failure-item small {
  color: #991b1b;
  line-height: 1.4;
}

@media (max-width: 640px) {
  .submission-search {
    width: 100%;
  }

  .ai-batch-meta {
    align-items: flex-start;
    flex-direction: column;
  }

  .ai-batch-stats {
    grid-template-columns: 1fr;
  }
}
</style>
