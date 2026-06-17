<template>
  <AppShell role="student">
    <div class="page-stack">
      <button type="button" class="back-link" @click="$router.push('/assignments')">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回作业列表</span>
      </button>

      <section class="page-hero">
        <div>
          <h1 class="page-title">提交历史</h1>
          <p v-if="assignment?.title" class="page-subtitle">{{ assignment.title }}</p>
        </div>
      </section>

      <section v-if="loading" class="surface-card padded">
        <el-skeleton :rows="6" animated />
      </section>

      <section v-else-if="history.length === 0" class="empty-panel">
        暂无提交记录
      </section>

      <section v-else class="card-stack">
        <article v-for="(sub, index) in history" :key="sub.id || sub.version_no" class="surface-card version-card">
          <div class="version-head">
            <div>
              <div class="version-title-row">
                <h2 class="section-title">版本 v{{ sub.version_no }}</h2>
                <span v-if="index === 0" class="latest-chip">Latest</span>
              </div>
              <p class="section-subtitle">{{ formatDate(sub.submitted_at) }}</p>
            </div>
          </div>

          <div v-if="sub.is_graded" class="submission-grade-row">
            <span class="meta-label">评分</span>
            <button
              v-if="hasTeacherComment(sub)"
              type="button"
              class="score-comment-button"
              :aria-label="`查看教师评语：版本 v${sub.version_no}`"
              @click="openTeacherComment(sub)"
            >
              <span>{{ sub.score }}分</span>
              <span v-if="sub.teacher_comment_unread" class="comment-unread-star" aria-hidden="true">*</span>
            </button>
            <span v-else class="score-text">{{ sub.score }}分</span>
          </div>

          <div class="table-shell flush desktop-view">
            <el-table :data="sub.files" size="small">
              <el-table-column prop="filename" label="文件名" show-overflow-tooltip />
              <el-table-column label="操作" width="110" align="center">
                <template #default="{ row }">
                  <el-link :href="row.download_url" target="_blank" type="primary">下载</el-link>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="table-shell flush mobile-view">
            <div class="card-stack">
              <article v-for="(file, fileIndex) in sub.files" :key="fileIndex" class="list-card file-card">
                <div class="meta-pair">
                  <span class="meta-label">文件</span>
                  <span class="meta-value">{{ file.filename }}</span>
                </div>
                <el-link :href="file.download_url" target="_blank" type="primary">下载</el-link>
              </article>
            </div>
          </div>
        </article>
      </section>

      <el-dialog v-model="teacherCommentDialogVisible" title="教师评语" width="min(560px, 92vw)">
        <div class="teacher-comment-dialog">
          <div class="comment-dialog-meta">
            <span>版本 v{{ activeTeacherComment.versionNo }}</span>
            <strong>{{ activeTeacherComment.score }}分</strong>
          </div>
          <p class="teacher-comment-text">{{ activeTeacherComment.comment }}</p>
        </div>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const route = useRoute()
const history = ref([])
const assignment = ref(null)
const loading = ref(false)
const teacherCommentDialogVisible = ref(false)
const activeTeacherComment = ref({
  submissionId: null,
  versionNo: null,
  score: null,
  comment: ''
})

onMounted(() => {
  loadHistory()
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

function hasTeacherComment(submission) {
  return Boolean(submission?.has_teacher_comment && submission?.teacher_comment)
}

async function openTeacherComment(submission) {
  if (!hasTeacherComment(submission)) return

  activeTeacherComment.value = {
    submissionId: submission.id,
    versionNo: submission.version_no,
    score: submission.score,
    comment: submission.teacher_comment
  }
  teacherCommentDialogVisible.value = true

  if (!submission.teacher_comment_unread || !submission.id) return

  try {
    await api.post(`/assignments/${route.params.id}/submissions/${submission.id}/teacher-comment/viewed`)
    submission.teacher_comment_unread = false
  } catch {
    ElMessage.error('评语状态更新失败')
  }
}

async function loadHistory() {
  loading.value = true
  try {
    const [historyRes, assignmentRes] = await Promise.all([
      api.get(`/assignments/${route.params.id}/submissions`),
      api.get(`/assignments/${route.params.id}`)
    ])
    history.value = historyRes.data
    assignment.value = assignmentRes.data
  } catch {
    ElMessage.error('加载历史失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.version-head {
  padding: 22px 24px 0;
}

.version-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.latest-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.submission-grade-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px 0;
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
  min-width: 48px;
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

.file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
