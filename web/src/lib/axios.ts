import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse } from '../types/api';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const baseURL = (import.meta.env.VITE_API_BASE_URL as string) || '';

const api = axios.create({
  baseURL,
});

function clearAuthAndRedirect(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('mediaToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth:cleared'));

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (!axios.isAxiosError(err) || !err.config || err.response?.status !== 401) {
      return Promise.reject(err);
    }

    const originalRequest = err.config as RetriableRequestConfig;
    const requestUrl = originalRequest.url ?? '';
    const isAuthRequest =
      requestUrl.includes('/api/v1/auth/login') ||
      requestUrl.includes('/api/v1/auth/refresh');

    if (originalRequest._retry || isAuthRequest) {
      clearAuthAndRedirect();
      return Promise.reject(err);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    try {
      const { data } = await axios.post<AuthResponse>(`${baseURL}/api/v1/auth/refresh`, {
        refreshToken,
      });

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth:updated'));

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
