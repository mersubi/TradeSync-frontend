// src/store/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { LoginResponse } from '@/api/auth'

// ---------------------------------------------------------------------------
// Типы (Types)
// ---------------------------------------------------------------------------
export type UserRole = 'Operator' | 'Manager' | 'Admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

// ---------------------------------------------------------------------------
// Хранилище (Store)
// ---------------------------------------------------------------------------
export const useAuthStore = defineStore('auth', () => {
  // ── Состояние (State) ──────────────────────────────────────────────────
  
  // Читаем начальные данные из localStorage (ранее было sessionStorage)
  const user = ref<AuthUser | null>(
    JSON.parse(localStorage.getItem('ts_user') ?? 'null'),
  )
  const token = ref<string | null>(localStorage.getItem('ts_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ── Геттеры (Getters) ──────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed<UserRole | null>(() => user.value?.role ?? null)

  function hasRole(roles: UserRole[]): boolean {
    return !!userRole.value && roles.includes(userRole.value)
  }

  // ── Вспомогательные функции (Helpers) ──────────────────────────────────
  function _persist(tokenStr: string, userObj: AuthUser): void {
    user.value = userObj
    token.value = tokenStr
    localStorage.setItem('ts_user', JSON.stringify(userObj))
    localStorage.setItem('ts_token', tokenStr)
  }

  function _clearSession(): void {
    user.value = null
    token.value = null
    localStorage.removeItem('ts_user')
    localStorage.removeItem('ts_token')
  }

  // ── Действия (Actions) ─────────────────────────────────────────────────

  /**
   * Функция логина.
   * Вызывает реальный метод API, извлекает токен и хардкодит данные пользователя,
   * пока на бэкенде не появится эндпоинт /me.
   */
  async function login(email: string, password: string): Promise<AuthUser> {
    isLoading.value = true
    error.value = null

    try {
      // Отправляем реальный запрос
      const response = await authApi.login({ email, password })
      
      // Извлекаем токен (бэкенд может вернуть token или access_token)
      const tokenStr = response.token || response.access_token
      if (!tokenStr) {
        throw new Error('Токен не был получен от сервера')
      }

      // Временно хардкодим пользователя (с ролью Admin, чтобы работали маршруты)
      // В будущем здесь будет запрос к authApi.getMe() или извлечение из JWT
      const mockUser: AuthUser = {
        id: 'real-backend-mock-id',
        name: 'John Doe',
        email: email,
        role: 'Admin' 
      }

      // Сохраняем состояние
      _persist(tokenStr, mockUser)
      return mockUser
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || err?.message || 'Произошла непредвиденная ошибка.'
      error.value = message
      throw err 
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    _clearSession()
    error.value = null
  }

  /** Вызывается при перехвате 401 ошибки в Axios */
  function forceLogout(): void {
    _clearSession()
    error.value = 'Срок действия вашей сессии истек. Пожалуйста, войдите снова.'
  }

  return {
    // state
    user,
    token,
    isLoading,
    error,
    // getters
    isAuthenticated,
    userRole,
    hasRole,
    // actions
    login,
    logout,
    forceLogout,
  }
})
