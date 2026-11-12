<!-- src/components/MatchingTable.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Send,
  ShieldCheck,
  Download,
  RefreshCw,
} from '@lucide/vue'
import { procurementApi } from '@/api/procurement'
import type { RawOfferItemSchema, CandidateTire } from '@/api/procurement'
import { ExportService } from '@/services/ExportService'

const props = defineProps<{
  sessionId?: number | null
  sessionStatus?: string
}>()

const emit = defineEmits<{
  (e: 'updated'): void
  (e: 'approved'): void
}>()

// Тип для строки таблицы сопоставления
export interface MatchingRow {
  id: number
  originalSupplierItem: string
  price: number
  quantity: number
  selectedTireId: number | null
  initialTireId: number | null
  systemMatchCandidate: string
  initialCandidateName: string
  candidates: Array<{ tireId: number | null; label: string }>
  confidenceScore: number // 0..100
  matchStatus: string
}

// Демо-данные на случай, если сессия еще не выбрана
const defaultMockRows: MatchingRow[] = [
  {
    id: 1,
    originalSupplierItem: 'Шина Michelin X-Ice North 4 205/55 R16',
    price: 8500,
    quantity: 12,
    selectedTireId: 101,
    initialTireId: 101,
    systemMatchCandidate: 'Michelin X-Ice North 4 205/55 R16 94T XL (шипованная)',
    initialCandidateName: 'Michelin X-Ice North 4 205/55 R16 94T XL (шипованная)',
    candidates: [
      { tireId: 101, label: 'Michelin X-Ice North 4 205/55 R16 94T XL (шипованная)' },
      { tireId: 102, label: 'Michelin X-Ice North 4 205/55 R16 91T' },
      { tireId: 103, label: 'Michelin X-Ice 3 205/55 R16' },
    ],
    confidenceScore: 95,
    matchStatus: 'AUTO',
  },
  {
    id: 2,
    originalSupplierItem: 'Nokian Hakkapeliitta 10p 185/65 R15',
    price: 7000,
    quantity: 8,
    selectedTireId: 201,
    initialTireId: 201,
    systemMatchCandidate: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    initialCandidateName: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    candidates: [
      { tireId: 201, label: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15' },
      { tireId: 202, label: 'Nokian Tyres Hakkapeliitta 9 185/65 R15' },
      { tireId: 203, label: 'Nokian Nordman 8 185/65 R15' },
    ],
    confidenceScore: 88,
    matchStatus: 'AUTO',
  },
  {
    id: 3,
    originalSupplierItem: 'Pirelli Ice Zero 2 225/45',
    price: 12000,
    quantity: 4,
    selectedTireId: 301,
    initialTireId: 301,
    systemMatchCandidate: 'Pirelli Ice Zero 2 225/45 R17 94T XL',
    initialCandidateName: 'Pirelli Ice Zero 2 225/45 R17 94T XL',
    candidates: [
      { tireId: 301, label: 'Pirelli Ice Zero 2 225/45 R17 94T XL' },
      { tireId: 302, label: 'Pirelli Ice Zero 2 225/45 R18 95T XL' },
      { tireId: 303, label: 'Pirelli Scorpion Ice Zero 2 225/45 R17' },
    ],
    confidenceScore: 72,
    matchStatus: 'NEEDS_REVIEW',
  },
  {
    id: 4,
    originalSupplierItem: 'Резина Летняя Bridgestone 205/55 R16',
    price: 9000,
    quantity: 10,
    selectedTireId: 401,
    initialTireId: 401,
    systemMatchCandidate: 'Bridgestone Turanza T005 205/55 R16 91V',
    initialCandidateName: 'Bridgestone Turanza T005 205/55 R16 91V',
    candidates: [
      { tireId: 401, label: 'Bridgestone Turanza T005 205/55 R16 91V' },
      { tireId: 402, label: 'Bridgestone Potenza Sport 225/45 R17' },
      { tireId: 403, label: 'Bridgestone Alenza 001 215/60 R17' },
    ],
    confidenceScore: 45,
    matchStatus: 'UNMATCHED',
  },
]

const rows = ref<MatchingRow[]>(JSON.parse(JSON.stringify(defaultMockRows)))
const isLoading = ref(false)
const isSubmitting = ref(false)
const isApproving = ref(false)
const showSuccessAlert = ref(false)
const alertMessage = ref('Исправления отправлены')
const errorMessage = ref<string | null>(null)

// Преобразование позиций бэкенда RawOfferItemSchema в строки таблицы
function mapBackendItemsToRows(items: RawOfferItemSchema[]): MatchingRow[] {
  return items.map((item) => {
    const rawScore = item.confidence_score ?? 0
    // Бэкенд хранит confidence_score в диапазоне 0..1
    const scorePercent = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore)

    const cands: Array<{ tireId: number | null; label: string }> = []
    if (Array.isArray(item.candidates)) {
      for (const c of item.candidates as CandidateTire[]) {
        const tid = c.tire_id ?? c.id ?? null
        const label = c.sku || c.search_text || (tid ? `Шина #${tid}` : 'Кандидат')
        if (!cands.some((existing) => existing.label === label)) {
          cands.push({ tireId: tid, label })
        }
      }
    }

    const matchedLabel =
      item.matched_tire?.sku ||
      cands[0]?.label ||
      (item.matched_tire_id ? `Шина ID #${item.matched_tire_id}` : 'Не сопоставлено')

    const matchedId = item.matched_tire_id ?? cands[0]?.tireId ?? null

    if (matchedLabel && !cands.some((c) => c.label === matchedLabel)) {
      cands.unshift({ tireId: matchedId, label: matchedLabel })
    }

    return {
      id: item.id,
      originalSupplierItem: item.raw_name,
      price: item.price,
      quantity: item.quantity,
      selectedTireId: matchedId,
      initialTireId: matchedId,
      systemMatchCandidate: matchedLabel,
      initialCandidateName: matchedLabel,
      candidates: cands.length > 0 ? cands : [{ tireId: matchedId, label: matchedLabel }],
      confidenceScore: scorePercent,
      matchStatus: item.match_status,
    }
  })
}

