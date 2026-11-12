<!-- src/views/ValidationView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { procurementApi } from '@/api/procurement'
import type { ProcurementSessionResponse, TaskStatusEnum } from '@/api/procurement'
import MLProgressBar from '@/components/MLProgressBar.vue'
import MatchingTable from '@/components/MatchingTable.vue'
import {
  ListFilter,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
} from '@lucide/vue'

const router = useRouter()
const route  = useRoute()

const sessions = ref<ProcurementSessionResponse[]>([])
const selectedSession = ref<ProcurementSessionResponse | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

// ── Конфигурация отображения статусов бэкенда ────────────────────────────────
interface StatusConfig {
  label: string
  badgeClass: string
  icon: any
  iconClass: string
  isSpinning?: boolean
}

const statusConfigs: Record<TaskStatusEnum, StatusConfig> = {
  PENDING: {
    label: 'В очереди (PENDING)',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Clock,
    iconClass: 'text-amber-400',
  },
  PROCESSING: {
    label: 'ML-обработка',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Loader2,
    iconClass: 'text-blue-400',
    isSpinning: true,
  },
  COMPLETED: {
    label: 'Сопоставлено (COMPLETED)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
  },
  APPROVED: {
    label: 'Утверждено (APPROVED)',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    icon: ShieldCheck,
    iconClass: 'text-purple-400',
  },
  FAILED: {
    label: 'Ошибка (FAILED)',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: AlertCircle,
    iconClass: 'text-red-400',
  },
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

// ── Загрузка списка закупочных сессий с бэкенда ───────────────────────────────
async function fetchSessions() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const list = await procurementApi.listSessions(0, 50)
    sessions.value = list

    // Если в query передан session_id, выбираем его автоматически
    const querySessionId = Number(route.query.session_id)
    if (querySessionId) {
      const found = list.find((s) => s.id === querySessionId)
      if (found) {
        selectedSession.value = found
        return
      }
    }

    if (selectedSession.value) {
      const updated = list.find((s) => s.id === selectedSession.value?.id)
      if (updated) selectedSession.value = updated
    } else if (list.length > 0) {
      selectedSession.value = list[0]
    }
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail || 'Не удалось загрузить список сессий с бэкенда'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchSessions()
})

function selectSessionForValidation(session: ProcurementSessionResponse) {
  selectedSession.value = session
}

function navigateToUpload() {
  router.push('/upload')
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Заголовок страницы -->
    <div class="border-b border-white/8 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <ListFilter class="w-5 h-5 text-amber-400" :stroke-width="1.75" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Очередь валидации и ML</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Контроль автоматического сопоставления прайс-листов, ручная корректировка и утверждение сессий
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-sm transition-all cursor-pointer"
          @click="fetchSessions"
          :disabled="isLoading"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          <span>Обновить</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 cursor-pointer"
          @click="navigateToUpload"
        >
          <UploadCloud class="w-4 h-4" :stroke-width="2" />
          <span>Загрузить прайс-лист</span>
        </button>
      </div>
    </div>

    <!-- Таблица сессий с бэкенда -->
    <div v-if="sessions.length > 0" class="bg-slate-900/60 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-white/8 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th scope="col" class="py-3.5 px-6">ID Сессии</th>
              <th scope="col" class="py-3.5 px-6">Название сессии</th>
              <th scope="col" class="py-3.5 px-6">Сопоставлено / Всего</th>
              <th scope="col" class="py-3.5 px-6">Дата создания</th>
              <th scope="col" class="py-3.5 px-6">Статус</th>
              <th scope="col" class="py-3.5 px-6 text-right">Действие</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-sm">
            <tr
              v-for="sess in sessions"
              :key="sess.id"
              class="hover:bg-white/[0.03] transition-colors cursor-pointer"
              :class="{ 'bg-blue-500/10': selectedSession?.id === sess.id }"
              @click="selectSessionForValidation(sess)"
            >
              <td class="py-4 px-6 font-mono text-xs text-slate-400 whitespace-nowrap">
                #{{ sess.id }}
              </td>

              <td class="py-4 px-6 font-medium text-white">
                <div class="flex items-center gap-2">
                  <FileSpreadsheet class="w-4 h-4 text-slate-400 shrink-0" :stroke-width="1.75" />
                  <span class="truncate max-w-sm" :title="sess.title">{{ sess.title }}</span>
                </div>
              </td>

              <td class="py-4 px-6 text-slate-300 font-mono text-xs whitespace-nowrap">
                {{ sess.matched_items }} / {{ sess.total_items }} поз.
              </td>

              <td class="py-4 px-6 text-slate-400 whitespace-nowrap text-xs">
                {{ formatDate(sess.created_at) }}
              </td>

              <td class="py-4 px-6 whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  :class="statusConfigs[sess.status]?.badgeClass"
                >
                  <component
                    :is="statusConfigs[sess.status]?.icon || Clock"
                    class="w-3.5 h-3.5 shrink-0"
                    :class="[
                      statusConfigs[sess.status]?.iconClass,
                      { 'animate-spin': statusConfigs[sess.status]?.isSpinning },
                    ]"
                    :stroke-width="2"
                  />
                  <span>{{ statusConfigs[sess.status]?.label || sess.status }}</span>
                </span>
              </td>

              <td class="py-4 px-6 text-right whitespace-nowrap">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer"
                  @click.stop="selectSessionForValidation(sess)"
                >
                  <Eye class="w-3.5 h-3.5 text-blue-400" :stroke-width="1.75" />
                  <span>Открыть таблицу</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Прогресс-бар WebSocket для выбранной сессии -->
    <MLProgressBar
      :session-id="selectedSession?.id ?? null"
      @completed="fetchSessions"
    />

    <!-- Таблица сопоставления Traffic Light + Active Learning -->
    <MatchingTable
      :session-id="selectedSession?.id ?? null"
      :session-status="selectedSession?.status"
      @updated="fetchSessions"
      @approved="fetchSessions"
    />
  </div>
</template>
