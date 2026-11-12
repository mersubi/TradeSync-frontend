<!-- src/views/DashboardView.vue
     Обзорный экран: приветствие, ключевые метрики, шаги процесса закупки
     и список последних закупочных сессий.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import { procurementApi } from '@/api/procurement'
import type { ProcurementSessionResponse, SupplierResponse } from '@/api/procurement'
import { sessionStatusMeta, formatShortDate } from '@/utils/sessionStatus'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
  UploadCloud,
  ShieldCheck,
  Table2,
  ArrowRight,
  Package,
  Clock,
  Building2,
  CheckCircle2,
  Inbox,
} from '@lucide/vue'

const auth   = useAuthStore()
const router = useRouter()

// ── Состояние ─────────────────────────────────────────────────────────────────
const sessions  = ref<ProcurementSessionResponse[]>([])
const suppliers = ref<SupplierResponse[]>([])
const isLoading = ref(true)

// ── Загрузка данных при открытии страницы ─────────────────────────────────────
// Promise.all отправляет оба запроса параллельно, а не по очереди
onMounted(async () => {
  try {
    const [sessList, supList] = await Promise.all([
      procurementApi.listSessions(0, 50),
      procurementApi.listSuppliers(),
    ])
    sessions.value  = sessList
    suppliers.value = supList
  } catch {
    // Если сервер не запущен — показываем нули и пустое состояние
  } finally {
    isLoading.value = false
  }
})

// ── Приветствие по времени суток ──────────────────────────────────────────────
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
})

// Имя без фамилии для приветствия: «Иван Петров» → «Иван»
const firstName = computed(() => auth.user?.name?.split(' ')[0] ?? '')

// ── Метрики (пересчитываются автоматически при изменении sessions) ───────────
const stats = computed(() => {
  const inWork   = sessions.value.filter((s) => s.status !== 'APPROVED' && s.status !== 'FAILED').length
  const approved = sessions.value.filter((s) => s.status === 'APPROVED').length
  return [
    { label: 'Всего сессий',        value: sessions.value.length,  icon: Package },
    { label: 'В работе',            value: inWork,                 icon: Clock },
    { label: 'Утверждено',          value: approved,               icon: CheckCircle2 },
    { label: 'Поставщиков в базе',  value: suppliers.value.length, icon: Building2 },
  ]
})

// Последние 5 сессий для таблицы (сортировка по дате — новые сверху)
const recentSessions = computed(() =>
  [...sessions.value]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5),
)

// ── Шаги процесса (карточки быстрых действий) ─────────────────────────────────
const steps = [
  { n: 1, title: 'Загрузите прайс',  text: 'Excel или CSV от поставщика — система сама распознает позиции.',          to: '/upload',     icon: UploadCloud },
  { n: 2, title: 'Проверьте ML',     text: 'Подтвердите сопоставления: зелёные — уверенные, красные — требуют внимания.', to: '/validation', icon: ShieldCheck },
  { n: 3, title: 'Рассчитайте сплит', text: 'Сравните цены и получите оптимальное распределение заказа + экспорт в 1С.', to: '/matrix',     icon: Table2 },
]

// ── Открыть сессию ────────────────────────────────────────────────────────────
// Утверждённые сессии открываем сразу в матрице, остальные — на валидации
function openSession(s: ProcurementSessionResponse) {
  const path = s.status === 'APPROVED' ? '/matrix' : '/validation'
  router.push({ path, query: { session_id: String(s.id) } })
}
</script>

<template>
  <div class="space-y-8">
    <!-- ── Заголовок ───────────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm font-medium text-brand-700">{{ greeting }}, {{ firstName }} 👋</p>
        <h1 class="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">Обзор закупок</h1>
      </div>
      <BaseButton :icon="UploadCloud" @click="router.push('/upload')">Новая закупка</BaseButton>
    </div>

    <!-- ── Метрики ─────────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="p-5 bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft"
      >
        <div class="flex items-center justify-between">
          <p class="text-sm text-zinc-500">{{ stat.label }}</p>
          <component :is="stat.icon" class="w-4 h-4 text-zinc-400" :stroke-width="1.9" />
        </div>
        <!-- Пока данные грузятся, показываем серую «заглушку» (skeleton) -->
        <div v-if="isLoading" class="mt-3 h-8 w-12 rounded-lg bg-zinc-100 animate-pulse" />
        <p v-else class="mt-2 text-3xl font-semibold font-mono tabular-nums text-zinc-900">{{ stat.value }}</p>
      </div>
    </div>

    <!-- ── Шаги процесса ───────────────────────────────────────────────────── -->
    <div>
      <h2 class="mb-4 text-sm font-semibold text-zinc-900">Процесс закупки в три шага</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <button
          v-for="step in steps"
          :key="step.n"
          type="button"
          class="group relative p-6 text-left bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft
                 hover:ring-brand-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          @click="router.push(step.to)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-100 group-hover:bg-brand-400 transition-colors">
              <component :is="step.icon" class="w-5 h-5 text-zinc-700 group-hover:text-zinc-950" :stroke-width="1.9" />
            </div>
            <span class="text-4xl font-semibold font-mono text-zinc-100 group-hover:text-brand-200 transition-colors">
              0{{ step.n }}
            </span>
          </div>
          <h3 class="mt-5 font-semibold text-zinc-900">{{ step.title }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-zinc-500">{{ step.text }}</p>
          <p class="flex items-center gap-1 mt-4 text-sm font-semibold text-brand-700">
            Перейти
            <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </button>
      </div>
    </div>

    <!-- ── Последние сессии ────────────────────────────────────────────────── -->
    <BaseCard title="Последние сессии" subtitle="Нажмите на строку, чтобы продолжить работу" :padded="false">
      <EmptyState
        v-if="!isLoading && recentSessions.length === 0"
        :icon="Inbox"
        title="Сессий пока нет"
        hint="Загрузите первый прайс-лист поставщика — и здесь появится закупочная сессия."
      >
        <BaseButton :icon="UploadCloud" @click="router.push('/upload')">Загрузить прайс</BaseButton>
      </EmptyState>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs font-medium text-zinc-500">
            <th class="px-6 py-3 font-medium">Сессия</th>
            <th class="px-6 py-3 font-medium">Статус</th>
            <th class="px-6 py-3 font-medium text-right">Сопоставлено</th>
            <th class="px-6 py-3 font-medium text-right">Создана</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100">
          <tr
            v-for="s in recentSessions"
            :key="s.id"
            class="hover:bg-zinc-50 cursor-pointer transition-colors"
            @click="openSession(s)"
          >
            <td class="px-6 py-3.5">
              <p class="font-medium text-zinc-900">{{ s.title }}</p>
              <p class="text-xs font-mono text-zinc-400">#{{ s.id }}</p>
            </td>
            <td class="px-6 py-3.5">
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="sessionStatusMeta[s.status]?.cls">
                {{ sessionStatusMeta[s.status]?.label ?? s.status }}
              </span>
            </td>
            <td class="px-6 py-3.5 text-right font-mono tabular-nums text-zinc-700">
              {{ s.matched_items }} / {{ s.total_items }}
            </td>
            <td class="px-6 py-3.5 text-right text-zinc-500">{{ formatShortDate(s.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </BaseCard>
  </div>
</template>
