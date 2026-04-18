<template>
  <AppShell role="instructor" display-name="教师账号" display-meta="课程管理控制台">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <span class="page-eyebrow">Instructor Dashboard</span>
          <h1 class="page-title">课程看板</h1>
          <p class="page-subtitle">在同一个工作区里查看学生提交进度、课堂互动和作业完成情况。</p>
        </div>
      </section>

      <section class="summary-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><User /></el-icon>
            <span>学生总数</span>
          </div>
          <div class="summary-tile-value">{{ matrix.length }}</div>
          <div class="summary-tile-hint">当前班级已录入的学生人数</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Document /></el-icon>
            <span>作业数量</span>
          </div>
          <div class="summary-tile-value">{{ assignments.length }}</div>
          <div class="summary-tile-hint">看板中显示的全部任务</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Memo /></el-icon>
            <span>互动记录</span>
          </div>
          <div class="summary-tile-value">{{ totalInteractions }}</div>
          <div class="summary-tile-hint">用于平时表现跟踪</div>
        </article>
      </section>

      <section class="surface-card soft">
        <div class="section-header">
          <div>
            <h2 class="section-title">学生进度矩阵</h2>
            <p class="section-subtitle">点击列标题可进入对应作业的提交详情，点击按钮可快速记录或管理互动。</p>
          </div>
        </div>

        <div class="table-shell desktop-view">
          <el-table
            :data="matrix"
            border
            style="width: 100%"
            :header-cell-style="{ background: '#f8fafc', color: '#64748b' }"
          >
            <el-table-column prop="student_id" label="学号" min-width="120" fixed />
            <el-table-column prop="name" label="姓名" min-width="100" fixed />
            <el-table-column label="互动" min-width="150" align="center">
              <template #default="{ row }">
                <div class="interaction-cell">
                  <span class="interaction-count">{{ row.interaction_count }}</span>
                  <el-button
                    size="small"
                    type="primary"
                    circle
                    @click="quickAddInteraction(row)"
                    :data-testid="`quick-add-${row.student_id}`"
                  >
                    +
                  </el-button>
                  <el-button
                    size="small"
                    circle
                    @click="openManageDialog(row)"
                    :data-testid="`manage-interactions-${row.student_id}`"
                  >
                    ⋯
                  </el-button>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              v-for="a in assignments"
              :key="a.id"
              :label="a.title"
              min-width="120"
              align="center"
            >
              <template #default="{ row }">
                <el-tag
                  v-if="row.submissions[a.id] > 0"
                  type="success"
                  effect="light"
                  style="cursor: pointer"
                  @click="$router.push(`/admin/assignments/${a.id}/submissions`)"
                >
                  v{{ row.submissions[a.id] }}
                </el-tag>
                <el-tag v-else effect="light">未交</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="table-shell mobile-view">
          <div class="card-stack">
            <article v-for="student in matrix" :key="student.student_id" class="list-card">
              <div class="list-card-header">
                <div>
                  <h3 class="list-card-title">{{ student.name }}</h3>
                  <p class="list-card-subtitle">{{ student.student_id }}</p>
                </div>
                <span class="interaction-pill">{{ student.interaction_count }} 次互动</span>
              </div>

              <div class="inline-actions card-actions">
                <el-button
                  size="small"
                  type="primary"
                  circle
                  @click="quickAddInteraction(student)"
                  :data-testid="`quick-add-${student.student_id}`"
                >
                  +
                </el-button>
                <el-button
                  size="small"
                  circle
                  @click="openManageDialog(student)"
                  :data-testid="`manage-interactions-${student.student_id}`"
                >
                  ⋯
                </el-button>
              </div>

              <div class="mobile-submissions">
                <div v-for="a in assignments" :key="a.id" class="mobile-submission-row">
                  <span class="meta-label">{{ a.title }}</span>
                  <el-tag
                    v-if="student.submissions[a.id] > 0"
                    type="success"
                    effect="light"
                    style="cursor: pointer"
                    @click="$router.push(`/admin/assignments/${a.id}/submissions`)"
                  >
                    v{{ student.submissions[a.id] }}
                  </el-tag>
                  <el-tag v-else effect="light">未提交</el-tag>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <el-dialog v-model="addDialogVisible" title="添加互动记录" width="min(420px, 92vw)" :close-on-click-modal="false">
        <p class="dialog-copy">学生: <strong>{{ currentStudent?.name }}</strong> ({{ currentStudent?.student_id }})</p>
        <el-input v-model="newNote" type="textarea" :rows="3" placeholder="备注（可选）" />
        <template #footer>
          <el-button @click="addDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="addLoading" @click="confirmAddInteraction">确认添加</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="manageDialogVisible" title="互动记录管理" width="min(620px, 94vw)">
        <p class="dialog-copy">学生: <strong>{{ currentStudent?.name }}</strong> ({{ currentStudent?.student_id }})</p>
        <el-table :data="interactionList" v-loading="manageLoading" style="width: 100%" max-height="400">
          <el-table-column label="时间" min-width="170">
            <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
          </el-table-column>
          <el-table-column prop="note" label="备注" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ row.note || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="deleteInteraction(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!manageLoading && interactionList.length === 0" class="dialog-empty">暂无互动记录</div>
      </el-dialog>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { Document, Memo, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const matrix = ref([])
const assignments = ref([])
const loading = ref(false)

const addDialogVisible = ref(false)
const manageDialogVisible = ref(false)
const currentStudent = ref(null)
const newNote = ref('')
const addLoading = ref(false)
const manageLoading = ref(false)
const interactionList = ref([])

const totalInteractions = computed(() =>
  matrix.value.reduce((sum, item) => sum + (item.interaction_count || 0), 0)
)

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
    const idx = matrix.value.findIndex((s) => s.student_id === currentStudent.value.student_id)
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
  } catch {
    return
  }
  try {
    await api.delete(`/admin/interactions/${interactionId}`)
    interactionList.value = interactionList.value.filter((i) => i.id !== interactionId)
    const idx = matrix.value.findIndex((s) => s.student_id === currentStudent.value.student_id)
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
    const idMap = {}
    for (const s of studentsRes.data) {
      idMap[s.student_id] = s.id
    }
    matrix.value = dashRes.data.map((row) => ({ ...row, _dbId: idMap[row.student_id] }))
    assignments.value = assignRes.data
  } catch {
    ElMessage.error('加载看板数据失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.interaction-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.interaction-count {
  color: var(--brand);
  font-weight: 800;
}

.interaction-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 0.8rem;
  font-weight: 800;
}

.card-actions {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.mobile-submissions {
  display: grid;
  gap: 10px;
  padding-top: 14px;
}

.mobile-submission-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-copy {
  margin: 0 0 14px;
  color: var(--text-muted);
}

.dialog-empty {
  padding-top: 16px;
  text-align: center;
  color: var(--text-muted);
  font-weight: 600;
}
</style>
