<template>
  <AppShell role="instructor" display-name="教师账号" display-meta="课程管理控制台">
    <div class="page-stack">
      <section class="page-hero">
        <div>
          <h1 class="page-title">课程看板</h1>
        </div>
      </section>

      <section class="toolbar-panel dashboard-toolbar">
        <el-input
          v-model="search"
          clearable
          placeholder="搜索姓名或学号后几位"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </section>

      <section class="summary-grid dashboard-summary-grid">
        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><User /></el-icon>
            <span>学生总数</span>
          </div>
          <div class="summary-tile-value">{{ filteredMatrix.length }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Document /></el-icon>
            <span>作业数量</span>
          </div>
          <div class="summary-tile-value">{{ assignments.length }}</div>
        </article>

        <article class="summary-tile">
          <div class="summary-tile-label">
            <el-icon><Memo /></el-icon>
            <span>互动记录</span>
          </div>
          <div class="summary-tile-value">{{ visibleInteractions }}</div>
        </article>
      </section>

      <section class="surface-card soft">
        <div class="section-header">
          <div>
            <h2 class="section-title">学生进度矩阵</h2>
          </div>
        </div>

        <div class="table-shell desktop-view">
          <el-table
            :data="filteredMatrix"
            border
            v-loading="loading"
            style="width: 100%"
            :header-cell-style="{ background: '#f8fafc', color: '#64748b' }"
            :empty-text="emptyText"
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
          <div v-if="loading" class="card-stack">
            <el-skeleton v-for="item in 3" :key="item" animated :rows="4" />
          </div>

          <div v-else-if="filteredMatrix.length === 0" class="empty-panel">
            {{ emptyText }}
          </div>

          <div v-else class="card-stack">
            <article v-for="student in filteredMatrix" :key="student.student_id" class="list-card">
              <div class="list-card-header">
                <div>
                  <h3 class="list-card-title">{{ student.name }}</h3>
                  <p class="list-card-subtitle">{{ student.student_id }}</p>
                </div>
              </div>

              <div class="interaction-toolbar">
                <span class="meta-label">互动次数</span>
                <div class="interaction-toolbar-actions">
                  <span class="interaction-pill">{{ student.interaction_count }} 次</span>
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
import { Document, Memo, Search, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const matrix = ref([])
const assignments = ref([])
const loading = ref(false)
const search = ref('')

const addDialogVisible = ref(false)
const manageDialogVisible = ref(false)
const currentStudent = ref(null)
const newNote = ref('')
const addLoading = ref(false)
const manageLoading = ref(false)
const interactionList = ref([])

const filteredMatrix = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return matrix.value

  return matrix.value.filter((student) => {
    const name = String(student.name || '').toLowerCase()
    const studentId = String(student.student_id || '').toLowerCase()
    return name.includes(keyword) || studentId.includes(keyword)
  })
})

const visibleInteractions = computed(() =>
  filteredMatrix.value.reduce((sum, item) => sum + (item.interaction_count || 0), 0)
)

const emptyText = computed(() =>
  search.value.trim() ? '未找到匹配的学生' : '暂无学生数据'
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
.toolbar-panel {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.search-input {
  width: min(320px, 100%);
}

.dashboard-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

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

.interaction-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--border);
}

.interaction-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
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

@media (max-width: 960px) {
  .dashboard-summary-grid .summary-tile-value {
    font-size: 1.7rem;
  }
}

@media (max-width: 640px) {
  .toolbar-panel {
    justify-content: stretch;
  }

  .search-input {
    width: 100%;
  }

  .dashboard-summary-grid {
    gap: 8px;
  }

  .dashboard-summary-grid .summary-tile {
    padding: 10px 8px;
  }

  .dashboard-summary-grid .summary-tile-label {
    gap: 6px;
    font-size: 0.74rem;
    line-height: 1.3;
  }

  .dashboard-summary-grid .summary-tile-value {
    font-size: 1.55rem;
  }

  .interaction-toolbar {
    align-items: center;
    justify-content: space-between;
  }

  .interaction-toolbar-actions {
    width: auto;
    margin-left: auto;
    justify-content: flex-end;
  }

  .interaction-pill {
    padding: 6px 10px;
  }
}
</style>
