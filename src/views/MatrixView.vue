<!-- src/views/MatrixView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { procurementApi } from '@/api/procurement'
import type { ProcurementSessionResponse, SupplierResponse } from '@/api/procurement'
import SplitOptimizer from '@/components/SplitOptimizer.vue'
import {
  Table as TableIcon,
  Search,
  Filter,
  TrendingDown,
  Building2,
  Layers,
  RefreshCw,
} from '@lucide/vue'

// ── Типизация данных матрицы цен ──────────────────────────────────────────────
export interface ProductMatrixItem {
  id: string
  name: string
  sku: string
  category: string
  supplierPrices: Record<string, number | null>
}

// ── Список сессий и выбранная сессия с бэкенда ───────────────────────────────
const sessions = ref<ProcurementSessionResponse[]>([])
const selectedSessionId = ref<number | null>(null)
const isLoading = ref(false)

// ── Дефолтные поставщики и товары (если сессия еще не выбрана) ────────────────
const defaultSuppliers = [
  'Поставщик А (ШинИнвест)',
  'Поставщик Б (АвтоШинаОпт)',
]

const defaultProducts: ProductMatrixItem[] = [
  {
    id: 'TIRE-001',
    name: 'Michelin X-Ice North 4 205/55 R16 94T XL',
    sku: 'MICHELIN-XIN4-205-55-R16',
    category: 'Зимние шины',
    supplierPrices: {
      'Поставщик А (ШинИнвест)': 8500,
      'Поставщик Б (АвтоШинаОпт)': 8900,
    },
  },
  {
    id: 'TIRE-002',
    name: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    sku: 'NOKIAN-HKPL10P-185-65-R15',
    category: 'Зимние шины',
    supplierPrices: {
      'Поставщик А (ШинИнвест)': 7350,
      'Поставщик Б (АвтоШинаОпт)': 7000,
    },
  },
  {
    id: 'TIRE-003',
    name: 'Pirelli Ice Zero 2 225/45 R17 94T XL',
    sku: 'PIRELLI-IZ2-225-45-R17',
    category: 'Зимние шины',
    supplierPrices: {
      'Поставщик А (ШинИнвест)': 12000,
      'Поставщик Б (АвтоШинаОпт)': 12450,
    },
  },
  {
    id: 'TIRE-004',
    name: 'Bridgestone Turanza T005 205/55 R16 91V',
    sku: 'BRIDGESTONE-T005-205-55-R16',
    category: 'Летние шины',
    supplierPrices: {
      'Поставщик А (ШинИнвест)': 9400,
      'Поставщик Б (АвтоШинаОпт)': 9000,
    },
  },
]

const suppliers = ref<string[]>([...defaultSuppliers])
const products = ref<ProductMatrixItem[]>([...defaultProducts])
const backendSuppliersMap = ref<Map<number, string>>(new Map())

// Построение сводной матрицы цен по данным выбранной сессии с бэкенда
async function loadMatrixForSession(sessionId: number | null) {
  if (!sessionId) {
    suppliers.value = [...defaultSuppliers]
    products.value = [...defaultProducts]
    return
  }

  isLoading.value = true
  try {
    const detail = await procurementApi.getSessionDetails(sessionId)
    const offers = detail.raw_offer_items || []
    if (offers.length === 0) {
      suppliers.value = [...defaultSuppliers]
      products.value = [...defaultProducts]
      return
    }

    const supSet = new Set<string>()
    const productMap = new Map<string, ProductMatrixItem>()

    for (const offer of offers) {
      const supName =
        (offer.supplier_id && backendSuppliersMap.value.get(offer.supplier_id)) ||
        (offer.supplier_id ? `Поставщик #${offer.supplier_id}` : 'Прайс-лист сессии')
      supSet.add(supName)

      const key = offer.matched_tire?.sku || offer.raw_name
      const existing = productMap.get(key) || {
        id: String(offer.matched_tire_id || offer.id),
        name: offer.matched_tire?.sku || offer.raw_name,
        sku: offer.supplier_article || `TIRE-${offer.matched_tire_id || offer.id}`,
        category: offer.matched_tire ? `R${offer.matched_tire.diameter_inch}` : 'Каталог шин',
        supplierPrices: {},
      }

      const prevPrice = existing.supplierPrices[supName]
      if (prevPrice === undefined || prevPrice === null || offer.price < prevPrice) {
        existing.supplierPrices[supName] = offer.price
      }
      productMap.set(key, existing)
    }

    suppliers.value = Array.from(supSet)
    products.value = Array.from(productMap.values())
  } catch {
    suppliers.value = [...defaultSuppliers]
    products.value = [...defaultProducts]
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const [sessList, supList] = await Promise.all([
      procurementApi.listSessions(0, 50),
      procurementApi.listSuppliers(),
    ])
    sessions.value = sessList
    const map = new Map<number, string>()
    supList.forEach((s: SupplierResponse) => map.set(s.id, s.name))
    backendSuppliersMap.value = map

    if (sessList.length > 0) {
      selectedSessionId.value = sessList[0].id
      await loadMatrixForSession(sessList[0].id)
    }
  } catch {
    // Используем демо-данные, если сервер недоступен
  }
})

// ── Фильтры и поиск ───────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedSupplier = ref('')

const categories = computed(() => {
  const set = new Set(products.value.map((p) => p.category))
  return Array.from(set)
})

