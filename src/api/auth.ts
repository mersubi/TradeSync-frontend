// src/api/auth.ts
import type { UserRole } from '@/store/authStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  user: {
    id: string
    name: string
    email: string
    role: UserRole
  }
  /** Signed JWT – replace with the real token from the backend. */
  token: string
}

// ---------------------------------------------------------------------------
// Mock user database – mirrors authStore for now; remove once backend is live
// ---------------------------------------------------------------------------
type MockRecord = { password: string } & LoginResponse

const MOCK_DB: Record<string, MockRecord> = {
  'operator@tradesync.io': {
    password: 'password',
    token: 'eyJhbGciOiJIUzI1NiJ9.mock_operator',
    user: { id: '1', name: 'Alice Operator', email: 'operator@tradesync.io', role: 'Operator' },
  },
  'manager@tradesync.io': {
    password: 'password',
    token: 'eyJhbGciOiJIUzI1NiJ9.mock_manager',
    user: { id: '2', name: 'Bob Manager', email: 'manager@tradesync.io', role: 'Manager' },
  },
  'admin@tradesync.io': {
    password: 'password',
    token: 'eyJhbGciOiJIUzI1NiJ9.mock_admin',
    user: { id: '3', name: 'Carol Admin', email: 'admin@tradesync.io', role: 'Admin' },
  },
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Authenticate a user with email + password.
 *
 * **Mock behaviour**: resolves after 600 ms to simulate network latency.
 * When the real backend is ready, replace the body with:
 * ```ts
 * const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
 * return data
 * ```
 */
export async function loginService(
  email: string,
  password: string,
): Promise<LoginResponse> {
  // Simulate network latency
  await new Promise<void>((resolve) => setTimeout(resolve, 600))

  const record = MOCK_DB[email.trim().toLowerCase()]

  if (!record || record.password !== password) {
    // Mirror the shape of an Axios error so callers don't need branching logic
    const err = new Error('Invalid email or password. Please try again.')
    ;(err as Error & { status: number }).status = 401
    throw err
  }

  const { password: _pw, ...response } = record
  return response
}
