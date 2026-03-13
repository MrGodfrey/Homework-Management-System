<template>
  <div class="login-container">
    <el-card class="login-card">
      <h2>学生登录</h2>
      <el-form :model="form" label-width="80px" @submit.prevent="handleLogin">
        <el-form-item label="学号">
          <el-input v-model="form.student_id" placeholder="请输入学号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading" style="width:100%">登录</el-button>
        </el-form-item>
      </el-form>
      <div style="text-align:center;margin-top:8px">
        <el-link @click="$router.push('/admin/login')">教师登录入口</el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const form = reactive({ student_id: '', password: '' })

async function handleLogin() {
  if (!form.student_id || !form.password) {
    ElMessage.warning('请填写学号和密码')
    return
  }
  loading.value = true
  try {
    const res = await api.post('/auth/student/login', form)
    auth.setAuth(res.data.access_token, 'student')
    router.push('/assignments')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f7fa;
}
.login-card {
  width: 400px;
  padding: 20px;
}
h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #303133;
}
</style>