// Загрузка реальных данных сессии с бэкенда
async function loadSessionMatches() {
  if (!props.sessionId) {
    rows.value = JSON.parse(JSON.stringify(defaultMockRows))
    return
  }

  isLoading.value = true
  errorMessage.value = null
  try {
    const detail = await procurementApi.getSessionDetails(props.sessionId)
    if (detail.raw_offer_items && detail.raw_offer_items.length > 0) {
      rows.value = mapBackendItemsToRows(detail.raw_offer_items)
    } else {
      rows.value = []
    }
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail || 'Не удалось загрузить позиции сессии с сервера'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (props.sessionId) {
    loadSessionMatches()
  }
})

watch(
  () => props.sessionId,
  () => {
    loadSessionMatches()
  },
)

// Обработка выбора кандидата в выпадающем списке
function onCandidateSelect(row: MatchingRow, newLabel: string) {
  row.systemMatchCandidate = newLabel
  const found = row.candidates.find((c) => c.label === newLabel)
  if (found) {
    row.selectedTireId = found.tireId
  }
}

// Определение уровня уверенности (Traffic Light)
const getScoreStatus = (score: number) => {
  if (score > 85) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

const getRowClass = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high':
      return 'bg-emerald-50/60 hover:bg-emerald-100/60'
    case 'medium':
      return 'bg-amber-50/60 hover:bg-amber-100/60'
    case 'low':
      return 'bg-rose-50/60 hover:bg-rose-100/60'
  }
}

const getBadgeClass = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'low':
      return 'bg-rose-100 text-rose-800 border-rose-200'
  }
}

const getStatusIcon = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high':
      return CheckCircle
    case 'medium':
      return AlertTriangle
    case 'low':
      return XCircle
  }
}

