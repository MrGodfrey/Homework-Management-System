<template>
  <div class="auth-layout">
    <div class="auth-frame">
      <section class="auth-panel">
        <div class="auth-brand">
          <div class="auth-brand-mark">
            <el-icon :size="28"><School /></el-icon>
          </div>
          <div class="auth-brand-copy">
            <h1>ClassLink</h1>
            <p>{{ subtitle }}</p>
          </div>
        </div>

        <div class="auth-notes">
          <article class="auth-note">
            <div class="auth-note-title">统一的课堂工作区</div>
            <div class="auth-note-copy">保留作业发布、提交历史、评分、附件下载、学生管理和互动记录等全部流程。</div>
          </article>
          <article class="auth-note">
            <div class="auth-note-title">当前入口</div>
            <div class="auth-note-copy">{{ note }}</div>
          </article>
        </div>
      </section>

      <section class="auth-card">
        <div class="auth-card-head">
          <span class="auth-card-kicker">{{ kicker }}</span>
          <h2>{{ title }}</h2>
          <p>{{ description }}</p>
        </div>

        <slot />

        <div class="auth-switch">
          <span>{{ switchText }}</span>
          <router-link :to="switchRoute" class="auth-switch-link">{{ switchLabel }}</router-link>
        </div>

        <div v-if="hint" class="auth-hint">{{ hint }}</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { School } from '@element-plus/icons-vue'

defineProps({
  kicker: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  },
  switchText: {
    type: String,
    default: ''
  },
  switchLabel: {
    type: String,
    default: ''
  },
  switchRoute: {
    type: String,
    default: '/'
  },
  hint: {
    type: String,
    default: ''
  }
})
</script>
