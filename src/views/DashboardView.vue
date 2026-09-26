<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { UploadCloud, CheckCircle, Table, ArrowRight, TrendingUp, Package, Clock } from '@lucide/vue'

// ── Зависимости ───────────────────────────────────────────────────────────────
const auth   = useAuthStore()
const router = useRouter()

// ── Время суток для персонализированного приветствия ──────────────────────────
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
})

// ── Определение карточек быстрых действий ────────────────────────────────────
// Карточки отображаются в соответствии с ролью пользователя (RBAC)
const allActionCards = computed(() => [
  {
    id: 'upload',
    label: 'Загрузить прайс-лист',
    description: 'Импортируйте новые данные о ценах от поставщиков в систему.',
    to: '/upload',
    icon: UploadCloud,
    accentColor: 'emerald',
    // Только для роли Operator — соответствует правилу маршрутизации /upload
    onlyForRoles: ['Operator'] as string[],
  },
  {
    id: 'validation',
    label: 'Очередь валидации',
    description: 'Просматривайте и подтверждайте данные, ожидающие проверки.',
    to: '/validation',
    icon: CheckCircle,
    accentColor: 'amber',
    onlyForRoles: null, // Доступно всем ролям
  },
  {
    id: 'matrix',
    label: 'Матрица цен',
    description: 'Анализируйте и сравнивайте цены поставщиков по категориям.',
    to: '/matrix',
    icon: Table,
    accentColor: 'purple',
    onlyForRoles: null,
  },
])

// Фильтрация карточек по роли текущего пользователя
const visibleCards = computed(() =>
  allActionCards.value.filter(
    (card) =>
      !card.onlyForRoles ||
      (auth.user && card.onlyForRoles.includes(auth.user.role)),
  ),
)

// ── Статистические плашки (моковые данные) ────────────────────────────────────
const stats = [
  { label: 'Активных прайс-листов', value: '24', icon: Package, delta: '+3 за неделю' },
  { label: 'На валидации',          value: '7',  icon: Clock,    delta: '2 срочных'    },
  { label: 'Рост цен (30 дн.)',     value: '↑ 4.2%', icon: TrendingUp, delta: 'vs прошлый месяц' },
]

// ── Программная навигация к выбранному разделу ────────────────────────────────
function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">

    <!-- ── Заголовок страницы ───────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p class="text-slate-500 text-sm font-medium mb-1">
          {{ greeting }},
          <span class="text-blue-400">{{ auth.user?.name }}</span>
        </p>
        <h1 class="text-2xl font-bold text-white tracking-tight">
          Добро пожаловать в TradeSync
        </h1>
        <p class="text-slate-400 text-sm mt-1.5 max-w-lg">
          Управляйте закупками, проверяйте данные поставщиков и анализируйте ценовую матрицу в едином пространстве.
        </p>
      </div>

      <!-- Бейдж роли и email пользователя -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs text-slate-500 font-mono hidden sm:inline">{{ auth.user?.email }}</span>
        <span
          class="px-2.5 py-1 rounded-full text-xs font-semibold border"
          :class="{
            'bg-emerald-500/15 text-emerald-400 border-emerald-500/30': auth.user?.role === 'Operator',
            'bg-amber-500/15 text-amber-400 border-amber-500/30':       auth.user?.role === 'Manager',
            'bg-purple-500/15 text-purple-400 border-purple-500/30':    auth.user?.role === 'Admin',
          }"
        >
          {{ auth.user?.role }}
        </span>
      </div>
    </div>

    <!-- ── Статистические плашки ────────────────────────────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex items-center gap-4 px-5 py-4 rounded-xl
               bg-white/4 border border-white/8
               hover:bg-white/6 hover:border-white/12
               transition-all duration-200"
      >
        <!-- Иконка -->
        <div class="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
          <component :is="stat.icon" class="w-5 h-5 text-blue-400" :stroke-width="1.75" />
        </div>
        <!-- Данные -->
        <div class="min-w-0">
          <p class="text-xl font-bold text-white leading-none">{{ stat.value }}</p>
          <p class="text-slate-400 text-xs mt-1 truncate">{{ stat.label }}</p>
          <p class="text-slate-600 text-xs mt-0.5">{{ stat.delta }}</p>
        </div>
      </div>
    </div>

    <!-- ── Разделитель ──────────────────────────────────────────────────────── -->
    <div>
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
        Быстрые действия
      </h2>

      <!-- ── Сетка карточек быстрых действий ─────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          v-for="card in visibleCards"
          :key="card.id"
          type="button"
          @click="navigateTo(card.to)"
          class="group relative flex flex-col items-start gap-4 p-6 rounded-2xl text-left
                 bg-white/4 border border-white/8
                 hover:bg-white/7 hover:border-white/14 hover:shadow-xl hover:shadow-black/20
                 hover:-translate-y-0.5
                 transition-all duration-200 ease-out
                 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <!-- Иконка с цветовым акцентом -->
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
            :class="{
              'bg-emerald-500/15': card.accentColor === 'emerald',
              'bg-amber-500/15':   card.accentColor === 'amber',
              'bg-purple-500/15':  card.accentColor === 'purple',
            }"
          >
            <component
              :is="card.icon"
              class="w-5.5 h-5.5"
              :class="{
                'text-emerald-400': card.accentColor === 'emerald',
                'text-amber-400':   card.accentColor === 'amber',
                'text-purple-400':  card.accentColor === 'purple',
              }"
              :stroke-width="1.75"
            />
          </div>

          <!-- Текстовый блок -->
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors duration-150">
              {{ card.label }}
            </h3>
            <p class="text-slate-400 text-sm leading-relaxed">
              {{ card.description }}
            </p>
          </div>

          <!-- Стрелка — появляется при наведении ───────────────────────────── -->
          <div
            class="absolute bottom-5 right-5 w-7 h-7 rounded-full flex items-center justify-center
                   bg-white/0 group-hover:bg-white/8
                   transition-all duration-200"
          >
            <ArrowRight
              class="w-4 h-4 text-slate-600 group-hover:text-slate-300 translate-x-0 group-hover:translate-x-0.5 transition-all duration-200"
              :stroke-width="2"
            />
          </div>
        </button>
      </div>
    </div>

    <!-- ── Подсказка для роли Admin / Manager (не-Operator) ─────────────────── -->
    <p
      v-if="auth.user?.role !== 'Operator'"
      class="text-slate-600 text-xs text-center pt-2"
    >
      Раздел «Загрузка данных» доступен только пользователям с ролью
      <span class="text-emerald-600 font-medium">Operator</span>.
    </p>

  </div>
</template>