function getLowestPrice(supplierPrices: Record<string, number | null>): number | null {
  const validPrices = Object.values(supplierPrices).filter(
    (price): price is number => price !== null && price > 0,
  )
  if (validPrices.length === 0) return null
  return Math.min(...validPrices)
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

const filteredProducts = computed(() => {
  return products.value.filter((item) => {
    const matchesSearch =
      searchQuery.value.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesCategory =
      selectedCategory.value === '' || item.category === selectedCategory.value

    const matchesSupplier =
      selectedSupplier.value === '' ||
      (item.supplierPrices[selectedSupplier.value] !== null &&
        item.supplierPrices[selectedSupplier.value] !== undefined)

    return matchesSearch && matchesCategory && matchesSupplier
  })
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-10">
    <!-- Заголовок страницы и выбор сессии -->
    <div class="border-b border-white/8 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <TableIcon class="w-5 h-5 text-purple-400" :stroke-width="1.75" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Матрица цен и Сплит-Оптимизатор</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Сводная таблица цен поставщиков, расчет MILP-распределения и экспорт в 1С CommerceML
          </p>
        </div>
      </div>

      <!-- Выбор закупочной сессии -->
      <div class="flex items-center gap-2.5">
        <select
          v-model="selectedSessionId"
          @change="loadMatrixForSession(selectedSessionId)"
          class="bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <option :value="null">Демо-данные матрицы</option>
          <option v-for="sess in sessions" :key="sess.id" :value="sess.id">
            Сессия #{{ sess.id }}: {{ sess.title }} ({{ sess.status }})
          </option>
        </select>

        <button
          v-if="selectedSessionId"
          type="button"
          @click="loadMatrixForSession(selectedSessionId)"
          :disabled="isLoading"
          class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer"
          title="Обновить матрицу"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Панель фильтров и поиска -->
    <div class="bg-slate-900/60 border border-white/8 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      <div class="relative w-full md:w-80">
        <Search
          class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          :stroke-width="2"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по названию или SKU..."
          class="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
        />
      </div>

      <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
        <div class="relative w-full sm:w-56">
          <select
            v-model="selectedCategory"
            class="w-full appearance-none bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
          >
            <option value="">Все категории</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
          <Layers class="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div class="relative w-full sm:w-64">
          <select
            v-model="selectedSupplier"
            class="w-full appearance-none bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
          >
            <option value="">Все поставщики</option>
            <option v-for="supplier in suppliers" :key="supplier" :value="supplier">
              {{ supplier }}
            </option>
          </select>
          <Building2 class="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Сводная таблица матрицы цен -->
    <div class="bg-slate-900/60 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr class="border-b border-white/8 bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th
                scope="col"
                class="py-4 px-6 sticky left-0 z-20 bg-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-white/5 min-w-[280px]"
              >
                Товар / SKU
              </th>
              <th scope="col" class="py-4 px-6 min-w-[140px]">Категория</th>

              <th
                v-for="supplier in suppliers"
                :key="supplier"
                scope="col"
                class="py-4 px-6 text-right min-w-[180px]"
              >
                <div class="flex items-center justify-end gap-1.5">
                  <span class="truncate" :title="supplier">{{ supplier }}</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-white/5 text-sm">
            <tr
              v-for="product in filteredProducts"
              :key="product.id"
              class="hover:bg-white/[0.02] transition-colors group"
            >
              <td
                class="py-4 px-6 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-850 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-white/5"
              >
                <div class="min-w-0">
                  <p class="font-medium text-white group-hover:text-purple-300 transition-colors">
                    {{ product.name }}
                  </p>
                  <p class="text-xs font-mono text-slate-500 mt-0.5">
                    {{ product.sku }}
                  </p>
                </div>
              </td>

              <td class="py-4 px-6 text-slate-400 whitespace-nowrap text-xs">
                <span class="px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                  {{ product.category }}
                </span>
              </td>

              <td
                v-for="supplier in suppliers"
                :key="supplier"
                class="py-4 px-6 text-right whitespace-nowrap"
              >
                <template v-if="product.supplierPrices[supplier] !== null && product.supplierPrices[supplier] !== undefined">
                  <div class="flex items-center justify-end gap-1.5">
                    <span
                      v-if="product.supplierPrices[supplier] === getLowestPrice(product.supplierPrices)"
                      class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      title="Лучшая цена"
                    >
                      <TrendingDown class="w-3 h-3" :stroke-width="2.5" />
                      <span>{{ formatCurrency(product.supplierPrices[supplier]) }}</span>
                    </span>

                    <span
                      v-else
                      class="text-slate-300 font-mono text-xs"
                    >
                      {{ formatCurrency(product.supplierPrices[supplier]) }}
                    </span>
                  </div>
                </template>

                <span v-else class="text-slate-600 font-mono text-xs">
                  —
                </span>
              </td>
            </tr>

            <tr v-if="filteredProducts.length === 0">
              <td :colspan="2 + suppliers.length" class="py-12 px-6 text-center text-slate-400">
                <div class="flex flex-col items-center justify-center space-y-2">
                  <Filter class="w-8 h-8 text-slate-600 mb-1" :stroke-width="1.5" />
                  <p class="text-base font-semibold text-white">Товары не найдены</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Компонент SplitOptimizer, подключенный к выбранной сессии -->
    <SplitOptimizer :session-id="selectedSessionId" />
  </div>
</template>
