<!-- src/components/MainLayout.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  UploadCloud,
  CheckCircle,
  Table,
  LogOut,
  User,
} from '@lucide/vue'

// ── Зависимости ───────────────────────────────────────────────────────────────
const auth   = useAuthStore()
const router = useRouter()

// ── Навигационные ссылки (доступны для Buyer и Admin) ─────────────────────────
const visibleNavItems = [
  {
    label: 'Дашборд',
    to: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Загрузка данных',
    to: '/upload',
    icon: UploadCloud,
  },
  {
    label: 'Валидация и ML',
    to: '/validation',
    icon: CheckCircle,
  },
  {
    label: 'Матрица и Сплит',
    to: '/matrix',
    icon: Table,
  },
]

// Цвет бейджа роли
const roleBadgeClass = computed(() => {
  switch (auth.user?.role) {
    case 'Buyer':
    case 'Operator':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    case 'Manager':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    case 'Admin':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  }
})

// ── Выход из системы ──────────────────────────────────────────────────────────
async function handleLogout() {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="flex h-screen bg-slate-950 overflow-hidden">
    <!-- САЙДБАР -->
    <aside
      class="flex flex-col w-64 shrink-0 bg-slate-900 border-r border-white/8
             shadow-[1px_0_0_0_rgb(255_255_255/0.05)]"
    >
      <!-- Логотип -->
      <div class="flex items-center gap-3 px-5 h-16 border-b border-white/8 shrink-0">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-md shadow-blue-600/40">
          <svg class="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M3 12h18M3 17h18"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 3v18M17 3v18" opacity="0.4"/>
          </svg>
        </div>
        <div>
          <span class="text-white font-bold text-sm tracking-tight">TradeSync</span>
          <p class="text-slate-500 text-xs leading-none mt-0.5">B2B закупки шин</p>
        </div>
      </div>

      <!-- Навигационные ссылки -->
      <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.to"
          :to="item.to"
          exact-active-class="nav-link-active"
          class="nav-link group"
        >
          <component
            :is="item.icon"
            class="w-4.5 h-4.5 shrink-0 text-slate-400 group-[.nav-link-active]:text-blue-400
                   transition-colors duration-150"
            :stroke-width="1.75"
          />
          <span class="text-sm font-medium">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Версия приложения -->
      <div class="px-5 py-3 border-t border-white/8 shrink-0">
        <p class="text-slate-600 text-xs">API v1.1.0 · Подключено к Server</p>
      </div>
    </aside>

    <!-- ОСНОВНОЕ СОДЕРЖИМОЕ -->
    <div class="flex flex-col flex-1 min-w-0">
      <header class="flex items-center justify-between h-16 px-6 bg-slate-900/80 backdrop-blur-md border-b border-white/8 shrink-0 z-10">
        <div class="flex items-center gap-2 text-slate-400 text-sm">
          <span>Добро пожаловать,</span>
          <span class="text-white font-medium">{{ auth.user?.name }}</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 text-slate-400">
            <User class="w-4 h-4" :stroke-width="1.75" />
            <span class="text-xs font-mono">{{ auth.user?.email }}</span>
          </div>

          <span
            class="px-2.5 py-1 rounded-full text-xs font-semibold border"
            :class="roleBadgeClass"
          >
            {{ auth.user?.role }}
          </span>

          <button
            id="logout-btn"
            type="button"
            @click="handleLogout"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-slate-400 hover:text-white hover:bg-white/8
                   border border-transparent hover:border-white/10
                   transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <LogOut class="w-4 h-4" :stroke-width="1.75" />
            <span class="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-y-auto p-6 bg-slate-950">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  color: theme('colors.slate.400');
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.nav-link:hover {
  background-color: rgb(255 255 255 / 0.06);
  color: theme('colors.white');
}

.nav-link-active {
  background-color: rgb(59 130 246 / 0.15) !important;
  color: theme('colors.blue.400') !important;
}
</style>
