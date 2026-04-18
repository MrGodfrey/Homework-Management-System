<template>
  <AuthLayout
    kicker="Instructor Access"
    title="教师登录"
    switch-text="切换身份"
    switch-label="前往学生登录"
    switch-route="/login"
  >
    <el-form class="auth-form" :model="form" @submit.prevent="handleLogin">
      <div class="auth-field">
        <label class="auth-label">用户名</label>
        <el-input v-model="form.username" class="auth-input" placeholder="请输入用户名">
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
        </el-input>
      </div>

      <div class="auth-field">
        <label class="auth-label">密码</label>
        <el-input v-model="form.password" class="auth-input" type="password" placeholder="请输入密码" show-password>
          <template #prefix>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
      </div>

      <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%">
        登录
        <el-icon style="margin-left: 6px"><ArrowRight /></el-icon>
      </el-button>
    </el-form>
  </AuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Lock, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import AuthLayout from '@/components/AuthLayout.vue'
import api from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const form = reactive({ username: '', password: '' })

async function handleLogin() {
  if (!form.username || !form.password) {
    ElMessage.warning('请填写所有字段')
    return
  }
  loading.value = true
  try {
    const res = await api.post('/auth/instructor/login', form)
    auth.setAuth(res.data.access_token, 'instructor')
    router.push('/admin/dashboard')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