const getIconColorClass = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high':
      return 'text-emerald-500'
    case 'medium':
      return 'text-amber-500'
    case 'low':
      return 'text-rose-500'
  }
}

// Список измененных пользователем позиций
const changedItems = computed(() => {
  return rows.value.filter(
    (r) =>
      r.systemMatchCandidate !== r.initialCandidateName ||
      r.selectedTireId !== r.initialTireId,
  )
})

// Отправка ручных исправлений на бэкенд (PATCH /api/v1/procurement/items/{item_id})
const submitCorrections = async () => {
  if (changedItems.value.length === 0) return

  isSubmitting.value = true
  errorMessage.value = null

  try {
    if (props.sessionId) {
      for (const item of changedItems.value) {
        if (item.selectedTireId) {
          await procurementApi.manualRematchItem(item.id, item.selectedTireId)
        }
      }
      await loadSessionMatches()
      emit('updated')
    } else {
      // Демо-режим
      await new Promise((resolve) => setTimeout(resolve, 600))
      changedItems.value.forEach((item) => {
        item.initialCandidateName = item.systemMatchCandidate
        item.initialTireId = item.selectedTireId
        item.confidenceScore = 100
        item.matchStatus = 'MANUAL'
      })
    }

    alertMessage.value = 'Исправления сохранены в FeedbackAuditLog'
    showSuccessAlert.value = true
    setTimeout(() => {
      showSuccessAlert.value = false
    }, 3000)
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail || 'Ошибка при сохранении ручной привязки на сервере'
  } finally {
    isSubmitting.value = false
  }
}

// Утверждение всей сессии (POST /api/v1/procurement/{session_id}/approve)
const handleApproveSession = async () => {
  if (!props.sessionId) return
  isApproving.value = true
  errorMessage.value = null
  try {
    await procurementApi.approveSession(props.sessionId, true)
    alertMessage.value = 'Сессия успешно утверждена (APPROVED)!'
    showSuccessAlert.value = true
    emit('approved')
    setTimeout(() => {
      showSuccessAlert.value = false
    }, 3000)
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail || 'Не удалось утвердить сессию на сервере'
  } finally {
    isApproving.value = false
  }
}

// Выгрузка сопоставленной таблицы с бэкенда (/matched-table)
const handleDownloadMatched = async (format: 'csv' | 'xlsx') => {
  if (!props.sessionId) {
    ExportService.exportToExcel(rows.value, 'matched_table')
    return
  }
  try {
    const blob = await procurementApi.downloadMatchedTable(props.sessionId, format)
    ExportService.downloadBlob(blob, `matched_session_${props.sessionId}.${format}`)
  } catch (err: any) {
    errorMessage.value = 'Ошибка при скачивании таблицы сопоставления'
  }
}
</script>

