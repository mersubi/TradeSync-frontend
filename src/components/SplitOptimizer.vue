<!-- src/components/SplitOptimizer.vue
     Оптимизатор сплита заказа (MILP).
     Сервер решает задачу целочисленного линейного программирования:
     как распределить заказ между поставщиками, чтобы итоговый чек был минимальным
     (с учётом кратности упаковок и минимальных партий). Здесь мы показываем
     результат: итог, экономию, доли поставщиков, спецификацию и кнопки экспорта.
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TrendingDown, Wallet, PieChart, Play, FileSpreadsheet, FileJson, FileCode2, AlertCircle } from '@lucide/vue'
import { ExportService } from '@/services/ExportService'
import { procurementApi } from '@/api/procurement'
import type { DemandItemCreate } from '@/api/procurement'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseCard from '@/components/ui/BaseCard.vue'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = defineProps<{
  sessionId?: number | null
  defaultDemand?: DemandItemCreate[]   // потребность; если не передана — собираем из сессии
}>()

// ── Типы ──────────────────────────────────────────────────────────────────────
interface PurchaseItem {
  id: number
  name: string
  quantity: number
  selectedSupplier: string
  unitPrice: number
  totalPrice: number
}

interface SupplierSplit {
  supplierName: string
  itemCount: number
  totalCost: number
  colorIndex: number   // номер цвета в палитре PALETTE
}

interface OptimizerSummary {
  totalCost: number
  totalSavings: number
  solverMethod?: string
  split: SupplierSplit[]
}

