<!-- src/components/SplitOptimizer.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  DollarSign,
  TrendingDown,
  PieChart,
  ShoppingCart,
  Check,
  FileSpreadsheet,
  FileJson,
  Play,
  FileCode2,
} from '@lucide/vue'
import { ExportService } from '@/services/ExportService'
import { procurementApi } from '@/api/procurement'
import type { DemandItemCreate } from '@/api/procurement'

const props = defineProps<{
  sessionId?: number | null
  defaultDemand?: DemandItemCreate[]
}>()

// Тип для отдельной позиции в закупке
interface PurchaseItem {
  id: number
  name: string
  quantity: number
  selectedSupplier: string
  unitPrice: number
  totalPrice: number
}

// Тип для доли поставщика
interface SupplierSplit {
  supplierName: string
  itemCount: number
  totalCost: number
  colorClass: string
}

// Тип для сводки оптимизации
interface OptimizerSummary {
  totalCost: number
  totalSavings: number
  solverMethod?: string
  split: SupplierSplit[]
}

const PALETTE = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-blue-500']

// Исходные данные (обновляются реальным ответом POST /api/v1/procurement/{session_id}/optimize)
const summary = ref<OptimizerSummary>({
  totalCost: 250000,
  totalSavings: 35000,
  solverMethod: 'scipy_milp',
  split: [
    { supplierName: 'Поставщик А', itemCount: 5, totalCost: 150000, colorClass: 'bg-indigo-500' },
    { supplierName: 'Поставщик Б', itemCount: 2, totalCost: 100000, colorClass: 'bg-emerald-500' },
  ],
})

const items = ref<PurchaseItem[]>([
  {
    id: 1,
    name: 'Michelin X-Ice North 4 205/55 R16',
    quantity: 10,
    selectedSupplier: 'Поставщик А',
    unitPrice: 8500,
    totalPrice: 85000,
  },
  {
    id: 2,
    name: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    quantity: 4,
    selectedSupplier: 'Поставщик Б',
    unitPrice: 7000,
    totalPrice: 28000,
  },
  {
    id: 3,
    name: 'Pirelli Ice Zero 2 225/45 R17',
    quantity: 4,
    selectedSupplier: 'Поставщик А',
    unitPrice: 12000,
    totalPrice: 48000,
  },
  {
    id: 4,
    name: 'КиК КС740 6x16/5x114.3',
    quantity: 4,
    selectedSupplier: 'Поставщик А',
    unitPrice: 4250,
    totalPrice: 17000,
  },
  {
    id: 5,
    name: 'Bridgestone Turanza T005 205/55 R16',
    quantity: 8,
    selectedSupplier: 'Поставщик Б',
    unitPrice: 9000,
    totalPrice: 72000,
  },
])

const isOptimizing = ref(false)
const optimizeError = ref<string | null>(null)

