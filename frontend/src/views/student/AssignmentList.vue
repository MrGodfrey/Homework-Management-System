<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <span class="title">作业列表</span>
        <el-button type="danger" plain size="small" @click="logout">退出登录</el-button>
      </el-header>
      <el-main>
        <el-table :data="assignments" v-loading="loading" style="width:100%">
          <el-table-column prop="title" label="作业名称" min-width="200" />
          <el-table-column label="截止时间" width="180">
            <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
          </el-table-column>
          <el-table-column label="允许迟交" width="100">
            <template #default="{ row }">
              <el-tag :type="row.allow_late ? 'success' : 'danger'" size="small">{{ row.allow_late ? '是' : '否' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交状态" width="160">
            <template #default="{ row }">
              <el-tag v-if="row.status.submitted" type="success">已提交 v{{ row.status.version_no }}</el-tag>
              <el-tag v-else type="info">未提交</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="$router.push(`/assignments/${row.id}`)"
                >提交作业</el-button
              >
              <el-button size="small" @click="$router.push(`/assignments/${row.id}/submissions`)"
                >提交历史</el-button
              >
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
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const assignments = ref([])
const loading = ref(false)

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/assignments')
    assignments.value = res.data
  } catch {
    ElMessage.error('加载作业列表失败')
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
</style>