<template>
  <div class="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
    <!-- Заголовок таблицы -->
    <div class="p-6 border-b border-gray-200 bg-gray-50/50">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">
            Результаты сопоставления ML (Traffic Light)
            <span v-if="sessionId" class="text-sm font-mono text-indigo-600 ml-2">
              #{{ sessionId }}
            </span>
          </h2>
          <p class="mt-1 text-sm text-gray-500">
            Оценка уверенности алгоритма:
            <span class="text-emerald-600 font-medium">&gt;85% (Высокая)</span>,
            <span class="text-amber-600 font-medium">60-85% (Средняя)</span>,
            <span class="text-rose-600 font-medium">&lt;60% (Низкая)</span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Оповещение об успешной отправке -->
          <span
            v-if="showSuccessAlert"
            class="text-xs font-medium text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
          >
            <CheckCircle class="w-4 h-4" /> {{ alertMessage }}
          </span>

          <!-- Кнопка обновления с сервера -->
          <button
            v-if="sessionId"
            type="button"
            @click="loadSessionMatches"
            :disabled="isLoading"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            title="Обновить данные с сервера"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
            Обновить
          </button>

          <!-- Скачать XLSX / CSV с бэкенда -->
          <button
            v-if="sessionId"
            type="button"
            @click="handleDownloadMatched('xlsx')"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Download class="w-3.5 h-3.5" />
            XLSX для CRM
          </button>

          <!-- Кнопка отправки исправлений Active Learning -->
          <button
            type="button"
            @click="submitCorrections"
            :disabled="changedItems.length === 0 || isSubmitting"
            class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 cursor-pointer"
          >
            <Send class="w-3.5 h-3.5" />
            Отправить исправления (Active Learning)
            {{ changedItems.length > 0 ? `(${changedItems.length})` : '' }}
          </button>

          <!-- Кнопка утверждения сессии на бэкенде -->
          <button
            v-if="sessionId && sessionStatus !== 'APPROVED'"
            type="button"
            @click="handleApproveSession"
            :disabled="isApproving"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck class="w-4 h-4" />
            {{ isApproving ? 'Утверждение...' : 'Утвердить сессию' }}
          </button>
        </div>
      </div>

      <!-- Сообщение об ошибке -->
      <div
        v-if="errorMessage"
        class="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs"
      >
        {{ errorMessage }}
      </div>
    </div>

    <!-- Таблица -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-600">
            <th class="py-3 px-6 w-12 text-center">Статус</th>
            <th class="py-3 px-6">Товар поставщика (Оригинал)</th>
            <th class="py-3 px-6 text-right w-28">Цена</th>
            <th class="py-3 px-6 w-2/5">Кандидат в нашей системе (Эталон)</th>
            <th class="py-3 px-6 text-center w-32">Уверенность</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="item in rows"
            :key="item.id"
            :class="[getRowClass(item.confidenceScore), 'transition-colors duration-150']"
          >
            <!-- Иконка статуса -->
            <td class="py-4 px-6 text-center">
              <component
                :is="getStatusIcon(item.confidenceScore)"
                class="w-5 h-5 mx-auto"
                :class="getIconColorClass(item.confidenceScore)"
              />
            </td>

            <!-- Оригинальный товар -->
            <td class="py-4 px-6">
              <div class="text-sm font-medium text-gray-900">
                {{ item.originalSupplierItem }}
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                Остаток: {{ item.quantity }} шт. · Статус: {{ item.matchStatus }}
              </div>
            </td>

            <!-- Цена -->
            <td class="py-4 px-6 text-right font-mono text-sm text-gray-800 whitespace-nowrap">
              {{ item.price.toLocaleString('ru-RU') }} ₽
            </td>

            <!-- Кандидат в системе (Active Learning UI) -->
            <td class="py-4 px-6">
              <!-- Если уверенность высокая (>85), показываем текст -->
              <div v-if="item.confidenceScore > 85" class="text-sm text-gray-800 font-medium">
                {{ item.systemMatchCandidate }}
              </div>

              <!-- Иначе показываем выпадающий список (Select) для ручной корректировки -->
              <div v-else class="flex flex-col gap-1">
                <select
                  :value="item.systemMatchCandidate"
                  @change="onCandidateSelect(item, ($event.target as HTMLSelectElement).value)"
                  class="block w-full rounded-lg border border-gray-300 px-3 py-1.5 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-800 bg-white"
                  :class="{
                    'border-indigo-400 bg-indigo-50':
                      item.systemMatchCandidate !== item.initialCandidateName,
                  }"
                >
                  <option
                    v-for="candidate in item.candidates"
                    :key="candidate.label"
                    :value="candidate.label"
                  >
                    {{ candidate.label }}
                  </option>
                </select>
                <div class="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Info class="w-3.5 h-3.5 text-amber-500" v-if="item.confidenceScore >= 60" />
                  <Info class="w-3.5 h-3.5 text-rose-500" v-else />
                  <span>Выберите эталонную шину для дообучения (Active Learning)</span>
                </div>
              </div>
            </td>

            <!-- Оценка уверенности (Score) -->
            <td class="py-4 px-6 text-center">
              <span
                class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm"
                :class="getBadgeClass(item.confidenceScore)"
              >
                {{ item.confidenceScore }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
