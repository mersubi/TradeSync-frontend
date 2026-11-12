// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import type { UserRole } from '@/store/authStore'

// ── Расширение типов RouteMeta ───────────────────────────────────────────────
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: UserRole[]
  }
}

// ── Ленивая загрузка представлений ────────────────────────────────────────────
const LoginView      = () => import('@/views/LoginView.vue')
const DashboardView  = () => import('@/views/DashboardView.vue')
const UploadView     = () => import('@/views/UploadView.vue')
const ValidationView = () => import('@/views/ValidationView.vue')
const MatrixView     = () => import('@/views/MatrixView.vue')

// ── Маршруты ──────────────────────────────────────────────────────────────────
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
    meta: { requiresAuth: true, allowedRoles: ['Buyer', 'Admin', 'Operator'] },
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
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// ── Навигационный гард ────────────────────────────────────────────────────────
router.beforeEach((to, _from) => {
  const auth = useAuthStore()

  const requiresAuth = to.meta.requiresAuth !== false
  const allowedRoles = to.meta.allowedRoles

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'Login' && auth.isAuthenticated) {
    return { name: 'Dashboard' }
  }

  if (allowedRoles && allowedRoles.length > 0 && !auth.hasRole(allowedRoles)) {
    return { name: 'Dashboard', query: { unauthorized: '1' } }
  }
})

export default router
