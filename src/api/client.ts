// src/api/client.ts
import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

// ---------------------------------------------------------------------------
// Создание экземпляра Axios для работы с бэкендом FastAPI
// ---------------------------------------------------------------------------
// Если в .env случайно остался старый суффикс /api/v1, убираем его,
// так как эндпоинты бэкенда разделены на /auth/* и /api/v1/*
const rawBaseUrl = (import.meta.env.VITE_API_URL || '').trim()
const normalizedBaseUrl = rawBaseUrl.replace(/\/api\/v1\/?$/, '')

export const apiClient = axios.create({
  baseURL: normalizedBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

// ---------------------------------------------------------------------------
// Интерцептор запросов (Request interceptor)
// Автоматически добавляет JWT токен из localStorage в заголовок Authorization
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('ts_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Интерцептор ответов (Response interceptor)
// Обработка ошибки 401 (Не авторизован)
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url || ''
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('ts_token')
      localStorage.removeItem('ts_user')
      sessionStorage.removeItem('ts_token')
      sessionStorage.removeItem('ts_user')

      window.dispatchEvent(new CustomEvent('tradesync:unauthorized'))
    }
    return Promise.reject(error)
  },
)
