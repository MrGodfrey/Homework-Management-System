<template>
  <AppShell
    role="student"
    :display-name="userInfo?.name"
    :display-meta="userInfo?.student_id"
    student-portal-closed
  >
    <div class="closed-page">
      <section class="closed-panel">
        <div class="closed-icon">
          <el-icon :size="30"><CircleCheckFilled /></el-icon>
        </div>

        <div class="closed-copy">
          <p class="closed-kicker">课程通知</p>
          <h1>本学期课程已结束</h1>
          <p>{{ closedMessage }}</p>
        </div>

        <div class="closed-actions">
          <el-button type="primary" plain @click="openCourseHome">
            <el-icon><HomeFilled /></el-icon>
            <span>课程主页</span>
          </el-button>
          <el-button plain @click="logout">
            <el-icon><SwitchButton /></el-icon>
            <span>退出登录</span>
          </el-button>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheckFilled, HomeFilled, SwitchButton } from '@element-plus/icons-vue'
import AppShell from '@/components/AppShell.vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'

const COURSE_HOME_URL = 'https://www.drwang.fun/neural-networks.html'
const DEFAULT_MESSAGE = '本学期课程已顺利结束，作业系统现已关闭。感谢你这个学期的认真投入；历史提交与分数查看通道已暂停开放。如有特殊情况，请联系任课老师。'

const router = useRouter()
const auth = useAuthStore()
const userInfo = ref(null)

const closedMessage = computed(() => auth.studentPortalClosedMessage || DEFAULT_MESSAGE)

onMounted(() => {
  loadUserInfo()
})

async function loadUserInfo() {
  try {
    const res = await api.get('/assignments/me')
    userInfo.value = res.data
  } catch {
    userInfo.value = null
  }
}

function openCourseHome() {
  window.open(COURSE_HOME_URL, '_blank', 'noopener,noreferrer')
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.closed-page {
  min-height: calc(100vh - 80px);
  display: grid;
  align-items: center;
}

.closed-panel {
  max-width: 760px;
  padding: 48px;
  display: grid;
  gap: 24px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(255, 255, 255, 0.98) 46%, rgba(236, 253, 245, 0.78)),
    var(--surface);
  box-shadow: var(--shadow-soft);
}

.closed-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: var(--emerald-soft);
  color: var(--emerald);
}

.closed-copy {
  display: grid;
  gap: 12px;
}

.closed-kicker {
  margin: 0;
  color: var(--brand);
  font-size: 0.86rem;
  font-weight: 800;
}

.closed-copy h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: clamp(2rem, 4vw, 3.1rem);
  line-height: 1.08;
  font-weight: 800;
}

.closed-copy p:last-child {
  margin: 0;
  max-width: 640px;
  color: var(--text-muted);
  font-size: 1.02rem;
  line-height: 1.8;
  font-weight: 600;
}

.closed-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .closed-page {
    min-height: auto;
  }

  .closed-panel {
    padding: 28px;
  }

  .closed-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
