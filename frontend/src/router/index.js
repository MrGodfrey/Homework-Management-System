import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: () => import('../views/student/Login.vue') },
  { path: '/assignments', meta: { requiresAuth: true, role: 'student' }, component: () => import('../views/student/AssignmentList.vue') },
  { path: '/assignments/:id', meta: { requiresAuth: true, role: 'student' }, component: () => import('../views/student/AssignmentDetail.vue') },
  { path: '/assignments/:id/submissions', meta: { requiresAuth: true, role: 'student' }, component: () => import('../views/student/SubmissionHistory.vue') },
  { path: '/admin/login', component: () => import('../views/admin/Login.vue') },
  { path: '/admin/dashboard', meta: { requiresAuth: true, role: 'instructor' }, component: () => import('../views/admin/Dashboard.vue') },
  { path: '/admin/assignments', meta: { requiresAuth: true, role: 'instructor' }, component: () => import('../views/admin/AssignmentManage.vue') },
  { path: '/admin/students', meta: { requiresAuth: true, role: 'instructor' }, component: () => import('../views/admin/StudentManage.vue') },
  { path: '/admin/assignments/:id/submissions', meta: { requiresAuth: true, role: 'instructor' }, component: () => import('../views/admin/SubmissionDetail.vue') }
]
const router = createRouter({
  history: createWebHistory(),
  routes
})
router.beforeEach((to, from, next) => {
  if (!to.meta.requiresAuth) return next()
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  if (!token || role !== to.meta.role) {
    return next(to.meta.role === 'instructor' ? '/admin/login' : '/login')
  }
  next()
})
export default router
