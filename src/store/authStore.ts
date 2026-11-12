// src/store/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

// ---------------------------------------------------------------------------
// Типы ролей (включая роли бэкенда Server: 'Buyer' и 'Admin', а также фронтовые алиасы)
// ---------------------------------------------------------------------------
export type UserRole = 'Buyer' | 'Admin' | 'Operator' | 'Manager'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

/**
 * Декодирует payload JWT-токена бэкенда FastAPI ({ sub: "1", role: "Admin" | "Buyer", exp: ... })
 */
function decodeJwtPayload(tokenStr: string): { sub?: string; role?: UserRole } {
  try {
    const parts = tokenStr.split('.')
    if (parts.length < 2) return {}
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(jsonPayload)
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Хранилище (Store)
// ---------------------------------------------------------------------------
export const useAuthStore = defineStore('auth', () => {
  // ── Состояние (State) ──────────────────────────────────────────────────
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
    if (!userRole.value) return false
    // Admin имеет доступ ко всем разделам; Buyer эквивалентен Operator/Manager
    if (userRole.value === 'Admin') return true
    if (userRole.value === 'Buyer' && (roles.includes('Buyer') || roles.includes('Operator'))) {
      return true
    }
    return roles.includes(userRole.value)
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
    sessionStorage.removeItem('ts_user')
    sessionStorage.removeItem('ts_token')
  }

  // ── Действия (Actions) ─────────────────────────────────────────────────

  /**
   * Авторизация через бэкенд POST /auth/login.
   * Извлекает id пользователя и роль напрямую из JWT-токена бэкенда.
   */
  async function login(email: string, password: string): Promise<AuthUser> {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.login({ email, password })
      const tokenStr = response.access_token
      if (!tokenStr) {
        throw new Error('Токен не был получен от сервера')
      }

      const payload = decodeJwtPayload(tokenStr)
      const role: UserRole = payload.role || 'Buyer'
      const displayName = email.split('@')[0] || 'Пользователь'

      const authUser: AuthUser = {
        id: payload.sub || '1',
        name: displayName,
        email,
        role,
      }

      _persist(tokenStr, authUser)
      return authUser
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || err?.message || 'Ошибка соединения с сервером.'
      error.value = typeof message === 'string' ? message : JSON.stringify(message)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Регистрация нового пользователя через POST /auth/register с последующим автоматическим входом.
   */
  async function register(email: string, password: string): Promise<AuthUser> {
    isLoading.value = true
    error.value = null

    try {
      await authApi.register({ email, password })
      return await login(email, password)
    } catch (err: any) {
      const message =
        err?.response?.data?.detail || err?.message || 'Ошибка при регистрации пользователя.'
      error.value = typeof message === 'string' ? message : JSON.stringify(message)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    _clearSession()
    error.value = null
  }

  function forceLogout(): void {
    _clearSession()
    error.value = 'Срок действия вашей сессии истек. Пожалуйста, войдите снова.'
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    userRole,
    hasRole,
    login,
    register,
    logout,
    forceLogout,
  }
})
