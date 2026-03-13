<template>
  <div class="page">
    <el-container>
      <el-header class="app-header">
        <el-button @click="$router.push('/assignments')" class="back-btn">
          <span class="back-icon">←</span>
          <span class="back-text">返回列表</span>
        </el-button>
        <span class="title">提交作业</span>
        <span class="spacer" />
      </el-header>
      <el-main class="main-content">
        <div v-if="loading"><el-skeleton :rows="6" animated /></div>
        <el-card v-else-if="assignment" class="detail-card">
          <template #header>
            <div class="card-header-content">
              <h3>{{ assignment.title }}</h3>
            </div>
          </template>
          <el-descriptions :column="descriptionsColumn" border>
            <el-descriptions-item label="截止时间" :label-style="labelStyle">
              {{ formatDate(assignment.deadline) }}
            </el-descriptions-item>
            <el-descriptions-item label="允许迟交" :label-style="labelStyle">
              <el-tag :type="assignment.allow_late ? 'success' : 'danger'" size="small">
                {{ assignment.allow_late ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="assignment.file_rules" label="允许文件类型" :label-style="labelStyle">
              {{ assignment.file_rules }}
            </el-descriptions-item>
            <el-descriptions-item v-if="assignment.description" label="作业说明" :label-style="labelStyle">
              <div class="description">{{ assignment.description }}</div>
            </el-descriptions-item>
          </el-descriptions>

          <div class="upload-section">
            <h4>上传文件</h4>
            <el-upload
              v-model:file-list="fileList"
              multiple
              :auto-upload="false"
              class="upload-container"
            >
              <el-button type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持多文件同时上传</div>
              </template>
            </el-upload>
            <el-progress
              v-if="uploading"
              :percentage="progress"
              class="upload-progress"
            />
            <div class="submit-button-container">
              <el-button
                type="success"
                :loading="uploading"
                :disabled="fileList.length === 0"
                @click="submitFiles"
                class="submit-btn"
              >
                提交作业
              </el-button>
            </div>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const assignment = ref(null)
const loading = ref(false)
const uploading = ref(false)
const progress = ref(0)
const fileList = ref([])

// 响应式窗口尺寸
const windowWidth = ref(window.innerWidth)
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadAssignment()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 响应式计算属性
const descriptionsColumn = computed(() => {
  return windowWidth.value < 576 ? 1 : 1
})

const labelStyle = computed(() => {
  if (windowWidth.value < 576) {
    return { fontSize: '13px' }
  }
  return {}
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
  
  // 如果是今年，不显示年份
  if (year === now.getFullYear()) {
    return `${month}-${day} ${hours}:${minutes}`
  }
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

async function submitFiles() {
  if (fileList.value.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }
  const formData = new FormData()
  for (const f of fileList.value) {
    formData.append('files', f.raw)
  }
  uploading.value = true
  progress.value = 0
  try {
    const res = await api.post(`/assignments/${route.params.id}/submit`, formData, {
      onUploadProgress(e) {
        if (e.total) progress.value = Math.round((e.loaded / e.total) * 100)
      }
    })
    ElMessage.success(`提交成功！版本号 v${res.data.version_no}`)
    fileList.value = []
    router.push(`/assignments/${route.params.id}/submissions`)
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '提交失败')
  } finally {
    uploading.value = false
  }
}

async function loadAssignment() {
  loading.value = true
  try {
    const res = await api.get(`/assignments/${route.params.id}`)
    assignment.value = res.data
  } catch {
    ElMessage.error('加载作业详情失败')
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
  display: flex;
  justify-content: center;
}

.detail-card { 
  width: 100%;
  max-width: 720px; 
}

.card-header-content h3 { 
  margin: 0; 
  color: #303133; 
  font-size: 18px;
  word-break: break-word;
}

.description {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.upload-section {
  margin-top: 24px;
}

.upload-section h4 { 
  color: #303133; 
  margin-bottom: 12px; 
  font-size: 16px;
}

.upload-container {
  width: 100%;
}

.upload-progress {
  margin-top: 12px;
  max-width: 400px;
}

.submit-button-container {
  margin-top: 16px;
}

.submit-btn {
  width: auto;
}

/* 平板/桌面端 (>= 768px) */
@media (min-width: 768px) {
  .detail-card :deep(.el-descriptions__label) {
    width: 120px;
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
  
  .card-header-content h3 {
    font-size: 17px;
  }
  
  .upload-section h4 {
    font-size: 15px;
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

  .detail-card {
    max-width: 100%;
  }

  .card-header-content h3 {
    font-size: 16px;
  }

  .upload-section h4 {
    font-size: 15px;
  }

  .detail-card :deep(.el-descriptions__label) {
    width: 90px;
    font-size: 13px;
  }

  .detail-card :deep(.el-descriptions__content) {
    font-size: 13px;
  }

  .upload-progress {
    max-width: 100%;
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

  .detail-card {
    border-radius: 6px;
  }

  .card-header-content h3 {
    font-size: 15px;
  }

  .upload-section {
    margin-top: 20px;
  }

  .upload-section h4 {
    font-size: 14px;
    margin-bottom: 10px;
  }

  .detail-card :deep(.el-card__body) {
    padding: 14px;
  }

  .detail-card :deep(.el-card__header) {
    padding: 14px;
  }

  .detail-card :deep(.el-descriptions__label) {
    width: 70px;
    font-size: 12px;
    padding: 8px;
  }

  .detail-card :deep(.el-descriptions__content) {
    font-size: 12px;
    padding: 8px;
  }

  .detail-card :deep(.el-upload__tip) {
    font-size: 12px;
  }

  .submit-button-container {
    margin-top: 12px;
  }

  .submit-btn {
    width: 100%;
    font-size: 14px;
  }

  .detail-card :deep(.el-button) {
    font-size: 13px;
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
}
</style>
