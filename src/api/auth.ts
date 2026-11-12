// src/api/auth.ts
import { apiClient } from './client'
import type { UserRole } from '@/store/authStore'

// ---------------------------------------------------------------------------
// Типы данных авторизации (соответствуют схемам FastAPI Server: src/server/schemas/user.py)
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  email: string
  role: UserRole
}

// ---------------------------------------------------------------------------
// Сервис аутентификации (Auth API)
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * Авторизация по JSON-телу { email, password } -> POST /auth/login
   */
  async login(credentials: LoginPayload): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', credentials)
    return data
  },

  /**
   * Регистрация нового пользователя -> POST /auth/register
   */
  async register(payload: RegisterPayload): Promise<UserResponse> {
    const { data } = await apiClient.post<UserResponse>('/auth/register', payload)
    return data
  },
}
