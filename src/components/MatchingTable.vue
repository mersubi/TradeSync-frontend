<!-- src/components/MatchingTable.vue
     Таблица результатов ML-сопоставления с логикой «Светофор» и Active Learning.
       • Каждая строка прайса показана рядом с найденной эталонной шиной.
       • Цвет бейджа показывает уверенность модели (см. utils/confidence.ts).
       • Для жёлтых и красных строк закупщик может выбрать другого кандидата —
         исправления отправляются на сервер (PATCH /items/{id}) и используются
         для дообучения модели (Active Learning).
-->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { CheckCircle2, Send, ShieldCheck, Download, RefreshCw, PackageOpen, AlertCircle } from '@lucide/vue'
import { procurementApi } from '@/api/procurement'
import type { RawOfferItemSchema, CandidateTire } from '@/api/procurement'
import { ExportService } from '@/services/ExportService'
import { getConfidenceLevel, type ConfidenceLevel } from '@/utils/confidence'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfidenceBadge from '@/components/ui/ConfidenceBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  sessionId?: number | null
  sessionStatus?: string
}>()

const emit = defineEmits<{
  (e: 'updated'): void
  (e: 'approved'): void
}>()

// ── Тип строки таблицы ────────────────────────────────────────────────────────
// Это «удобная для интерфейса» форма данных. С сервера приходит
// RawOfferItemSchema, и функция mapBackendItemsToRows переводит её в MatchingRow.
export interface MatchingRow {
  id: number
  originalSupplierItem: string      // как товар назван в прайсе поставщика
  price: number
  quantity: number
  selectedTireId: number | null     // текущий выбор (может изменить пользователь)
  initialTireId: number | null      // что предложила модель (для сравнения)
  systemMatchCandidate: string
  initialCandidateName: string
  candidates: Array<{ tireId: number | null; label: string }>
  confidence: number                // уверенность модели 0..1
  matchStatus: string
}

// ── Демо-данные (показываются, пока сессия не выбрана) ────────────────────────
const defaultMockRows: MatchingRow[] = [
  {
    id: 1, originalSupplierItem: 'Шина Michelin X-Ice North 4 205/55 R16', price: 8500, quantity: 12,
    selectedTireId: 101, initialTireId: 101,
    systemMatchCandidate: 'Michelin X-Ice North 4 205/55 R16 94T XL', initialCandidateName: 'Michelin X-Ice North 4 205/55 R16 94T XL',
    candidates: [
      { tireId: 101, label: 'Michelin X-Ice North 4 205/55 R16 94T XL' },
      { tireId: 102, label: 'Michelin X-Ice North 4 205/55 R16 91T' },
    ],
    confidence: 0.95, matchStatus: 'AUTO',
  },
  {
    id: 2, originalSupplierItem: 'Nokian Hakkapeliitta 10p 185/65 R15', price: 7000, quantity: 8,
    selectedTireId: 201, initialTireId: 201,
    systemMatchCandidate: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15', initialCandidateName: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    candidates: [
      { tireId: 201, label: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15' },
      { tireId: 202, label: 'Nokian Tyres Hakkapeliitta 9 185/65 R15' },
    ],
    confidence: 0.88, matchStatus: 'AUTO',
  },
  {
    id: 3, originalSupplierItem: 'Pirelli Ice Zero 2 225/45', price: 12000, quantity: 4,
    selectedTireId: 301, initialTireId: 301,
    systemMatchCandidate: 'Pirelli Ice Zero 2 225/45 R17 94T XL', initialCandidateName: 'Pirelli Ice Zero 2 225/45 R17 94T XL',
    candidates: [
      { tireId: 301, label: 'Pirelli Ice Zero 2 225/45 R17 94T XL' },
      { tireId: 302, label: 'Pirelli Ice Zero 2 225/45 R18 95T XL' },
      { tireId: 303, label: 'Pirelli Scorpion Ice Zero 2 225/45 R17' },
    ],
    confidence: 0.72, matchStatus: 'NEEDS_REVIEW',
  },
  {
    id: 4, originalSupplierItem: 'Резина летняя Bridgestone 205/55 R16', price: 9000, quantity: 10,
    selectedTireId: 401, initialTireId: 401,
    systemMatchCandidate: 'Bridgestone Turanza T005 205/55 R16 91V', initialCandidateName: 'Bridgestone Turanza T005 205/55 R16 91V',
    candidates: [
      { tireId: 401, label: 'Bridgestone Turanza T005 205/55 R16 91V' },
      { tireId: 402, label: 'Bridgestone Potenza Sport 225/45 R17' },
      { tireId: 403, label: 'Bridgestone Alenza 001 215/60 R17' },
    ],
    confidence: 0.45, matchStatus: 'UNMATCHED',
  },
]

