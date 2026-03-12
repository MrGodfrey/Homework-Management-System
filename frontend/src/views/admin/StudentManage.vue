<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <el-button @click="$router.push('/admin/dashboard')">← 返回看板</el-button>
        <span class="title">学生管理</span>
        <div class="header-actions">
          <el-upload
            :before-upload="importCSV"
            accept=".csv"
            :show-file-list="false"
          >
            <el-button type="primary">导入学生名单 (CSV)</el-button>
          </el-upload>
        </div>
      </el-header>
      <el-main>
        <div style="margin-bottom: 16px">
          <el-button @click="generatePasswords" :loading="generating">
            批量生成密码并下载 CSV
          </el-button>
        </div>
        <el-table :data="students" v-loading="loading" style="width:100%">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="student_id" label="学号" width="160" />
          <el-table-column prop="name" label="姓名" min-width="150" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="warning" @click="resetPassword(row)">重置密码</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const students = ref([])
const loading = ref(false)
const generating = ref(false)

async function loadStudents() {
  loading.value = true
  try {
    const res = await api.get('/admin/students')
    students.value = res.data
  } catch {
    ElMessage.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
}

async function importCSV(file) {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await api.post('/admin/students/import', formData)
    ElMessage.success(res.data.message)
    loadStudents()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '导入失败')
  }
  return false
}

async function generatePasswords() {
  generating.value = true
  try {
    const res = await api.post('/admin/students/generate-passwords', {}, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = 'passwords.csv'
    link.click()
    URL.revokeObjectURL(url)
    ElMessage.success('密码已生成并开始下载')
  } catch {
    ElMessage.error('生成密码失败')
  } finally {
    generating.value = false
  }
}

async function resetPassword(student) {
  try {
    await ElMessageBox.confirm(
      `确认重置 ${student.name}（${student.student_id}）的密码？`,
      '重置密码',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    )
    const res = await api.post(`/admin/students/${student.id}/reset-password`)
    ElMessageBox.alert(
      `新密码：<b>${res.data.new_password}</b>`,
      `${student.name} 的新密码`,
      { dangerouslyUseHTMLString: true, confirmButtonText: '已记录' }
    )
  } catch (e) {
    if (e !== 'cancel' && e.message !== 'cancel') ElMessage.error('重置失败')
  }
}

onMounted(loadStudents)
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
