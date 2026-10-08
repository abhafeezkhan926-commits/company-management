import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const api = axios.create({ baseURL });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('cms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.message || (error.code === 'ERR_NETWORK' ? 'Backend server is not reachable.' : 'Request failed.');
  return 'Something went wrong.';
}
