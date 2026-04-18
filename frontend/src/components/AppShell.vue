<template>
  <div class="app-shell">
    <aside class="shell-sidebar">
      <div class="shell-brand">
        <div class="shell-brand-mark">
          <el-icon :size="24"><School /></el-icon>
        </div>
        <div>
          <p class="shell-brand-title">ClassLink</p>
          <p class="shell-brand-subtitle">{{ roleLabel }}</p>
        </div>
      </div>

      <nav class="shell-nav" aria-label="Primary">
        <button
          v-for="item in navItems"
          :key="item.path || item.label"
          type="button"
          class="shell-nav-item"
          :class="{ 'is-active': item.path ? isActive(item.path) : false, 'is-external': !!item.externalUrl }"
          @click="goTo(item)"
        >
          <span class="shell-nav-icon">
            <el-icon :size="18"><component :is="item.icon" /></el-icon>
          </span>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="shell-sidebar-footer">
        <div class="shell-usercard">
          <div class="shell-avatar">{{ avatarText }}</div>
          <div class="shell-usercopy">
            <div class="shell-user-name">{{ resolvedDisplayName }}</div>
            <div class="shell-user-meta">{{ resolvedDisplayMeta }}</div>
          </div>
        </div>
        <el-button type="danger" plain class="shell-logout" @click="logout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </el-button>
      </div>
    </aside>

    <div class="shell-main">
      <header class="shell-mobile-head">
        <div class="shell-brand">
          <div class="shell-brand-mark">
            <el-icon :size="22"><School /></el-icon>
          </div>
          <div>
            <p class="shell-brand-title">ClassLink</p>
            <p class="shell-brand-subtitle">{{ roleLabel }}</p>
          </div>
        </div>
        <el-button type="danger" plain @click="logout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </el-button>
      </header>

      <nav class="shell-mobile-nav" aria-label="Mobile primary">
        <button
          v-for="item in navItems"
          :key="item.path || item.label"
          type="button"
          class="shell-nav-item"
          :class="{ 'is-active': item.path ? isActive(item.path) : false, 'is-external': !!item.externalUrl }"
          @click="goTo(item)"
        >
          <span class="shell-nav-icon">
            <el-icon :size="16"><component :is="item.icon" /></el-icon>
          </span>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <main class="shell-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataBoard, Document, HomeFilled, Reading, School, SwitchButton, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const COURSE_HOME_URL = 'https://www.drwang.fun/neural-networks.html'

const props = defineProps({
  role: {
    type: String,
    default: 'student'
  },
  displayName: {
    type: String,
    default: ''
  },
  displayMeta: {
    type: String,
    default: ''
  }
})

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const navItems = computed(() => {
  if (props.role === 'instructor') {
    return [
      { label: '看板', path: '/admin/dashboard', icon: DataBoard },
      { label: '作业管理', path: '/admin/assignments', icon: Document },
      { label: '学生管理', path: '/admin/students', icon: User },
      { label: '课程主页', externalUrl: COURSE_HOME_URL, icon: HomeFilled }
    ]
  }

  return [
    { label: '作业列表', path: '/assignments', icon: Reading },
    { label: '课程主页', externalUrl: COURSE_HOME_URL, icon: HomeFilled }
  ]
})

const roleLabel = computed(() => (props.role === 'instructor' ? 'Instructor Workspace' : 'Student Workspace'))
const resolvedDisplayName = computed(() => props.displayName || (props.role === 'instructor' ? '教师账号' : '学生账号'))
const resolvedDisplayMeta = computed(() => props.displayMeta || (props.role === 'instructor' ? '教学管理端' : '课程提交端'))
const avatarText = computed(() => resolvedDisplayName.value.trim().slice(0, 1).toUpperCase() || 'C')

function isActive(path) {
  if (path === '/assignments') {
    return route.path.startsWith('/assignments')
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

function goTo(item) {
  if (item.externalUrl) {
    window.open(item.externalUrl, '_blank', 'noopener,noreferrer')
    return
  }

  if (item.path && !isActive(item.path)) {
    router.push(item.path)
  }
}

function logout() {
  auth.logout()
  router.push(props.role === 'instructor' ? '/admin/login' : '/login')
}
</script>
