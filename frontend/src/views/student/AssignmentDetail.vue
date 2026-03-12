<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <el-button @click="$router.push('/assignments')">← 返回列表</el-button>
        <span class="title">提交作业</span>
        <span />
      </el-header>
      <el-main>
        <div v-if="loading"><el-skeleton :rows="6" animated /></div>
        <el-card v-else-if="assignment" class="detail-card">
          <template #header><h3>{{ assignment.title }}</h3></template>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="截止时间">{{ formatDate(assignment.deadline) }}</el-descriptions-item>
            <el-descriptions-item label="允许迟交">
              <el-tag :type="assignment.allow_late ? 'success' : 'danger'" size="small">
                {{ assignment.allow_late ? '是' : '否' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="assignment.file_rules" label="允许文件类型">
              {{ assignment.file_rules }}
            </el-descriptions-item>
            <el-descriptions-item v-if="assignment.description" label="作业说明">
              {{ assignment.description }}
            </el-descriptions-item>
          </el-descriptions>

          <div style="margin-top: 24px">
            <h4>上传文件</h4>
            <el-upload
              v-model:file-list="fileList"
              multiple
              :auto-upload="false"
            >
              <el-button type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持多文件同时上传</div>
              </template>
            </el-upload>
            <el-progress
              v-if="uploading"
              :percentage="progress"
              style="margin-top: 12px; max-width: 400px"
            />
            <div style="margin-top: 16px">
              <el-button
                type="success"
                :loading="uploading"
                :disabled="fileList.length === 0"
                @click="submitFiles"
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
import { ref, onMounted } from 'vue'
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

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
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

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get(`/assignments/${route.params.id}`)
    assignment.value = res.data
  } catch {
    ElMessage.error('加载作业详情失败')
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
.detail-card { max-width: 720px; }
h3 { margin: 0; color: #303133; }
h4 { color: #303133; margin-bottom: 12px; }
</style>
