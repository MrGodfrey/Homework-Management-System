<template>
  <AppShell role="student">
    <div class="page-stack">
      <button type="button" class="back-link" @click="$router.push('/assignments')">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回作业列表</span>
      </button>

      <section class="page-hero">
        <div>
          <h1 class="page-title">{{ assignment?.title || '提交作业' }}</h1>
        </div>
      </section>

      <section v-if="loading" class="surface-card padded">
        <el-skeleton :rows="8" animated />
      </section>

      <section v-else-if="assignment" class="detail-grid">
        <article class="surface-card padded soft">
          <div class="info-list">
            <div class="info-row">
              <div class="info-row-label">截止时间</div>
              <div class="info-row-value">{{ formatDate(assignment.deadline) }}</div>
            </div>

            <div class="info-row">
              <div class="info-row-label">迟交规则</div>
              <div class="info-row-value">
                <el-tag :type="assignment.allow_late ? 'success' : 'danger'" effect="light">
                  {{ assignment.allow_late ? '允许迟交' : '不允许迟交' }}
                </el-tag>
              </div>
            </div>

            <div v-if="assignment.file_rules" class="info-row">
              <div class="info-row-label">允许文件类型</div>
              <div class="info-row-value mono-text">{{ assignment.file_rules }}</div>
            </div>

            <div class="info-row">
              <div class="info-row-label">作业说明</div>
              <div class="info-row-value description-copy">{{ assignment.description || '暂无作业说明。' }}</div>
            </div>

            <div v-if="attachments.length > 0" class="info-row">
              <div class="info-row-label">作业附件</div>
              <div class="info-row-value">
                <ul class="attachment-list attachment-block">
                  <li v-for="file in attachments" :key="file.id" class="attachment-item">
                    <button type="button" class="attachment-link" @click="downloadAttachment(file.id)">
                      {{ file.filename }}
                    </button>
                    <el-button size="small" text @click="downloadAttachment(file.id)">下载</el-button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </article>

        <aside class="page-stack narrow-stack">
          <article class="surface-card padded">
            <div class="toolbar-row upload-title">
              <div class="metric-card-icon">
                <el-icon :size="18"><Upload /></el-icon>
              </div>
              <div>
                <h2 class="section-title">上传文件</h2>
              </div>
            </div>

            <div class="upload-dropzone">
              <el-upload
                v-model:file-list="fileList"
                multiple
                :auto-upload="false"
                :show-file-list="false"
                class="upload-container"
                data-testid="student-assignment-upload"
              >
                <el-button type="primary">选择文件</el-button>
                <template #tip>
                  <div class="upload-tip">支持多文件同时上传</div>
                </template>
              </el-upload>
            </div>

            <ul v-if="fileList.length > 0" class="attachment-list pending-files">
              <li v-for="file in fileList" :key="file.uid" class="attachment-item">
                <span class="attachment-name">{{ file.name }}</span>
                <el-button size="small" text type="danger" @click="removePendingFile(file.uid)">移除</el-button>
              </li>
            </ul>

            <el-progress v-if="uploading" :percentage="progress" class="upload-progress" />

            <el-button
              type="success"
              :loading="uploading"
              :disabled="fileList.length === 0"
              style="width: 100%; margin-top: 18px"
              @click="submitFiles"
            >
              提交作业
            </el-button>
          </article>
        </aside>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import AppShell from '@/components/AppShell.vue'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const assignment = ref(null)
const attachments = ref([])
const loading = ref(false)
const uploading = ref(false)
const progress = ref(0)
const fileList = ref([])

onMounted(() => {
  loadAssignment()
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

function removePendingFile(uid) {
  fileList.value = fileList.value.filter((file) => file.uid !== uid)
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

    const attachmentsRes = await api.get(`/assignments/${route.params.id}/attachments`)
    attachments.value = attachmentsRes.data
  } catch {
    ElMessage.error('加载作业详情失败')
  } finally {
    loading.value = false
  }
}

async function downloadAttachment(fileId) {
  try {
    const res = await api.get(`/assignments/${route.params.id}/attachments/${fileId}/download`)
    window.open(res.data.download_url, '_blank')
  } catch {
    ElMessage.error('获取下载链接失败')
  }
}
</script>

<style scoped>
.narrow-stack {
  gap: 16px;
}

.description-copy {
  white-space: pre-wrap;
}

.attachment-block {
  margin-top: 6px;
}

.attachment-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--brand);
  font-weight: 700;
  cursor: pointer;
}

.upload-title {
  align-items: center;
  margin-bottom: 18px;
}

.upload-tip {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.5;
}

.pending-files {
  margin-top: 16px;
}

.upload-progress {
  margin-top: 18px;
}
</style>
