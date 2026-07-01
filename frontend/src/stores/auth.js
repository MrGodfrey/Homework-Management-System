import { defineStore } from 'pinia';
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    role: localStorage.getItem('role') || '',
    studentPortalClosed: localStorage.getItem('studentPortalClosed') === 'true',
    studentPortalClosedMessage: localStorage.getItem('studentPortalClosedMessage') || ''
  }),
  actions: {
    setAuth(token, role, options = {}) {
      const studentPortalClosed = Boolean(options.studentPortalClosed)
      const studentPortalClosedMessage = options.studentPortalClosedMessage || ''
      this.token = token
      this.role = role
      this.studentPortalClosed = studentPortalClosed
      this.studentPortalClosedMessage = studentPortalClosedMessage
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      if (role === 'student') {
        localStorage.setItem('studentPortalClosed', studentPortalClosed ? 'true' : 'false')
        localStorage.setItem('studentPortalClosedMessage', studentPortalClosedMessage)
      } else {
        localStorage.removeItem('studentPortalClosed')
        localStorage.removeItem('studentPortalClosedMessage')
      }
    },
    logout() {
      this.token = ''
      this.role = ''
      this.studentPortalClosed = false
      this.studentPortalClosedMessage = ''
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('studentPortalClosed')
      localStorage.removeItem('studentPortalClosedMessage')
    }
  }
});