// Запуск реального расчета SplitOptimizer на бэкенде
async function runBackendOptimization() {
  if (!props.sessionId) return
  isOptimizing.value = true
  optimizeError.value = null

  try {
    // Если потребность не передана явно, собираем ее из сопоставленных шин сессии
    let demandPayload = props.defaultDemand
    if (!demandPayload || demandPayload.length === 0) {
      const detail = await procurementApi.getSessionDetails(props.sessionId)
      const tireMap = new Map<number, number>()
      for (const offer of detail.raw_offer_items || []) {
        if (offer.matched_tire_id) {
          const prev = tireMap.get(offer.matched_tire_id) || 0
          tireMap.set(offer.matched_tire_id, Math.max(prev, Math.min(offer.quantity, 4)))
        }
      }
      demandPayload = Array.from(tireMap.entries()).map(([tire_id, required_qty]) => ({
        tire_id,
        required_qty,
      }))
    }

    // Если сессия в статусе COMPLETED, автоматически утверждаем её перед оптимизацией
    const detailCheck = await procurementApi.getSessionDetails(props.sessionId)
    if (detailCheck.status === 'COMPLETED') {
      await procurementApi.approveSession(props.sessionId, true)
    }

    const res = await procurementApi.optimizeSession(props.sessionId, {
      demand: demandPayload && demandPayload.length > 0 ? demandPayload : undefined,
    })

    // Преобразуем ответ бэкенда в структуру таблицы и сводки
    items.value = res.allocations.map((a, idx) => ({
      id: a.offer_item_id || idx + 1,
      name: a.sku || `Шина #${a.tire_id}`,
      quantity: a.qty,
      selectedSupplier: a.supplier_name || (a.supplier_id ? `Поставщик #${a.supplier_id}` : 'Основной склад'),
      unitPrice: a.price,
      totalPrice: a.total,
    }))

    // Группируем доли поставщиков
    const splitMap = new Map<string, { itemCount: number; totalCost: number }>()
    for (const row of items.value) {
      const cur = splitMap.get(row.selectedSupplier) || { itemCount: 0, totalCost: 0 }
      cur.itemCount += 1
      cur.totalCost += row.totalPrice
      splitMap.set(row.selectedSupplier, cur)
    }

    const splitArr: SupplierSplit[] = Array.from(splitMap.entries()).map(([supplierName, val], i) => ({
      supplierName,
      itemCount: val.itemCount,
      totalCost: val.totalCost,
      colorClass: PALETTE[i % PALETTE.length],
    }))

    summary.value = {
      totalCost: res.total_cost,
      totalSavings: res.savings,
      solverMethod: res.solver_method,
      split: splitArr,
    }
  } catch (err: any) {
    optimizeError.value =
      err?.response?.data?.detail || 'Не удалось выполнить оптимизацию на сервере'
  } finally {
    isOptimizing.value = false
  }
}

watch(
  () => props.sessionId,
  (newId) => {
    if (newId) {
      runBackendOptimization()
    }
  },
)

// Форматирование валюты (рубли)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

// Вычисляем общую стоимость для визуального бара
const totalSplitCost = computed(() => {
  const sum = summary.value.split.reduce((acc, curr) => acc + curr.totalCost, 0)
  return sum > 0 ? sum : 1
})