// structuredClone делает глубокую копию, чтобы правки не портили исходные демо-данные
const rows         = ref<MatchingRow[]>(structuredClone(defaultMockRows))
const isLoading    = ref(false)
const isSubmitting = ref(false)
const isApproving  = ref(false)
const successText  = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// ── Фильтр по светофору ───────────────────────────────────────────────────────
const activeFilter = ref<'all' | ConfidenceLevel>('all')

// Сколько строк каждого цвета — для счётчиков на кнопках-фильтрах
const counts = computed(() => {
  const result = { all: rows.value.length, high: 0, medium: 0, low: 0 }
  for (const r of rows.value) result[getConfidenceLevel(r.confidence)]++
  return result
})

// Строки, которые реально показываются в таблице (с учётом фильтра)
const visibleRows = computed(() =>
  activeFilter.value === 'all'
    ? rows.value
    : rows.value.filter((r) => getConfidenceLevel(r.confidence) === activeFilter.value),
)

const filters = computed(() => [
  { key: 'all' as const,    label: 'Все',        count: counts.value.all,    dot: 'bg-zinc-400' },
  { key: 'high' as const,   label: 'Уверенные',  count: counts.value.high,   dot: 'bg-lime-500' },
  { key: 'medium' as const, label: 'Проверить',  count: counts.value.medium, dot: 'bg-amber-500' },
  { key: 'low' as const,    label: 'Исправить',  count: counts.value.low,    dot: 'bg-rose-500' },
])

// ── Преобразование данных сервера в строки таблицы ────────────────────────────
function mapBackendItemsToRows(items: RawOfferItemSchema[]): MatchingRow[] {
  return items.map((item) => {
    // Собираем список кандидатов без дубликатов
    const cands: Array<{ tireId: number | null; label: string }> = []
    for (const c of (item.candidates ?? []) as CandidateTire[]) {
      const tid = c.tire_id ?? c.id ?? null
      const label = c.sku || c.search_text || (tid ? `Шина #${tid}` : 'Кандидат')
      if (!cands.some((e) => e.label === label)) cands.push({ tireId: tid, label })
    }

    const matchedLabel =
      item.matched_tire?.sku ||
      cands[0]?.label ||
      (item.matched_tire_id ? `Шина #${item.matched_tire_id}` : 'Не сопоставлено')
    const matchedId = item.matched_tire_id ?? cands[0]?.tireId ?? null

    // Текущее сопоставление всегда должно быть первым вариантом в списке
    if (!cands.some((c) => c.label === matchedLabel)) {
      cands.unshift({ tireId: matchedId, label: matchedLabel })
    }

    // Бэкенд присылает уверенность 0..1; на всякий случай поддерживаем и 0..100
    const raw = item.confidence_score ?? 0
    const confidence = raw > 1 ? raw / 100 : raw

    return {
      id: item.id,
      originalSupplierItem: item.raw_name,
      price: item.price,
      quantity: item.quantity,
      selectedTireId: matchedId,
      initialTireId: matchedId,
      systemMatchCandidate: matchedLabel,
      initialCandidateName: matchedLabel,
      candidates: cands,
      confidence,
      matchStatus: item.match_status,
    }
  })
}

// ── Загрузка позиций сессии ───────────────────────────────────────────────────
async function loadSessionMatches() {
  if (!props.sessionId) {
    rows.value = structuredClone(defaultMockRows)
    return
  }
  isLoading.value = true
  errorMessage.value = null
  try {
    const detail = await procurementApi.getSessionDetails(props.sessionId)
    rows.value = mapBackendItemsToRows(detail.raw_offer_items ?? [])
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.detail || 'Не удалось загрузить позиции сессии'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (props.sessionId) loadSessionMatches()
})

// При выборе другой сессии — перезагружаем таблицу и сбрасываем фильтр
watch(() => props.sessionId, () => {
  activeFilter.value = 'all'
  loadSessionMatches()
})

