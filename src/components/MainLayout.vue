<!-- src/components/MainLayout.vue
     Каркас приложения для авторизованного пользователя:
     тёмный сайдбар с навигацией по шагам процесса + светлая шапка + контент.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  UploadCloud,
  ShieldCheck,
  Table2,
  LogOut,
  ArrowLeftRight,
} from '@lucide/vue'

// ── Зависимости ───────────────────────────────────────────────────────────────
const auth   = useAuthStore()
const router = useRouter()

// ── Пункты меню ───────────────────────────────────────────────────────────────
// step — номер шага бизнес-процесса (у дашборда номера нет, это обзорный экран)
const navItems = [
  { label: 'Обзор',            to: '/',           icon: LayoutDashboard, step: null },
  { label: 'Загрузка прайса',  to: '/upload',     icon: UploadCloud,     step: 1 },
  { label: 'ML-валидация',     to: '/validation', icon: ShieldCheck,     step: 2 },
  { label: 'Матрица и сплит',  to: '/matrix',     icon: Table2,          step: 3 },
]

// ── Инициалы для аватара: «Иван Петров» → «ИП» ────────────────────────────────
const initials = computed(() => {
  const name = auth.user?.name ?? '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

// ── Русское название роли для шапки ───────────────────────────────────────────
const roleLabels: Record<string, string> = {
  Admin: 'Администратор',
  Buyer: 'Закупщик',
  Operator: 'Оператор',
  Manager: 'Менеджер',
}
const roleLabel = computed(() => roleLabels[auth.user?.role ?? ''] ?? auth.user?.role)

// ── Выход из системы ──────────────────────────────────────────────────────────
async function handleLogout() {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-zinc-50">
    <!-- ═════════════ САЙДБАР ═════════════ -->
    <aside class="flex flex-col w-64 shrink-0 bg-zinc-950 text-zinc-400">
      <!-- Логотип -->
      <div class="flex items-center gap-3 px-5 h-16 shrink-0">
        <div class="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-400">
          <ArrowLeftRight class="w-4.5 h-4.5 text-zinc-950" :stroke-width="2.5" />
        </div>
        <div class="leading-tight">
          <p class="text-white font-semibold tracking-tight">TradeSync</p>
          <p class="text-xs text-zinc-500">B2B закупки шин</p>
        </div>
      </div>

      <!-- Навигация. RouterLink сам добавляет класс router-link-exact-active
           к активной ссылке; через exact-active-class мы задаём свои стили. -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
          Рабочий процесс
        </p>
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 hover:bg-white/5 hover:text-white transition-colors"
          exact-active-class="!bg-brand-400 !text-zinc-950"
        >
          <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" :stroke-width="1.9" />
          <span class="flex-1">{{ item.label }}</span>
          <!-- Номер шага процесса -->
          <span
            v-if="item.step"
            class="flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-bold
                   bg-white/5 text-zinc-500 group-[.router-link-exact-active]:bg-zinc-950/10
                   group-[.router-link-exact-active]:text-zinc-950"
          >
            {{ item.step }}
          </span>
        </RouterLink>
      </nav>

      <!-- Подсказка о процессе внизу сайдбара -->
      <div class="m-3 p-4 rounded-2xl bg-white/5 ring-1 ring-white/5">
        <p class="text-xs font-semibold text-white">Как это работает</p>
        <p class="mt-1 text-xs leading-relaxed text-zinc-500">
          Загрузите прайс → проверьте сопоставления ML → рассчитайте оптимальный сплит
          и выгрузите заказ в 1С.
        </p>
      </div>
    </aside>

    <!-- ═════════════ ОСНОВНАЯ ОБЛАСТЬ ═════════════ -->
    <div class="flex flex-col flex-1 min-w-0">
      <!-- Шапка -->
      <header class="flex items-center justify-end gap-4 h-16 px-8 shrink-0 bg-zinc-50/80 backdrop-blur border-b border-zinc-200/70">
        <!-- Профиль пользователя -->
        <div class="flex items-center gap-3">
          <div class="text-right leading-tight">
            <p class="text-sm font-medium text-zinc-900">{{ auth.user?.name }}</p>
            <p class="text-xs text-zinc-500">{{ roleLabel }}</p>
          </div>
          <div class="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-900 text-brand-400 text-xs font-bold">
            {{ initials }}
          </div>
        </div>

        <span class="w-px h-6 bg-zinc-200" />

        <button
          id="logout-btn"
          type="button"
          title="Выйти из системы"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-zinc-500
                 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          @click="handleLogout"
        >
          <LogOut class="w-4 h-4" :stroke-width="1.9" />
          Выйти
        </button>
      </header>

      <!-- Контент текущей страницы -->
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-7xl mx-auto px-8 py-8">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
