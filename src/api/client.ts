// src/api/client.ts
import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// ---------------------------------------------------------------------------
// Request interceptor – attach JWT from sessionStorage
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('ts_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor – handle 401 Unauthorized
//
// We dispatch a custom DOM event instead of importing the router directly.
// This breaks any potential circular dependency:
//   router → authStore → apiClient → router  ✗
//   apiClient → CustomEvent → main.ts listener → router  ✓
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear persisted session data
      sessionStorage.removeItem('ts_token')
      sessionStorage.removeItem('ts_user')

      // Notify the app layer; main.ts (or App.vue) should listen and redirect
      window.dispatchEvent(new CustomEvent('tradesync:unauthorized'))
    }
    return Promise.reject(error)
  },
)
