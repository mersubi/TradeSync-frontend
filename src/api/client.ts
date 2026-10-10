// src/api/client.ts
import axios from 'axios'
import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

// ---------------------------------------------------------------------------
// Создание экземпляра Axios
// ---------------------------------------------------------------------------
export const apiClient = axios.create({
  baseURL: '', // Убрали import.meta.env...
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})


// ---------------------------------------------------------------------------
// Интерцептор запросов (Request interceptor)
// Автоматически добавляет JWT токен из localStorage в заголовок Authorization
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Извлекаем токен из localStorage
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
    if (error.response?.status === 401) {
      // При ошибке авторизации очищаем данные
      localStorage.removeItem('ts_token')
      localStorage.removeItem('ts_user')
      sessionStorage.removeItem('ts_token')
      sessionStorage.removeItem('ts_user')

      // Уведомляем приложение о необходимости редиректа на страницу логина
      window.dispatchEvent(new CustomEvent('tradesync:unauthorized'))
    }
    return Promise.reject(error)
  },
)
