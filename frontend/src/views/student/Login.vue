<template>
  <AuthLayout
    kicker="Student Access"
    title="学生登录"
    switch-text="切换身份"
    switch-label="前往教师登录"
    switch-route="/admin/login"
  >
    <el-form class="auth-form" :model="form" @submit.prevent="handleLogin">
      <div class="auth-field">
        <label class="auth-label">学号</label>
        <el-input v-model="form.student_id" class="auth-input" placeholder="请输入学号">
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
