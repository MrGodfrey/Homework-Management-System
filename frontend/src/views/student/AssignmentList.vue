<template>
  <AppShell role="student" :display-name="userInfo?.name" :display-meta="userInfo?.student_id">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <h1 class="page-title">我的作业</h1>
        </div>

        <div class="page-hero-actions">
          <button type="button" class="metric-card" @click="showInteractionDetail = true">
            <div class="metric-card-icon">
              <el-icon :size="20"><DataBoard /></el-icon>
            </div>
            <div>
              <p class="metric-card-label">课堂互动次数</p>
              <p class="metric-card-value">{{ interactionCount }}</p>
            </div>
          </button>
        </div>
      </section>

      <section class="summary-grid assignment-overview-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Tickets /></el-icon>
            <span>全部作业</span>
          </div>
          <div class="summary-tile-value">{{ assignments.length }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>已提交</span>
          </div>
          <div class="summary-tile-value">{{ submittedCount }}</div>
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
            <h2 class="section-title">任务列表</h2>
          </div>
        </div>

        <div class="table-shell desktop-view">
          <el-table :data="assignments" v-loading="loading" style="width: 100%">
            <el-table-column prop="title" label="作业名称" min-width="220" show-overflow-tooltip />
            <el-table-column label="截止时间" min-width="160">
              <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
            </el-table-column>
            <el-table-column label="迟交" min-width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.allow_late ? 'success' : 'danger'" effect="light">
                  {{ row.allow_late ? '允许' : '禁止' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交状态" min-width="140" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.status.submitted" type="success" effect="light">已提交 v{{ row.status.version_no }}</el-tag>
                <el-tag v-else effect="light">未提交</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="最终得分" min-width="120" align="center">
              <template #default="{ row }">
                <button
                  v-if="row.status.is_graded && hasTeacherComment(row.status)"
                  type="button"
                  class="score-comment-button"
                  :aria-label="`查看教师评语：${row.title}`"
                  @click="openTeacherComment(row)"
                >
                  <span>{{ row.status.score }}</span>
                  <span v-if="row.status.teacher_comment_unread" class="comment-unread-star" aria-hidden="true">*</span>
                </button>
                <span v-else-if="row.status.is_graded" class="score-text">{{ row.status.score }}</span>
                <span v-else class="muted-copy">{{ row.status.submitted ? '待批改' : '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="170">
              <template #default="{ row }">
                <div class="inline-actions">
                  <el-button size="small" type="primary" @click="$router.push(`/assignments/${row.id}`)">提交</el-button>
                  <el-button size="small" @click="$router.push(`/assignments/${row.id}/submissions`)">历史</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="table-shell mobile-view">
          <div v-if="loading" class="card-stack">
            <el-skeleton v-for="item in 3" :key="item" animated :rows="4" />
          </div>

          <div v-else-if="assignments.length === 0" class="empty-panel">暂无作业</div>

          <div v-else class="card-stack">
            <article v-for="assignment in assignments" :key="assignment.id" class="list-card">
              <div class="list-card-header">
                <div>
                  <h3 class="list-card-title">{{ assignment.title }}</h3>
                  <p class="list-card-subtitle">截止于 {{ formatDate(assignment.deadline) }}</p>
                </div>
                <el-tag v-if="assignment.status.submitted" type="success" effect="light">v{{ assignment.status.version_no }}</el-tag>
                <el-tag v-else effect="light">未提交</el-tag>
              </div>

              <div class="info-list compact">
                <div class="meta-pair">
                  <span class="meta-label">迟交</span>
                  <span class="meta-value">{{ assignment.allow_late ? '允许' : '禁止' }}</span>
                </div>
                <div class="meta-pair">
                  <span class="meta-label">最终得分</span>
                  <span class="meta-value">
                    <button
                      v-if="assignment.status.is_graded && hasTeacherComment(assignment.status)"
                      type="button"
                      class="score-comment-button"
                      :aria-label="`查看教师评语：${assignment.title}`"
                      @click="openTeacherComment(assignment)"
                    >
                      <span>{{ assignment.status.score }}</span>
                      <span v-if="assignment.status.teacher_comment_unread" class="comment-unread-star" aria-hidden="true">*</span>
                    </button>
                    <span v-else>
                      {{ assignment.status.is_graded ? assignment.status.score : assignment.status.submitted ? '待批改' : '-' }}
                    </span>
                  </span>
                </div>
              </div>

              <div class="inline-actions card-actions">
                <el-button size="small" type="primary" style="flex: 1" @click="$router.push(`/assignments/${assignment.id}`)">提交作业</el-button>
                <el-button size="small" style="flex: 1" @click="$router.push(`/assignments/${assignment.id}/submissions`)">提交历史</el-button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <el-dialog v-model="showInteractionDetail" title="课堂互动记录" width="min(520px, 92vw)">
        <el-table :data="interactionItems" style="width: 100%" max-height="400">
          <el-table-column label="时间" min-width="170">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="备注" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">{{ row.note || '-' }}</template>
          </el-table-column>
        </el-table>
        <div v-if="interactionItems.length === 0" class="dialog-empty">暂无互动记录</div>
      </el-dialog>

      <el-dialog v-model="teacherCommentDialogVisible" title="教师评语" width="min(560px, 92vw)">
        <div class="teacher-comment-dialog">
          <div class="comment-dialog-meta">
            <span>{{ activeTeacherComment.title }}</span>
            <strong>{{ activeTeacherComment.score }}分</strong>
          </div>
          <p class="teacher-comment-text">{{ activeTeacherComment.comment }}</p>
        </div>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { CircleCheckFilled, DataBoard, Tickets, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api, { getStudentPortalClosedDetail } from '@/utils/api'

const assignments = ref([])
const userInfo = ref(null)
const loading = ref(false)
const interactionCount = ref(0)
const interactionItems = ref([])
const showInteractionDetail = ref(false)
const teacherCommentDialogVisible = ref(false)
const activeTeacherComment = ref({
  assignmentId: null,
  submissionId: null,
  title: '',
  score: null,
  comment: ''
})

const submittedCount = computed(() => assignments.value.filter((item) => item.status?.submitted).length)
const pendingCount = computed(() => Math.max(assignments.value.length - submittedCount.value, 0))

onMounted(() => {
  loadData()
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

function hasTeacherComment(status) {
  return Boolean(status?.has_teacher_comment && status?.teacher_comment)
}

async function openTeacherComment(assignment) {
  const status = assignment.status || {}
  if (!hasTeacherComment(status)) return

  activeTeacherComment.value = {
    assignmentId: assignment.id,
    submissionId: status.graded_submission_id,
    title: assignment.title,
    score: status.score,
    comment: status.teacher_comment
  }
  teacherCommentDialogVisible.value = true

  if (!status.teacher_comment_unread || !status.graded_submission_id) return

  try {
    await api.post(`/assignments/${assignment.id}/submissions/${status.graded_submission_id}/teacher-comment/viewed`)
    status.teacher_comment_unread = false
  } catch {
    ElMessage.error('评语状态更新失败')
  }
}

async function loadData() {
  loading.value = true
  try {
    const userRes = await api.get('/assignments/me')
    userInfo.value = userRes.data

    const [res, intRes] = await Promise.all([
      api.get('/assignments'),
      api.get('/assignments/interactions')
    ])
    assignments.value = res.data
    interactionCount.value = intRes.data.count
    interactionItems.value = intRes.data.items
  } catch (e) {
    if (!getStudentPortalClosedDetail(e)) {
      ElMessage.error('加载数据失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.assignment-overview-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.score-text {
  color: var(--brand);
  font-weight: 800;
}

.score-comment-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 28px;
  padding: 0 2px;
  border: 0;
  border-bottom: 1px solid currentColor;
  background: transparent;
  color: var(--brand);
  font: inherit;
  font-weight: 800;
  line-height: 1.2;
  cursor: pointer;
}

.score-comment-button:hover,
.score-comment-button:focus-visible {
  color: #0f766e;
}

.comment-unread-star {
  position: absolute;
  top: -8px;
  right: -10px;
  color: #dc2626;
  font-size: 1rem;
  line-height: 1;
}

.teacher-comment-dialog {
  display: grid;
  gap: 12px;
}

.comment-dialog-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-weight: 700;
}

.comment-dialog-meta strong {
  color: var(--brand);
}

.teacher-comment-text {
  margin: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-subtle);
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
}

.muted-copy {
  color: var(--text-soft);
}

.dialog-empty {
  padding: 18px 0 4px;
  text-align: center;
  color: var(--text-muted);
  font-weight: 600;
}

.card-actions {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

@media (max-width: 1080px) {
  .assignment-overview-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