// Цвет фона для бейджа поставщика в таблице
const getSupplierBadgeClass = (supplierName: string) => {
  const supplier = summary.value.split.find((s) => s.supplierName === supplierName)
  if (supplier?.colorClass === 'bg-indigo-500') return 'bg-indigo-100 text-indigo-800 border-indigo-200'
  if (supplier?.colorClass === 'bg-emerald-500') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (supplier?.colorClass === 'bg-amber-500') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

// Экспорт в Excel/CSV
const handleExportExcel = () => {
  ExportService.exportToExcel(items.value, `optimization_session_${props.sessionId || 'demo'}`)
}

// Экспорт в JSON (с бэкенда CommerceML JSON или локальный)
const handleExportJson = async () => {
  if (props.sessionId) {
    try {
      const blob = await procurementApi.export1C(props.sessionId, 'json')
      ExportService.downloadBlob(blob, `session_${props.sessionId}_1c.json`)
      return
    } catch {
      // Фолбэк на клиентский JSON
    }
  }
  ExportService.exportToJson(
    { summary: summary.value, items: items.value },
    `optimization_session_${props.sessionId || 'demo'}`,
  )
}

// Экспорт в 1С CommerceML 2.08 XML напрямую с бэкенда
const handleExport1CXml = async () => {
  if (!props.sessionId) {
    ExportService.exportToJson(
      { summary: summary.value, items: items.value },
      'commerceml_demo',
    )
    return
  }
  try {
    const blob = await procurementApi.export1C(props.sessionId, 'xml')
    ExportService.downloadBlob(blob, `session_${props.sessionId}_commerceml.xml`)
  } catch (err: any) {
    optimizeError.value =
      err?.response?.data?.detail || 'Ошибка при выгрузке CommerceML XML из 1С-модуля бэкенда'
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto">
    <!-- Заголовок и действия (Оптимизация + Экспорт) -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-1">
      <div>
        <h2 class="text-xl font-bold text-white">
          Матрица Сплит-Оптимизатора (MILP)
          <span v-if="sessionId" class="text-sm font-mono text-purple-400 ml-2">
            Сессия #{{ sessionId }}
          </span>
        </h2>
        <p class="text-slate-400 text-sm mt-0.5">
          Оптимальное распределение заказа между поставщиками для достижения минимального чека
        </p>
      </div>

      <!-- Блок действий (кнопки запуска оптимизации и экспорта) -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          v-if="sessionId"
          type="button"
          @click="runBackendOptimization"
          :disabled="isOptimizing"
          class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Play class="w-3.5 h-3.5" />
          {{ isOptimizing ? 'Расчет MILP...' : 'Рассчитать сплит на сервере' }}
        </button>

        <button
          type="button"
          @click="handleExportExcel"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
        >
          <FileSpreadsheet class="w-4 h-4" />
          Скачать Excel
        </button>

        <button
          type="button"
          @click="handleExportJson"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <FileJson class="w-4 h-4" />
          Скачать JSON
        </button>

        <button
          v-if="sessionId"
          type="button"
          @click="handleExport1CXml"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <FileCode2 class="w-4 h-4" />
          1С CommerceML (XML)
        </button>
      </div>
    </div>

    <!-- Ошибка оптимизации -->
    <div
      v-if="optimizeError"
      class="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs"
    >
      {{ optimizeError }}
    </div>

    <!-- Верхняя секция: Сводка (Дашборд) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Карточка: Итоговый чек -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div class="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <DollarSign class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm font-medium text-gray-500">Итоговый чек</p>
          <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(summary.totalCost) }}</p>
        </div>
      </div>

      <!-- Карточка: Экономия -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 relative overflow-hidden">
        <div class="flex items-center gap-4 relative z-10">
          <div class="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingDown class="w-6 h-6" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500">Экономия от рынка</p>
            <p class="text-2xl font-bold text-emerald-600">{{ formatCurrency(summary.totalSavings) }}</p>
          </div>
        </div>
      </div>

      <!-- Карточка: Сплит по поставщикам -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center">
        <div class="flex items-center gap-2 mb-3">
          <PieChart class="w-5 h-5 text-gray-400" />
          <p class="text-sm font-medium text-gray-500">Доли поставщиков</p>
        </div>

        <!-- Прогресс-бар сплита -->
        <div class="w-full h-3 rounded-full flex overflow-hidden mb-3 bg-gray-100">
          <div
            v-for="part in summary.split"
            :key="part.supplierName"
            :class="part.colorClass"
            :style="{ width: `${(part.totalCost / totalSplitCost) * 100}%` }"
            :title="`${part.supplierName}: ${formatCurrency(part.totalCost)}`"
          ></div>
        </div>

        <!-- Легенда -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
          <div v-for="part in summary.split" :key="part.supplierName" class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full" :class="part.colorClass"></div>
            <span>{{ part.supplierName }} ({{ part.itemCount }} поз.)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Основная секция: Таблица заказа -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="p-5 border-b border-gray-200 bg-gray-50/50 flex items-center gap-3">
        <ShoppingCart class="w-5 h-5 text-gray-500" />
        <h2 class="text-lg font-semibold text-gray-900">Спецификация заказа</h2>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
              <th class="py-3 px-6">Наименование товара</th>
              <th class="py-3 px-6 text-center w-24">Кол-во</th>
              <th class="py-3 px-6 w-48">Победитель (Поставщик)</th>
              <th class="py-3 px-6 text-right w-36">Цена за шт.</th>
              <th class="py-3 px-6 text-right w-40">Сумма</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="item in items"
              :key="item.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="py-4 px-6 text-sm font-medium text-gray-900">
                {{ item.name }}
              </td>
              <td class="py-4 px-6 text-center text-sm text-gray-600">
                {{ item.quantity }} шт.
              </td>
              <td class="py-4 px-6">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                  :class="getSupplierBadgeClass(item.selectedSupplier)"
                >
                  <Check class="w-3 h-3" />
                  {{ item.selectedSupplier }}
                </span>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="text-sm font-semibold text-emerald-600">
                  {{ formatCurrency(item.unitPrice) }}
                </div>
              </td>
              <td class="py-4 px-6 text-right text-sm font-medium text-gray-900">
                {{ formatCurrency(item.totalPrice) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="bg-gray-50 border-t border-gray-200 font-semibold text-gray-900">
              <td colspan="4" class="py-4 px-6 text-right">Общая сумма закупки:</td>
              <td class="py-4 px-6 text-right text-lg text-indigo-600">
                {{ formatCurrency(summary.totalCost) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>
