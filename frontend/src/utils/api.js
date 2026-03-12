import axios from 'axios';
import router from '../router';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(res => res, err => {
  if (err.response && err.response.status === 401) {
    const role = localStorage.getItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    router.push(role === 'instructor' ? '/admin/login' : '/login');
  }
  return Promise.reject(err);
});
export default api;
