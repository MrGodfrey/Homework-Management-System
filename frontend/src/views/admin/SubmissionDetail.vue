<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <el-button @click="$router.push('/admin/assignments')">← 返回作业管理</el-button>
        <span class="title">提交详情</span>
        <div class="header-actions">
          <el-button @click="exportCSV" :loading="exporting">导出 CSV</el-button>
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
          <el-table-column prop="student_id" label="学号" width="140" />
          <el-table-column prop="student_name" label="姓名" width="120" />
          <el-table-column label="版本号" width="80">
            <template #default="{ row }">v{{ row.version }}</template>
          </el-table-column>
          <el-table-column label="提交时间" width="180">
            <template #default="{ row }">{{ formatDate(row.time) }}</template>
          </el-table-column>
          <el-table-column label="分数" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.is_graded" type="success">{{ row.score || '-' }}</el-tag>
              <el-tag v-else type="info">85 (默认)</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="downloadSingle(row)" :loading="downloadingSingle === row.id">
                下载
              </el-button>
              <el-button size="small" type="primary" @click="openGradeDialog(row)">
                评分
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>

    <!-- 评分对话框 -->
    <el-dialog v-model="gradeDialogVisible" title="评分" width="480px">
      <el-form :model="gradeForm" label-width="80px">
        <el-form-item label="学生">
          <span>{{ currentStudent?.student_name }} ({{ currentStudent?.student_id }})</span>
        </el-form-item>
        <el-form-item label="分数">
          <el-input-number 
            v-model="gradeForm.score" 
            :min="0" 
            :max="100" 
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="快捷调整">
          <el-button-group>
            <el-button size="small" @click="adjustScore(-5)">-5</el-button>
            <el-button size="small" @click="adjustScore(-1)">-1</el-button>
            <el-button size="small" @click="adjustScore(1)">+1</el-button>
            <el-button size="small" @click="adjustScore(5)">+5</el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="gradeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="grading" @click="submitGrade">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const submissions = ref([])
const loading = ref(false)
const downloading = ref(null)
const downloadingSingle = ref(null)
const exporting = ref(false)
const gradeDialogVisible = ref(false)
const grading = ref(false)
const currentStudent = ref(null)
const gradeForm = reactive({ score: 85 })

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

function adjustScore(delta) {
  const newScore = (gradeForm.score || 85) + delta
  gradeForm.score = Math.max(0, Math.min(100, newScore))
}

function openGradeDialog(row) {
  currentStudent.value = row
  gradeForm.score = row.score || 85
  gradeDialogVisible.value = true
}

async function submitGrade() {
  grading.value = true
  try {
    await api.patch(`/admin/submissions/${currentStudent.value.id}/grade`, {
      score: gradeForm.score
    })
    ElMessage.success('评分成功')
    gradeDialogVisible.value = false
    // 刷新列表
    loadSubmissions()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '评分失败')
  } finally {
    grading.value = false
  }
}

async function downloadSingle(row) {
  downloadingSingle.value = row.id
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/submissions/${row.student_id}/download`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `HW${route.params.id}_${row.student_id}_${row.student_name}.zip`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch {
    ElMessage.error('下载失败')
  } finally {
    downloadingSingle.value = null
  }
}

async function exportCSV() {
  exporting.value = true
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/export_csv`, {
      responseType: 'blob'
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `assignment_${route.params.id}_grades.csv`
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
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

async function loadSubmissions() {
  loading.value = true
  try {
    const res = await api.get(`/admin/assignments/${route.params.id}/submissions`)
    submissions.value = res.data
  } catch {
    ElMessage.error('加载提交列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadSubmissions)
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