// ── Палитра поставщиков ───────────────────────────────────────────────────────
// Для каждого поставщика — цвет полосы и цвет бейджа. Классы записаны целиком,
// чтобы Tailwind их нашёл при сборке.
const PALETTE = [
  { bar: 'bg-lime-400',    badge: 'bg-lime-100 text-lime-800' },
  { bar: 'bg-zinc-800',    badge: 'bg-zinc-200 text-zinc-800' },
  { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  { bar: 'bg-teal-300',    badge: 'bg-teal-100 text-teal-800' },
  { bar: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-800' },
]

// ── Демо-результат (заменяется ответом сервера после расчёта) ─────────────────
const summary = ref<OptimizerSummary>({
  totalCost: 250000,
  totalSavings: 35000,
  solverMethod: 'scipy_milp',
  split: [
    { supplierName: 'ШинИнвест',   itemCount: 3, totalCost: 150000, colorIndex: 0 },
    { supplierName: 'АвтоШинаОпт', itemCount: 2, totalCost: 100000, colorIndex: 1 },
  ],
})

const items = ref<PurchaseItem[]>([
  { id: 1, name: 'Michelin X-Ice North 4 205/55 R16',   quantity: 10, selectedSupplier: 'ШинИнвест',   unitPrice: 8500,  totalPrice: 85000 },
  { id: 2, name: 'Nokian Hakkapeliitta 10p 185/65 R15', quantity: 4,  selectedSupplier: 'АвтоШинаОпт', unitPrice: 7000,  totalPrice: 28000 },
  { id: 3, name: 'Pirelli Ice Zero 2 225/45 R17',       quantity: 4,  selectedSupplier: 'ШинИнвест',   unitPrice: 12000, totalPrice: 48000 },
  { id: 4, name: 'КиК КС740 6x16/5x114.3',              quantity: 4,  selectedSupplier: 'ШинИнвест',   unitPrice: 4250,  totalPrice: 17000 },
  { id: 5, name: 'Bridgestone Turanza T005 205/55 R16', quantity: 8,  selectedSupplier: 'АвтоШинаОпт', unitPrice: 9000,  totalPrice: 72000 },
])

const isOptimizing  = ref(false)
const optimizeError = ref<string | null>(null)

// ── Запуск расчёта на сервере (POST /api/v1/procurement/{id}/optimize) ────────
async function runBackendOptimization() {
  if (!props.sessionId) return
  isOptimizing.value = true
  optimizeError.value = null

  try {
    // 1) Потребность: если не передана, берём по каждой сопоставленной шине
    //    количество из прайса (но не больше 4 шт. — стандартный комплект)
    let demandPayload = props.defaultDemand
    const detail = await procurementApi.getSessionDetails(props.sessionId)
    if (!demandPayload || demandPayload.length === 0) {
      const tireMap = new Map<number, number>()
      for (const offer of detail.raw_offer_items ?? []) {
        if (offer.matched_tire_id) {
          const prev = tireMap.get(offer.matched_tire_id) ?? 0
          tireMap.set(offer.matched_tire_id, Math.max(prev, Math.min(offer.quantity, 4)))
        }
      }
      demandPayload = Array.from(tireMap, ([tire_id, required_qty]) => ({ tire_id, required_qty }))
    }

    // 2) Оптимизировать можно только утверждённую сессию — утверждаем при необходимости
    if (detail.status === 'COMPLETED') {
      await procurementApi.approveSession(props.sessionId, true)
    }

    // 3) Запрос к MILP-решателю
    const res = await procurementApi.optimizeSession(props.sessionId, {
      demand: demandPayload.length > 0 ? demandPayload : undefined,
    })

    // 4) Переводим ответ сервера в строки спецификации
    items.value = res.allocations.map((a, idx) => ({
      id: a.offer_item_id || idx + 1,
      name: a.sku || `Шина #${a.tire_id}`,
      quantity: a.qty,
      selectedSupplier: a.supplier_name || (a.supplier_id ? `Поставщик #${a.supplier_id}` : 'Основной склад'),
      unitPrice: a.price,
      totalPrice: a.total,
    }))

    // 5) Считаем долю каждого поставщика в заказе
    const splitMap = new Map<string, { itemCount: number; totalCost: number }>()
    for (const row of items.value) {
      const cur = splitMap.get(row.selectedSupplier) ?? { itemCount: 0, totalCost: 0 }
      cur.itemCount += 1
      cur.totalCost += row.totalPrice
      splitMap.set(row.selectedSupplier, cur)
    }

    summary.value = {
      totalCost: res.total_cost,
      totalSavings: res.savings,
      solverMethod: res.solver_method,
      split: Array.from(splitMap, ([supplierName, val], i) => ({
        supplierName,
        ...val,
        colorIndex: i % PALETTE.length,
      })),
    }
  } catch (err: any) {
    optimizeError.value = err?.response?.data?.detail || 'Не удалось выполнить оптимизацию на сервере'
  } finally {
    isOptimizing.value = false
  }
}

// При смене сессии автоматически пересчитываем сплит
watch(() => props.sessionId, (newId) => {
  if (newId) runBackendOptimization()
})

// ── Вспомогательные вычисления ────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)

// Сумма всех долей — для расчёта ширины сегментов полосы (защита от деления на 0)
const totalSplitCost = computed(() => summary.value.split.reduce((acc, s) => acc + s.totalCost, 0) || 1)

// Процент экономии относительно цены «без оптимизации»
const savingsPercent = computed(() => {
  const baseline = summary.value.totalCost + summary.value.totalSavings
  return baseline > 0 ? Math.round((summary.value.totalSavings / baseline) * 100) : 0
})

// Цвет бейджа поставщика в таблице спецификации
function supplierBadge(name: string): string {
  const s = summary.value.split.find((p) => p.supplierName === name)
  return s ? PALETTE[s.colorIndex].badge : 'bg-zinc-100 text-zinc-700'
}

// ── Экспорт ───────────────────────────────────────────────────────────────────
function handleExportExcel() {
  ExportService.exportToExcel(items.value, `optimization_session_${props.sessionId || 'demo'}`)
}

// JSON: с сервера (формат 1С), а если сервер недоступен — локально
async function handleExportJson() {
  if (props.sessionId) {
    try {
      const blob = await procurementApi.export1C(props.sessionId, 'json')
      ExportService.downloadBlob(blob, `session_${props.sessionId}_1c.json`)
      return
    } catch {
      // переходим к локальному экспорту ниже
    }
  }
  ExportService.exportToJson({ summary: summary.value, items: items.value }, `optimization_session_${props.sessionId || 'demo'}`)
}

// CommerceML 2.08 XML — стандартный формат обмена с 1С
async function handleExport1CXml() {
  if (!props.sessionId) {
    ExportService.exportToJson({ summary: summary.value, items: items.value }, 'commerceml_demo')
    return
  }
  try {
    const blob = await procurementApi.export1C(props.sessionId, 'xml')
    ExportService.downloadBlob(blob, `session_${props.sessionId}_commerceml.xml`)
  } catch (err: any) {
    optimizeError.value = err?.response?.data?.detail || 'Ошибка при выгрузке CommerceML XML'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- ── Заголовок блока ─────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-zinc-900">Оптимальный сплит заказа</h2>
        <p class="mt-0.5 text-sm text-zinc-500">
          Алгоритм MILP подбирает поставщика для каждой позиции так, чтобы итоговый чек был минимальным.
        </p>
      </div>
      <BaseButton v-if="sessionId" :icon="Play" :loading="isOptimizing" @click="runBackendOptimization">
        {{ isOptimizing ? 'Считаем…' : 'Рассчитать сплит' }}
      </BaseButton>
    </div>

    <p
      v-if="optimizeError"
      class="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-sm text-rose-700 ring-1 ring-rose-200"
    >
      <AlertCircle class="w-4 h-4" /> {{ optimizeError }}
    </p>

    <!-- ── Итоговые показатели ─────────────────────────────────────────────── -->
    <div class="grid gap-4 md:grid-cols-3">
      <!-- Экономия — главный показатель, выделен тёмной карточкой -->
      <div class="relative p-6 overflow-hidden rounded-2xl bg-zinc-950">
        <div class="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-400/25 blur-2xl pointer-events-none" />
        <div class="relative">
          <div class="flex items-center gap-2 text-sm text-zinc-400">
            <TrendingDown class="w-4 h-4 text-brand-400" /> Экономия
          </div>
          <p class="mt-2 text-3xl font-semibold font-mono tabular-nums text-brand-400">
            {{ formatCurrency(summary.totalSavings) }}
          </p>
          <p class="mt-1 text-xs text-zinc-500">−{{ savingsPercent }}% от цены без оптимизации</p>
        </div>
      </div>

      <!-- Итоговый чек -->
      <div class="p-6 bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft">
        <div class="flex items-center gap-2 text-sm text-zinc-500">
          <Wallet class="w-4 h-4" /> Итоговый чек
        </div>
        <p class="mt-2 text-3xl font-semibold font-mono tabular-nums text-zinc-900">
          {{ formatCurrency(summary.totalCost) }}
        </p>
        <p class="mt-1 text-xs font-mono text-zinc-400">решатель: {{ summary.solverMethod ?? '—' }}</p>
      </div>

      <!-- Доли поставщиков -->
      <div class="p-6 bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft">
        <div class="flex items-center gap-2 text-sm text-zinc-500">
          <PieChart class="w-4 h-4" /> Доли поставщиков
        </div>
        <!-- Полоса из сегментов: ширина каждого = доля поставщика в сумме -->
        <div class="flex w-full h-2.5 mt-4 overflow-hidden rounded-full bg-zinc-100 gap-0.5">
          <div
            v-for="part in summary.split"
            :key="part.supplierName"
            :class="PALETTE[part.colorIndex].bar"
            :style="{ width: `${(part.totalCost / totalSplitCost) * 100}%` }"
            :title="`${part.supplierName}: ${formatCurrency(part.totalCost)}`"
          />
        </div>
        <ul class="mt-4 space-y-1.5">
          <li v-for="part in summary.split" :key="part.supplierName" class="flex items-center justify-between text-xs">
            <span class="flex items-center gap-2 text-zinc-700">
              <span class="w-2 h-2 rounded-full" :class="PALETTE[part.colorIndex].bar" />
              {{ part.supplierName }}
            </span>
            <span class="font-mono text-zinc-500">{{ Math.round((part.totalCost / totalSplitCost) * 100) }}%</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ── Спецификация заказа ─────────────────────────────────────────────── -->
    <BaseCard title="Спецификация заказа" :subtitle="`${items.length} позиций`" :padded="false">
      <!-- Кнопки экспорта собраны в одну группу в шапке карточки -->
      <template #actions>
        <BaseButton variant="secondary" size="sm" :icon="FileSpreadsheet" @click="handleExportExcel">Excel</BaseButton>
        <BaseButton variant="secondary" size="sm" :icon="FileJson" @click="handleExportJson">JSON</BaseButton>
        <BaseButton v-if="sessionId" size="sm" :icon="FileCode2" @click="handleExport1CXml">Выгрузить в 1С</BaseButton>
      </template>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs font-medium text-zinc-500 bg-zinc-50/60">
              <th class="px-6 py-3 font-medium">Наименование</th>
              <th class="px-6 py-3 font-medium text-right">Кол-во</th>
              <th class="px-6 py-3 font-medium">Поставщик</th>
              <th class="px-6 py-3 font-medium text-right">Цена</th>
              <th class="px-6 py-3 font-medium text-right">Сумма</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <tr v-for="item in items" :key="item.id" class="hover:bg-zinc-50/70">
              <td class="px-6 py-3.5 font-medium text-zinc-900">{{ item.name }}</td>
              <td class="px-6 py-3.5 text-right font-mono tabular-nums text-zinc-600">{{ item.quantity }}</td>
              <td class="px-6 py-3.5">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="supplierBadge(item.selectedSupplier)">
                  {{ item.selectedSupplier }}
                </span>
              </td>
              <td class="px-6 py-3.5 text-right font-mono tabular-nums text-zinc-600">{{ formatCurrency(item.unitPrice) }}</td>
              <td class="px-6 py-3.5 text-right font-mono tabular-nums font-medium text-zinc-900">{{ formatCurrency(item.totalPrice) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-zinc-200">
              <td colspan="4" class="px-6 py-4 text-right text-sm font-medium text-zinc-500">Итого к оплате</td>
              <td class="px-6 py-4 text-right font-mono tabular-nums text-lg font-semibold text-zinc-900">
                {{ formatCurrency(summary.totalCost) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </BaseCard>
  </div>
</template>
