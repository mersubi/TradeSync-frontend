<!-- src/views/DashboardView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { procurementApi } from '@/api/procurement'
import type { ProcurementSessionResponse, SupplierResponse } from '@/api/procurement'
import {
  UploadCloud,
  CheckCircle,
  Table,
  ArrowRight,
  Package,
  Clock,
  Building2,
} from '@lucide/vue'

const auth   = useAuthStore()
const router = useRouter()

const sessions = ref<ProcurementSessionResponse[]>([])
const suppliers = ref<SupplierResponse[]>([])
const isLoading = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    const [sessList, supList] = await Promise.all([
      procurementApi.listSessions(0, 50),
      procurementApi.listSuppliers(),
    ])
    sessions.value = sessList
    suppliers.value = supList
  } catch {
    // Если сервер еще не запущен, показываем нулевые/дефолтные значения
  } finally {
    isLoading.value = false
  }
})

// ── Приветствие ───────────────────────────────────────────────────────────────
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
})

// ── Карточки быстрых действий ─────────────────────────────────────────────────
const visibleCards = [
  {
    id: 'upload',
    label: 'Загрузить прайс-лист',
    description: 'Импортируйте прайс-листы поставщиков (.xlsx / .csv) и запустите ML-сопоставление.',
    to: '/upload',
    icon: UploadCloud,
    accentColor: 'emerald',
  },
  {
    id: 'validation',
    label: 'Очередь валидации и ML',
    description: 'Проверяйте результаты работы Bi-Encoder + pgvector, корректируйте и утверждайте сессии.',
    to: '/validation',
    icon: CheckCircle,
    accentColor: 'amber',
  },
  {
    id: 'matrix',
    label: 'Матрица цен и SplitOptimizer',
    description: 'Сравнивайте предложения поставщиков, запускайте MILP-оптимизацию и выгружайте в 1С.',
    to: '/matrix',
    icon: Table,
    accentColor: 'purple',
  },
]

// ── Живая статистика из бэкенда ───────────────────────────────────────────────
const stats = computed(() => {
  const totalSessions = sessions.value.length
  const needValidation = sessions.value.filter(
    (s) => s.status === 'PENDING' || s.status === 'PROCESSING' || s.status === 'COMPLETED',
  ).length
  const approvedCount = sessions.value.filter((s) => s.status === 'APPROVED').length

  return [
    {
      label: 'Закупочных сессий',
      value: String(totalSessions),
      icon: Package,
      delta: `${approvedCount} утверждено (APPROVED)`,
    },
    {
      label: 'Ожидают валидации / в работе',
      value: String(needValidation),
      icon: Clock,
      delta: 'Готовы к проверке закупщиком',
    },
    {
      label: 'Поставщиков в базе',
      value: String(suppliers.value.length),
      icon: Building2,
      delta: 'Активные контрагенты',
    },
  ]
})

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Заголовок страницы -->
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
          Управляйте закупочными сессиями, проверяйте ML-сопоставление шин и оптимизируйте распределение заказов между поставщиками.
        </p>
      </div>

      <!-- Бейдж роли и email пользователя -->
      <div class="flex items-center gap-2 shrink-0">
        <span class="text-xs text-slate-500 font-mono hidden sm:inline">{{ auth.user?.email }}</span>
        <span
          class="px-2.5 py-1 rounded-full text-xs font-semibold border"
          :class="{
            'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':
              auth.user?.role === 'Buyer' || auth.user?.role === 'Operator',
            'bg-amber-500/15 text-amber-400 border-amber-500/30': auth.user?.role === 'Manager',
            'bg-purple-500/15 text-purple-400 border-purple-500/30': auth.user?.role === 'Admin',
          }"
        >
          {{ auth.user?.role }}
        </span>
      </div>
    </div>

    <!-- Статистические плашки -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex items-center gap-4 px-5 py-4 rounded-xl
               bg-white/4 border border-white/8
               hover:bg-white/6 hover:border-white/12
               transition-all duration-200"
      >
        <div class="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
          <component :is="stat.icon" class="w-5 h-5 text-blue-400" :stroke-width="1.75" />
        </div>
        <div class="min-w-0">
          <p class="text-xl font-bold text-white leading-none">{{ stat.value }}</p>
          <p class="text-slate-400 text-xs mt-1 truncate">{{ stat.label }}</p>
          <p class="text-slate-600 text-xs mt-0.5">{{ stat.delta }}</p>
        </div>
      </div>
    </div>

    <!-- Быстрые действия -->
    <div>
      <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
        Быстрые действия
      </h2>

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
                 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
        >
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

          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors duration-150">
              {{ card.label }}
            </h3>
            <p class="text-slate-400 text-sm leading-relaxed">
              {{ card.description }}
            </p>
          </div>

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
  </div>
</template>
