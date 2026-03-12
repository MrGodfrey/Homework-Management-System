<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <el-button @click="$router.push('/assignments')">返回列表</el-button>
        <span class="title">提交历史</span>
        <span />
      </el-header>
      <el-main>
        <div v-if="loading"><el-skeleton :rows="5" animated /></div>
        <el-empty v-else-if="history.length === 0" description="暂无提交记录" />
        <el-card
          v-else
          v-for="sub in history"
          :key="sub.version_no"
          class="version-card"
        >
          <template #header>
            <div class="card-header">
              <span>版本 v{{ sub.version_no }}</span>
              <span class="sub-time">提交时间：{{ formatDate(sub.submitted_at) }}</span>
            </div>
          </template>
          <el-table :data="sub.files" size="small">
            <el-table-column prop="filename" label="文件名" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-link :href="row.download_url" target="_blank" type="primary">下载</el-link>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const history = ref([])
const loading = ref(false)

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get(`/assignments/${route.params.id}/submissions`)
    history.value = res.data
  } catch {
    ElMessage.error('加载历史失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f7fa; }
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}
.title { font-size: 18px; font-weight: 600; color: #303133; }
.version-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.sub-time { font-size: 13px; color: #909399; }
</style>