<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <el-button @click="$router.push('/admin/assignments')">← 返回作业管理</el-button>
        <span class="title">提交详情</span>
        <div class="header-actions">
          <el-button @click="downloadZip('latest')" :loading="downloading === 'latest'">
            下载最新版 ZIP
          </el-button>
          <el-button type="primary" @click="downloadZip('all')" :loading="downloading === 'all'">
            下载全部版本 ZIP
          </el-button>
        </div>
      </el-header>
      <el-main>
        <el-table :data="submissions" v-loading="loading" style="width:100%">
          <el-table-column prop="id" label="提交 ID" width="90" />
          <el-table-column prop="student_id" label="学号" width="160" />
          <el-table-column label="版本号" width="100">
            <template #default="{ row }">v{{ row.version }}</template>
          </el-table-column>
          <el-table-column label="提交时间" min-width="180">
            <template #default="{ row }">{{ formatDate(row.time) }}</template>
          </el-table-column>
        </el-table>
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
const submissions = ref([])
const loading = ref(false)
const downloading = ref(null)

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
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
    const filename = mode === 'latest'
      ? `HW${route.params.id}_latest_only.zip`
      : `HW${route.params.id}_all_versions.zip`
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('下载失败')
  } finally {
    downloading.value = null
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/submissions`)
    submissions.value = res.data
  } catch {
    ElMessage.error('加载提交列表失败')
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
.header-actions { display: flex; gap: 8px; }
</style>
