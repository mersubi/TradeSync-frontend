// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/store/authStore'

// ── Route meta type augmentation ─────────────────────────────────────────────
declare module 'vue-router' {
  interface RouteMeta {
    /** If true, the user must be authenticated to access this route. */
    requiresAuth?: boolean
    /** If set, the user's role must be in this list to access this route. */
    allowedRoles?: UserRole[]
  }
}

// ── Ленивая загрузка представлений (code-splitting по умолчанию) ──────────────
const LoginView      = () => import('@/views/LoginView.vue')
const DashboardView  = () => import('@/views/DashboardView.vue')
const UploadView     = () => import('@/views/UploadView.vue')
const ValidationView = () => import('@/views/ValidationView.vue')
const MatrixView     = () => import('@/views/MatrixView.vue')

// ── Route definitions ─────────────────────────────────────────────────────────
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/upload',
    name: 'Upload',
    component: UploadView,
    meta: { requiresAuth: true, allowedRoles: ['Operator'] },
  },
  {
    path: '/validation',
    name: 'Validation',
    component: ValidationView,
    meta: { requiresAuth: true },
  },
  {
    path: '/matrix',
    name: 'Matrix',
    component: MatrixView,
    meta: { requiresAuth: true },
  },
  // Fallback – redirect unknown paths to dashboard
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

// ── Router instance ───────────────────────────────────────────────────────────
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ── Navigation guard ──────────────────────────────────────────────────────────
router.beforeEach((to, _from) => {
  // Pinia must be used inside functions (not at module scope) to avoid
  // "getActivePinia was called with no active Pinia" errors.
  const auth = useAuthStore()

  const requiresAuth = to.meta.requiresAuth !== false // default: protected
  const allowedRoles = to.meta.allowedRoles

  // 1. Not authenticated → redirect to login
  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // 2. Already logged in → don't show login page again
  if (to.name === 'Login' && auth.isAuthenticated) {
    return { name: 'Dashboard' }
  }

  // 3. Role-based access control
  if (allowedRoles && allowedRoles.length > 0 && !auth.hasRole(allowedRoles)) {
    // Redirect to dashboard with an "unauthorized" flag for the UI to handle
    return { name: 'Dashboard', query: { unauthorized: '1' } }
  }
})

export default router
