import axios from 'axios';
import router from '../router';

const api = axios.create({ baseURL: '/api' });

export function getStudentPortalClosedDetail(error) {
  const detail = error?.response?.data?.detail;
  if (error?.response?.status === 403 && detail?.code === 'STUDENT_PORTAL_CLOSED') {
    return detail;
  }
  return null;
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(res => res, err => {
  const closedDetail = getStudentPortalClosedDetail(err);
  if (closedDetail) {
    localStorage.setItem('studentPortalClosed', 'true');
    localStorage.setItem('studentPortalClosedMessage', closedDetail.message || '');
    if (router.currentRoute.value.path !== '/course-closed') {
      router.push('/course-closed');
    }
  }
  if (err.response && err.response.status === 401) {
    const role = localStorage.getItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    router.push(role === 'instructor' ? '/admin/login' : '/login');
  }
  return Promise.reject(err);
});
export default api;
