<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <el-button @click="$router.push('/assignments')" class="back-btn">
          <span class="back-icon">←</span>
          <span class="back-text">返回列表</span>
        </el-button>
        <span class="title">提交历史</span>
        <span class="spacer" />
      </el-header>
      <el-main class="main-content">
        <div v-if="loading"><el-skeleton :rows="5" animated /></div>
        <el-empty v-else-if="history.length === 0" description="暂无提交记录" class="empty-container" />
        <div v-else class="history-container">
          <el-card
            v-for="sub in history"
            :key="sub.version_no"
            class="version-card"
          >
            <template #header>
              <div class="card-header">
                <span class="version-label">版本 v{{ sub.version_no }}</span>
                <span class="sub-time">{{ formatDate(sub.submitted_at) }}</span>
              </div>
            </template>
            
            <!-- 桌面端表格视图 -->
            <div class="desktop-view">
              <el-table :data="sub.files" size="small">
                <el-table-column prop="filename" label="文件名" show-overflow-tooltip />
                <el-table-column label="操作" width="100" align="center">
                  <template #default="{ row }">
                    <el-link :href="row.download_url" target="_blank" type="primary">下载</el-link>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 移动端列表视图 -->
            <div class="mobile-view">
              <div class="file-item" v-for="(file, index) in sub.files" :key="index">
                <div class="file-info">
                  <span class="file-icon">📄</span>
                  <span class="file-name">{{ file.filename }}</span>
                </div>
                <el-link :href="file.download_url" target="_blank" type="primary" class="download-link">
                  <span class="download-text">下载</span>
                  <span class="download-icon">⬇</span>
                </el-link>
              </div>
            </div>
          </el-card>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const history = ref([])
const loading = ref(false)

// 响应式窗口尺寸
const windowWidth = ref(window.innerWidth)
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadHistory()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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
  
  // 移动端显示更紧凑
  if (windowWidth.value < 576) {
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hours}:${minutes}`
    }
    return `${year.toString().slice(2)}-${month}-${day} ${hours}:${minutes}`
  }
  
  // 桌面端显示完整信息
  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

async function loadHistory() {
  loading.value = true
  try {
    const res = await api.get(`/assignments/${route.params.id}/submissions`)
    history.value = res.data
  } catch {
    ElMessage.error('加载历史失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 基础样式 */
.page { 
  min-height: 100vh; 
  background: #f5f7fa; 
}

.app-header {
  height: auto !important;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 12px 20px;
  gap: 16px;
}

.back-btn .back-icon {
  display: inline;
}

.back-btn .back-text {
  display: inline;
  margin-left: 4px;
}

.title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #303133; 
  flex: 1;
  text-align: center;
}

.spacer {
  width: 80px;
}

.main-content {
  padding: 20px;
}

.history-container {
  max-width: 800px;
  margin: 0 auto;
}

.empty-container {
  max-width: 800px;
  margin: 0 auto;
}

.version-card { 
  margin-bottom: 16px; 
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.card-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  gap: 12px;
}

.version-label {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.sub-time { 
  font-size: 13px; 
  color: #909399; 
  flex-shrink: 0;
}

/* 桌面端表格视图 */
.desktop-view {
  display: block;
}

.desktop-view :deep(.el-table) {
  font-size: 14px;
}

.desktop-view :deep(.el-table th) {
  background-color: #fafafa;
}

/* 移动端列表视图 */
.mobile-view {
  display: none;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #ebeef5;
  gap: 12px;
}

.file-item:last-child {
  border-bottom: none;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.file-name {
  color: #303133;
  font-size: 14px;
  word-break: break-word;
  flex: 1;
}

.download-link {
  flex-shrink: 0;
}

.download-text {
  display: inline;
}

.download-icon {
  display: none;
}

/* 平板/桌面端 (>= 768px) */
@media (min-width: 768px) {
  .desktop-view {
    display: block;
  }
  
  .mobile-view {
    display: none;
  }
}

/* 中等宽度屏幕优化 (768px - 1200px) */
@media (min-width: 768px) and (max-width: 1200px) {
  .app-header {
    padding: 10px 14px;
  }
  
  .main-content {
    padding: 16px;
  }
  
  .title {
    font-size: 16px;
  }
  
  .version-label {
    font-size: 14px;
  }
  
  .sub-time {
    font-size: 12px;
  }
  
  .desktop-view :deep(.el-table) {
    font-size: 13px;
  }
}

/* 移动端 (< 768px) */
@media (max-width: 768px) {
  .app-header {
    padding: 10px 12px;
  }

  .title {
    font-size: 16px;
  }

  .spacer {
    width: 60px;
  }

  .back-btn {
    padding: 8px 12px;
  }

  .main-content {
    padding: 12px;
  }

  .version-card {
    margin-bottom: 14px;
  }

  .card-header {
    flex-wrap: wrap;
  }

  .version-label {
    font-size: 14px;
  }

  .sub-time {
    font-size: 12px;
  }

  /* 切换到列表视图 */
  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: block;
  }

  .version-card :deep(.el-card__body) {
    padding: 0;
  }
}

/* 小手机 (< 576px) */
@media (max-width: 576px) {
  .app-header {
    padding: 8px 10px;
  }

  .title {
    font-size: 15px;
  }

  .spacer {
    width: 50px;
  }

  .back-btn {
    padding: 6px 10px;
    font-size: 14px;
  }

  .back-btn .back-text {
    display: none;
  }

  .main-content {
    padding: 10px;
  }

  .version-card {
    margin-bottom: 12px;
    border-radius: 6px;
  }

  .version-card :deep(.el-card__header) {
    padding: 12px 14px;
  }

  .version-label {
    font-size: 13px;
  }

  .sub-time {
    font-size: 11px;
    width: 100%;
    margin-top: 4px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .file-item {
    padding: 10px 14px;
  }

  .file-icon {
    font-size: 16px;
  }

  .file-name {
    font-size: 13px;
  }

  .download-text {
    display: none;
  }

  .download-icon {
    display: inline;
    font-size: 16px;
  }
}

/* 横屏手机优化 */
@media (max-width: 768px) and (orientation: landscape) {
  .app-header {
    min-height: 50px;
  }

  .main-content {
    padding: 10px;
  }

  .card-header {
    flex-direction: row;
    align-items: center;
  }

  .sub-time {
    width: auto;
    margin-top: 0;
  }
}
</style>