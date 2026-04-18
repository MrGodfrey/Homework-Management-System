<template>
  <AuthLayout
    kicker="Student Access"
    title="学生登录"
    description="进入作业列表、查看课堂互动、上传新版本并跟进评分结果。"
    subtitle="欢迎回来，继续处理本学期的课程任务。"
    note="学生登录后可直接进入作业列表，并继续当前账号下的提交记录。"
    switch-text="需要进入教师管理端？"
    switch-label="教师登录入口"
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
