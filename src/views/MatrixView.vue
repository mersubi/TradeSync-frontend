<!-- src/views/MatrixView.vue
     Шаг 3–4 процесса: сводная матрица цен поставщиков и расчёт сплита.
     Строки — эталонные шины, колонки — поставщики. Лучшая цена в строке
     подсвечивается. Ниже — SplitOptimizer (MILP) и экспорт в 1С.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { procurementApi } from '@/api/procurement'
import type { ProcurementSessionResponse } from '@/api/procurement'
import SplitOptimizer from '@/components/SplitOptimizer.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProcessStepper from '@/components/ui/ProcessStepper.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Search, SearchX, TrendingDown, RefreshCw } from '@lucide/vue'

const route = useRoute()

// ── Тип строки матрицы ────────────────────────────────────────────────────────
// supplierPrices — словарь «название поставщика → цена» (null = нет предложения)
export interface ProductMatrixItem {
  id: string
  name: string
  sku: string
  category: string
  supplierPrices: Record<string, number | null>
}

// ── Состояние ─────────────────────────────────────────────────────────────────
const sessions          = ref<ProcurementSessionResponse[]>([])
const selectedSessionId = ref<number | null>(null)
const isLoading         = ref(false)
const supplierNames     = ref(new Map<number, string>())  // id поставщика → название

// ── Демо-данные (если сессия не выбрана или сервер недоступен) ────────────────
const defaultSuppliers = ['ШинИнвест', 'АвтоШинаОпт']
const defaultProducts: ProductMatrixItem[] = [
  { id: 'T1', name: 'Michelin X-Ice North 4 205/55 R16 94T XL', sku: 'MICHELIN-XIN4-205-55-R16', category: 'Зимние',
    supplierPrices: { ШинИнвест: 8500, АвтоШинаОпт: 8900 } },
  { id: 'T2', name: 'Nokian Hakkapeliitta 10p 185/65 R15', sku: 'NOKIAN-HKPL10P-185-65-R15', category: 'Зимние',
    supplierPrices: { ШинИнвест: 7350, АвтоШинаОпт: 7000 } },
  { id: 'T3', name: 'Pirelli Ice Zero 2 225/45 R17 94T XL', sku: 'PIRELLI-IZ2-225-45-R17', category: 'Зимние',
    supplierPrices: { ШинИнвест: 12000, АвтоШинаОпт: 12450 } },
  { id: 'T4', name: 'Bridgestone Turanza T005 205/55 R16 91V', sku: 'BRIDGESTONE-T005-205-55-R16', category: 'Летние',
    supplierPrices: { ШинИнвест: 9400, АвтоШинаОпт: 9000 } },
]

const suppliers = ref<string[]>([...defaultSuppliers])
const products  = ref<ProductMatrixItem[]>([...defaultProducts])

function useDemoData() {
  suppliers.value = [...defaultSuppliers]
  products.value  = [...defaultProducts]
}

// ── Построение матрицы по позициям сессии ─────────────────────────────────────
// Группируем предложения по эталонной шине; если у одного поставщика
// несколько цен на одну шину — оставляем минимальную.
async function loadMatrixForSession(sessionId: number | null) {
  if (!sessionId) return useDemoData()

  isLoading.value = true
  try {
    const detail = await procurementApi.getSessionDetails(sessionId)
    const offers = detail.raw_offer_items ?? []
    if (offers.length === 0) return useDemoData()

    const supSet     = new Set<string>()
    const productMap = new Map<string, ProductMatrixItem>()

    for (const offer of offers) {
      const supName =
        (offer.supplier_id && supplierNames.value.get(offer.supplier_id)) ||
        (offer.supplier_id ? `Поставщик #${offer.supplier_id}` : 'Прайс сессии')
      supSet.add(supName)

      const key = offer.matched_tire?.sku || offer.raw_name
      const row = productMap.get(key) ?? {
        id: String(offer.matched_tire_id || offer.id),
        name: offer.matched_tire?.sku || offer.raw_name,
        sku: offer.supplier_article || `TIRE-${offer.matched_tire_id || offer.id}`,
        category: offer.matched_tire ? `R${offer.matched_tire.diameter_inch}` : 'Без категории',
        supplierPrices: {},
      }

      const prev = row.supplierPrices[supName]
      if (prev == null || offer.price < prev) row.supplierPrices[supName] = offer.price
      productMap.set(key, row)
    }

    suppliers.value = Array.from(supSet)
    products.value  = Array.from(productMap.values())
  } catch {
    useDemoData()
  } finally {
    isLoading.value = false
  }
}

// ── Инициализация ─────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const [sessList, supList] = await Promise.all([
      procurementApi.listSessions(0, 50),
      procurementApi.listSuppliers(),
    ])
    sessions.value = sessList
    supplierNames.value = new Map(supList.map((s) => [s.id, s.name]))

    // Сессия из ссылки (?session_id=5) или первая в списке
    const fromQuery = Number(route.query.session_id)
    selectedSessionId.value = sessList.find((s) => s.id === fromQuery)?.id ?? sessList[0]?.id ?? null
    await loadMatrixForSession(selectedSessionId.value)
  } catch {
    // Сервер недоступен — остаются демо-данные
  }
})

