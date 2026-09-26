// src/store/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginService } from '@/api/auth'
import type { LoginResponse } from '@/api/auth'

// ---------------------------------------------------------------------------
// Types (re-exported so router and components can import from one place)
// ---------------------------------------------------------------------------
export type UserRole = 'Operator' | 'Manager' | 'Admin'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useAuthStore = defineStore('auth', () => {
  // ── State ────────────────────────────────────────────────────────────────
  const user = ref<AuthUser | null>(
    JSON.parse(sessionStorage.getItem('ts_user') ?? 'null'),
  )
  const token = ref<string | null>(sessionStorage.getItem('ts_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ── Getters ──────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed<UserRole | null>(() => user.value?.role ?? null)

  function hasRole(roles: UserRole[]): boolean {
    return !!userRole.value && roles.includes(userRole.value)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _persist(response: LoginResponse): void {
    user.value = response.user
    token.value = response.token
    sessionStorage.setItem('ts_user', JSON.stringify(response.user))
    sessionStorage.setItem('ts_token', response.token)
  }

  function _clearSession(): void {
    user.value = null
    token.value = null
    sessionStorage.removeItem('ts_user')
    sessionStorage.removeItem('ts_token')
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Authenticate via the API service layer.
   * Sets `isLoading` + `error` for UI feedback.
   * Resolves with the authenticated user or rejects (and sets `error`) on failure.
   */
  async function login(email: string, password: string): Promise<AuthUser> {
    isLoading.value = true
    error.value = null

    try {
      const response = await loginService(email, password)
      _persist(response)
      return response.user
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      error.value = message
      throw err // re-throw so the component can react (e.g. shake animation)
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    _clearSession()
    error.value = null
  }

  /** Called by the Axios 401 interceptor to silently clear the session. */
  function forceLogout(): void {
    _clearSession()
    error.value = 'Your session has expired. Please log in again.'
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