// ── Ручной выбор кандидата (Active Learning) ──────────────────────────────────
function onCandidateSelect(row: MatchingRow, newLabel: string) {
  row.systemMatchCandidate = newLabel
  const found = row.candidates.find((c) => c.label === newLabel)
  if (found) row.selectedTireId = found.tireId
}

// Строки, в которых пользователь изменил выбор модели
const changedItems = computed(() =>
  rows.value.filter((r) => r.selectedTireId !== r.initialTireId || r.systemMatchCandidate !== r.initialCandidateName),
)

// Показать зелёное уведомление на 3 секунды
function flashSuccess(text: string) {
  successText.value = text
  setTimeout(() => (successText.value = null), 3000)
}

// ── Отправка исправлений (PATCH /api/v1/procurement/items/{item_id}) ──────────
async function submitCorrections() {
  if (changedItems.value.length === 0) return
  isSubmitting.value = true
  errorMessage.value = null
  try {
    if (props.sessionId) {
      for (const item of changedItems.value) {
        if (item.selectedTireId) await procurementApi.manualRematchItem(item.id, item.selectedTireId)
      }
      await loadSessionMatches()
      emit('updated')
    } else {
      // Демо-режим: имитируем ответ сервера
      await new Promise((resolve) => setTimeout(resolve, 600))
      changedItems.value.forEach((item) => {
        item.initialCandidateName = item.systemMatchCandidate
        item.initialTireId = item.selectedTireId
        item.confidence = 1   // ручная привязка = 100% уверенности
        item.matchStatus = 'MANUAL'
      })
    }
    flashSuccess('Исправления сохранены — модель учтёт их при дообучении')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.detail || 'Ошибка при сохранении исправлений'
  } finally {
    isSubmitting.value = false
  }
}

// ── Утверждение сессии (POST /api/v1/procurement/{session_id}/approve) ────────
async function handleApproveSession() {
  if (!props.sessionId) return
  isApproving.value = true
  errorMessage.value = null
  try {
    await procurementApi.approveSession(props.sessionId, true)
    flashSuccess('Сессия утверждена — можно переходить к матрице цен')
    emit('approved')
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.detail || 'Не удалось утвердить сессию'
  } finally {
    isApproving.value = false
  }
}

// ── Скачать таблицу сопоставления (XLSX) ──────────────────────────────────────
async function handleDownloadMatched() {
  if (!props.sessionId) {
    ExportService.exportToExcel(rows.value, 'matched_table')
    return
  }
  try {
    const blob = await procurementApi.downloadMatchedTable(props.sessionId, 'xlsx')
    ExportService.downloadBlob(blob, `matched_session_${props.sessionId}.xlsx`)
  } catch {
    errorMessage.value = 'Ошибка при скачивании таблицы'
  }
}

// Подписи статусов сопоставления на русском
const matchStatusLabels: Record<string, string> = {
  AUTO: 'Авто',
  NEEDS_REVIEW: 'Требует проверки',
  MANUAL: 'Вручную',
  UNMATCHED: 'Не найдено',
}
</script>

