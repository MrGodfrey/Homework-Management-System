<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <span class="title">提交看板</span>
        <div class="nav-btns">
          <el-button @click="$router.push('/admin/assignments')">作业管理</el-button>
          <el-button @click="$router.push('/admin/students')">学生管理</el-button>
          <el-button type="danger" plain @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <div v-if="loading"><el-skeleton :rows="8" animated /></div>
        <el-table
          v-else
          :data="matrix"
          border
          style="width:100%"
          :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
        >
          <el-table-column prop="student_id" label="学号" width="130" fixed />
          <el-table-column prop="name" label="姓名" width="110" fixed />
          <el-table-column
            v-for="a in assignments"
            :key="a.id"
            :label="a.title"
            min-width="130"
          >
            <template #default="{ row }">
              <el-tag
                v-if="row.submissions[a.id] > 0"
                type="success"
                size="small"
                style="cursor:pointer"
                @click="$router.push(`/admin/assignments/${a.id}/submissions`)"
              >
                v{{ row.submissions[a.id] }}
              </el-tag>
              <el-tag v-else type="info" size="small">未提交</el-tag>
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
const matrix = ref([])
const assignments = ref([])
const loading = ref(false)

function logout() {
  auth.logout()
  router.push('/admin/login')
}

onMounted(async () => {
  loading.value = true
  try {
    const [dashRes, assignRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/assignments')
    ])
    matrix.value = dashRes.data
    assignments.value = assignRes.data
  } catch {
    ElMessage.error('加载看板数据失败')
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
.nav-btns { display: flex; gap: 8px; }
</style>