// ── Поиск и фильтры ───────────────────────────────────────────────────────────
const searchQuery      = ref('')
const selectedCategory = ref('')

const categories = computed(() => Array.from(new Set(products.value.map((p) => p.category))))

// Отфильтрованные строки: computed пересчитывается при вводе в поиск
const filteredProducts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return products.value.filter((item) => {
    const matchesSearch   = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
    const matchesCategory = !selectedCategory.value || item.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

// Минимальная цена в строке — чтобы подсветить лучшее предложение
function getLowestPrice(prices: Record<string, number | null>): number | null {
  const valid = Object.values(prices).filter((p): p is number => p != null && p > 0)
  return valid.length ? Math.min(...valid) : null
}

// Формат цены: 12000 → «12 000 ₽»
function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value)
}
</script>

<template>
  <div class="space-y-8">
    <!-- ── Заголовок ───────────────────────────────────────────────────────── -->
    <div class="space-y-5">
      <ProcessStepper :current="3" />
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Матрица цен и сплит</h1>
          <p class="mt-1 text-sm text-zinc-500">
            Сравните предложения поставщиков и рассчитайте самое выгодное распределение заказа.
          </p>
        </div>

        <!-- Выбор сессии -->
        <div class="flex items-center gap-2">
          <select
            v-model="selectedSessionId"
            class="field w-72"
            @change="loadMatrixForSession(selectedSessionId)"
          >
            <option :value="null">Демо-данные</option>
            <option v-for="s in sessions" :key="s.id" :value="s.id">#{{ s.id }} · {{ s.title }}</option>
          </select>
          <BaseButton
            v-if="selectedSessionId"
            variant="secondary"
            :icon="RefreshCw"
            :loading="isLoading"
            title="Обновить матрицу"
            @click="loadMatrixForSession(selectedSessionId)"
          />
        </div>
      </div>
    </div>

    <!-- ── Матрица цен ─────────────────────────────────────────────────────── -->
    <BaseCard
      title="Сводная матрица"
      :subtitle="`${filteredProducts.length} позиций · ${suppliers.length} поставщиков`"
      :padded="false"
    >
      <template #actions>
        <!-- Поиск -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input v-model="searchQuery" type="text" placeholder="Поиск по названию или SKU" class="field w-64 pl-9" />
        </div>
        <select v-model="selectedCategory" class="field w-40">
          <option value="">Все категории</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </template>

      <EmptyState
        v-if="filteredProducts.length === 0"
        :icon="SearchX"
        title="Ничего не найдено"
        hint="Попробуйте изменить запрос или сбросить фильтр категории."
      />

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm min-w-[720px]" :class="{ 'opacity-50': isLoading }">
          <thead>
            <tr class="text-left text-xs font-medium text-zinc-500 bg-zinc-50/60">
              <!-- Первая колонка «прилипает» к левому краю при горизонтальной прокрутке -->
              <th class="sticky left-0 z-10 px-6 py-3 font-medium bg-zinc-50 min-w-72">Шина</th>
              <th class="px-6 py-3 font-medium">Категория</th>
              <th v-for="sup in suppliers" :key="sup" class="px-6 py-3 font-medium text-right min-w-40">{{ sup }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100">
            <tr v-for="product in filteredProducts" :key="product.id" class="group hover:bg-zinc-50/70">
              <td class="sticky left-0 z-10 px-6 py-4 bg-white group-hover:bg-zinc-50">
                <p class="font-medium text-zinc-900">{{ product.name }}</p>
                <p class="mt-0.5 text-xs font-mono text-zinc-400">{{ product.sku }}</p>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded-md bg-zinc-100 text-xs text-zinc-600">{{ product.category }}</span>
              </td>
              <td v-for="sup in suppliers" :key="sup" class="px-6 py-4 text-right whitespace-nowrap">
                <!-- Лучшая цена — лаймовый бейдж со стрелкой вниз -->
                <span
                  v-if="product.supplierPrices[sup] != null && product.supplierPrices[sup] === getLowestPrice(product.supplierPrices)"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-100 font-mono font-semibold text-brand-800"
                  title="Лучшая цена"
                >
                  <TrendingDown class="w-3.5 h-3.5" :stroke-width="2.5" />
                  {{ formatCurrency(product.supplierPrices[sup]) }}
                </span>
                <span v-else class="font-mono tabular-nums text-zinc-600">
                  {{ formatCurrency(product.supplierPrices[sup]) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- ── Оптимизатор сплита и экспорт ────────────────────────────────────── -->
    <SplitOptimizer :session-id="selectedSessionId" />
  </div>
</template>