<template>
  <div class="bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft overflow-hidden">
    <!-- ── Шапка: заголовок и действия ─────────────────────────────────────── -->
    <div class="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 class="text-base font-semibold text-zinc-900">
          Результаты сопоставления
          <span v-if="sessionId" class="ml-1 font-mono text-sm text-zinc-400">#{{ sessionId }}</span>
          <span v-else class="ml-2 px-2 py-0.5 rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">демо</span>
        </h2>
        <p class="mt-0.5 text-sm text-zinc-500">
          Для жёлтых и красных строк выберите правильную шину из списка — это дообучит модель.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <BaseButton v-if="sessionId" variant="ghost" size="sm" :icon="RefreshCw" :loading="isLoading" @click="loadSessionMatches">
          Обновить
        </BaseButton>
        <BaseButton variant="secondary" size="sm" :icon="Download" @click="handleDownloadMatched">XLSX</BaseButton>
        <BaseButton
          variant="secondary"
          size="sm"
          :icon="Send"
          :loading="isSubmitting"
          :disabled="changedItems.length === 0"
          @click="submitCorrections"
        >
          Сохранить исправления
          <span
            v-if="changedItems.length"
            class="ml-0.5 px-1.5 rounded-md bg-brand-400 text-zinc-950 font-mono"
          >{{ changedItems.length }}</span>
        </BaseButton>
        <BaseButton
          v-if="sessionId && sessionStatus !== 'APPROVED'"
          size="sm"
          :icon="ShieldCheck"
          :loading="isApproving"
          @click="handleApproveSession"
        >
          Утвердить сессию
        </BaseButton>
      </div>
    </div>

    <!-- ── Уведомления ─────────────────────────────────────────────────────── -->
    <div v-if="successText || errorMessage" class="px-6 pb-4">
      <p
        v-if="successText"
        class="flex items-center gap-2 p-3 rounded-xl bg-lime-50 text-sm text-lime-800 ring-1 ring-lime-200"
      >
        <CheckCircle2 class="w-4 h-4" /> {{ successText }}
      </p>
      <p
        v-if="errorMessage"
        class="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-sm text-rose-700 ring-1 ring-rose-200"
      >
        <AlertCircle class="w-4 h-4" /> {{ errorMessage }}
      </p>
    </div>

    <!-- ── Фильтры-«чипы» по светофору ─────────────────────────────────────── -->
    <div class="flex flex-wrap gap-2 px-6 pb-4 border-b border-zinc-100">
      <button
        v-for="f in filters"
        :key="f.key"
        type="button"
        class="inline-flex items-center gap-2 h-8 px-3 rounded-full text-sm font-medium transition-colors cursor-pointer"
        :class="activeFilter === f.key ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'"
        @click="activeFilter = f.key"
      >
        <span class="w-2 h-2 rounded-full" :class="f.dot" />
        {{ f.label }}
        <span class="font-mono text-xs opacity-70">{{ f.count }}</span>
      </button>
    </div>

    <!-- ── Пустое состояние ────────────────────────────────────────────────── -->
    <EmptyState
      v-if="!isLoading && visibleRows.length === 0"
      :icon="PackageOpen"
      :title="rows.length === 0 ? 'В сессии пока нет позиций' : 'Нет строк в этой категории'"
      :hint="rows.length === 0 ? 'Дождитесь окончания ML-обработки или загрузите прайс заново.' : 'Выберите другой фильтр выше.'"
    />

    <!-- ── Таблица ─────────────────────────────────────────────────────────── -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs font-medium text-zinc-500 bg-zinc-50/60">
            <th class="px-6 py-3 font-medium">Позиция поставщика</th>
            <th class="px-6 py-3 font-medium text-right">Цена</th>
            <th class="px-6 py-3 font-medium w-2/5">Эталонная шина в каталоге</th>
            <th class="px-6 py-3 font-medium text-center">Уверенность</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-zinc-100" :class="{ 'opacity-50': isLoading }">
          <tr v-for="item in visibleRows" :key="item.id" class="hover:bg-zinc-50/70 transition-colors">
            <!-- Исходная позиция -->
            <td class="px-6 py-4">
              <p class="font-medium text-zinc-900">{{ item.originalSupplierItem }}</p>
              <p class="mt-0.5 text-xs text-zinc-500">
                <span class="font-mono">{{ item.quantity }}</span> шт. ·
                {{ matchStatusLabels[item.matchStatus] ?? item.matchStatus }}
              </p>
            </td>

            <!-- Цена -->
            <td class="px-6 py-4 text-right font-mono tabular-nums whitespace-nowrap text-zinc-800">
              {{ item.price.toLocaleString('ru-RU') }} ₽
            </td>

            <!-- Эталон: уверенные — просто текст, остальные — выпадающий список -->
            <td class="px-6 py-4">
              <p v-if="getConfidenceLevel(item.confidence) === 'high'" class="font-medium text-zinc-800">
                {{ item.systemMatchCandidate }}
              </p>
              <select
                v-else
                class="field h-9"
                :class="{ '!ring-2 !ring-brand-400 bg-brand-50': item.systemMatchCandidate !== item.initialCandidateName }"
                :value="item.systemMatchCandidate"
                @change="onCandidateSelect(item, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="c in item.candidates" :key="c.label" :value="c.label">{{ c.label }}</option>
              </select>
            </td>

            <!-- Светофор -->
            <td class="px-6 py-4 text-center">
              <ConfidenceBadge :score="item.confidence" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
