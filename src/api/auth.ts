// src/api/auth.ts
import { apiClient } from './client'
import type { UserRole } from '@/store/authStore'

// ---------------------------------------------------------------------------
// Типы (Types)
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name?: string
}

// Измените этот интерфейс в зависимости от реального ответа бэкенда
export interface LoginResponse {
  access_token?: string
  token?: string
}

// ---------------------------------------------------------------------------
// Сервис аутентификации (Auth API)
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * Отправляет запрос на логин пользователя.
   * Ожидает, что бэкенд принимает JSON-формат (по умолчанию).
   * 
   * @param credentials данные для входа (email, password)
   */
  async login(credentials: LoginPayload): Promise<LoginResponse> {
    // Делаем HTTP-запрос по точному пути /auth/login без префиксов
    const { data } = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return data
  },

  /**
   * Отправляет запрос на регистрацию нового пользователя.
   * 
   * @param data данные для регистрации
   */
  async register(data: RegisterPayload): Promise<any> {
    // Делаем HTTP-запрос по точному пути /auth/register без префиксов
    const response = await apiClient.post('/auth/register', data)
    return response.data
  }
}
