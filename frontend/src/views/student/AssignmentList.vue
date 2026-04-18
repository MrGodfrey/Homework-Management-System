<template>
  <AppShell role="student" :display-name="userInfo?.name" :display-meta="userInfo?.student_id">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <span class="page-eyebrow">Student Workspace</span>
          <h1 class="page-title">我的作业</h1>
          <p class="page-subtitle">查看并提交课程任务，跟进作业进度与反馈结果。</p>
        </div>

        <div class="page-hero-actions">
          <button type="button" class="metric-card" @click="showInteractionDetail = true">
            <div class="metric-card-icon">
              <el-icon :size="20"><DataBoard /></el-icon>
            </div>
            <div>
              <p class="metric-card-label">课堂互动次数</p>
              <p class="metric-card-value">{{ interactionCount }} <small>点击查看详情</small></p>
            </div>
          </button>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Tickets /></el-icon>
            <span>全部作业</span>
          </div>
          <div class="summary-tile-value">{{ assignments.length }}</div>
          <div class="summary-tile-hint">当前学期已发布的任务数量</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>已提交</span>
          </div>
          <div class="summary-tile-value">{{ submittedCount }}</div>
          <div class="summary-tile-hint">已有版本记录的作业</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><WarningFilled /></el-icon>
            <span>待处理</span>
          </div>
          <div class="summary-tile-value">{{ pendingCount }}</div>
          <div class="summary-tile-hint">尚未提交或仍待完成</div>
        </article>
      </section>

      <section class="surface-card soft">
        <div class="section-header">
          <div>
            <h2 class="section-title">任务列表</h2>
            <p class="section-subtitle">保留原有提交、历史查看、互动记录与成绩展示流程。</p>
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
                <span v-if="row.status.is_graded" class="score-text">{{ row.status.score }}</span>
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
                    {{ assignment.status.is_graded ? assignment.status.score : assignment.status.submitted ? '待批改' : '-' }}
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
    </div>
  </AppShell>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { CircleCheckFilled, DataBoard, Tickets, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const assignments = ref([])
const userInfo = ref(null)
const loading = ref(false)
const interactionCount = ref(0)
const interactionItems = ref([])
const showInteractionDetail = ref(false)

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

function logout() {
  auth.logout()
  router.push('/login')
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
  } catch {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.score-text {
  color: var(--brand);
  font-weight: 800;
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
</style>
