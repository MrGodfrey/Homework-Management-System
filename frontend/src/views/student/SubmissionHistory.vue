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
        <article v-for="(sub, index) in history" :key="sub.version_no" class="surface-card version-card">
          <div class="version-head">
            <div>
              <div class="version-title-row">
                <h2 class="section-title">版本 v{{ sub.version_no }}</h2>
                <span v-if="index === 0" class="latest-chip">Latest</span>
              </div>
              <p class="section-subtitle">{{ formatDate(sub.submitted_at) }}</p>
            </div>
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

.file-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
