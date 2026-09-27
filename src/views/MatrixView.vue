<!-- src/views/MatrixView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Table as TableIcon,
  Search,
  Filter,
  TrendingDown,
  Building2,
  Package,
  Layers,
  ArrowUpDown,
} from '@lucide/vue'

// ── Типизация данных матрицы цен ──────────────────────────────────────────────
export interface ProductMatrixItem {
  id: string
  name: string
  sku: string
  category: string
  supplierPrices: Record<string, number | null>
}

// ── Список поставщиков для колонок ────────────────────────────────────────────
const suppliers = ref<string[]>([
  'ООО "Северсталь Дистрибуция"',
  'ПАО "Мечел Торг"',
  'АО "Трубная Промышленная Компания"',
])

// ── Моковые данные товаров и цен ──────────────────────────────────────────────
const products = ref<ProductMatrixItem[]>([
  {
    id: 'PRD-001',
    name: 'Труба бесшовная 57х3.5 мм ст.20',
    sku: 'TRB-57-35-ST20',
    category: 'Трубный прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 64500,
      'ПАО "Мечел Торг"': 63200,
      'АО "Трубная Промышленная Компания"': 65100,
    },
  },
  {
    id: 'PRD-002',
    name: 'Арматура рифленая А500С d=12 мм',
    sku: 'ARM-A500C-12',
    category: 'Сортовой прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 48900,
      'ПАО "Мечел Торг"': 49400,
      'АО "Трубная Промышленная Компания"': 48100,
    },
  },
  {
    id: 'PRD-003',
    name: 'Лист горячекатаный 4.0х1500х6000 ст3сп',
    sku: 'LST-GK-4-1500',
    category: 'Листовой прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 56300,
      'ПАО "Мечел Торг"': 55800,
      'АО "Трубная Промышленная Компания"': 57200,
    },
  },
  {
    id: 'PRD-004',
    name: 'Балка двутавровая 20Б1 ст3пс',
    sku: 'BLK-20B1-ST3',
    category: 'Фасонный прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 72000,
      'ПАО "Мечел Торг"': 73100,
      'АО "Трубная Промышленная Компания"': 71500,
    },
  },
  {
    id: 'PRD-005',
    name: 'Уголок равнополочный 50х50х5 мм',
    sku: 'UGL-50-50-5',
    category: 'Фасонный прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 51200,
      'ПАО "Мечел Торг"': 50800,
      'АО "Трубная Промышленная Компания"': null, // Нет в наличии у поставщика
    },
  },
  {
    id: 'PRD-006',
    name: 'Швеллер 16П горячекатаный',
    sku: 'SHV-16P-GK',
    category: 'Фасонный прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 68400,
      'ПАО "Мечел Торг"': 67900,
      'АО "Трубная Промышленная Компания"': 69200,
    },
  },
  {
    id: 'PRD-007',
    name: 'Труба профильная 40х40х2 мм',
    sku: 'TRB-PRF-40-40-2',
    category: 'Трубный прокат',
    supplierPrices: {
      'ООО "Северсталь Дистрибуция"': 59800,
      'ПАО "Мечел Торг"': 58500,
      'АО "Трубная Промышленная Компания"': 58100,
    },
  },
])

// ── Фильтры и поиск ───────────────────────────────────────────────────────────
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedSupplier = ref('')

// Список уникальных категорий для выпадающего списка
const categories = computed(() => {
  const set = new Set(products.value.map((p) => p.category))
  return Array.from(set)
})

// ── Поиск минимальной цены для конкретного товара ────────────────────────────
function getLowestPrice(supplierPrices: Record<string, number | null>): number | null {
  const validPrices = Object.values(supplierPrices).filter(
    (price): price is number => price !== null && price > 0,
  )
  if (validPrices.length === 0) return null
  return Math.min(...validPrices)
}

// ── Форматирование цены (валюта / пробелы тысяч) ──────────────────────────────
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

// ── Вычисляемый отфильтрованный список продуктов ──────────────────────────────
const filteredProducts = computed(() => {
  return products.value.filter((item) => {
    // Фильтр по поисковому запросу (название или SKU)
    const matchesSearch =
      searchQuery.value.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.value.toLowerCase())

    // Фильтр по категории
    const matchesCategory =
      selectedCategory.value === '' || item.category === selectedCategory.value

    // Фильтр по поставщику (наличие цены у выбранного поставщика)
    const matchesSupplier =
      selectedSupplier.value === '' ||
      (item.supplierPrices[selectedSupplier.value] !== null &&
        item.supplierPrices[selectedSupplier.value] !== undefined)

    return matchesSearch && matchesCategory && matchesSupplier
  })
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- ── Заголовок страницы ───────────────────────────────────────────────── -->
    <div class="border-b border-white/8 pb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
          <TableIcon class="w-5 h-5 text-purple-400" :stroke-width="1.75" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Матрица цен</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Сводная таблица цен от всех поставщиков с автоматическим определением лучшего предложения
          </p>
        </div>
      </div>
    </div>

    <!-- ── Панель фильтров и поиска ─────────────────────────────────────────── -->
    <div class="bg-slate-900/60 border border-white/8 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      <!-- Поле поиска -->
      <div class="relative w-full md:w-80">
        <Search
          class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          :stroke-width="2"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по названию или SKU..."
          class="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
      </div>

      <!-- Селекты фильтрации -->
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
        <!-- Фильтр по категории -->
        <div class="relative w-full sm:w-56">
          <select
            v-model="selectedCategory"
            class="w-full appearance-none bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all cursor-pointer"
          >
            <option value="">Все категории</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
          <Layers class="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <!-- Фильтр по поставщику -->
        <div class="relative w-full sm:w-64">
          <select
            v-model="selectedSupplier"
            class="w-full appearance-none bg-slate-800 border border-white/10 rounded-xl px-4 py-2 pr-10 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all cursor-pointer"
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

    <!-- ── Сводная таблица матрицы цен ──────────────────────────────────────── -->
    <div class="bg-slate-900/60 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr class="border-b border-white/8 bg-slate-900/90 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <!-- Фиксированная колонка: Товар и SKU -->
              <th
                scope="col"
                class="py-4 px-6 sticky left-0 z-20 bg-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)] border-r border-white/5 min-w-[280px]"
              >
                Товар / SKU
              </th>
              <th scope="col" class="py-4 px-6 min-w-[150px]">Категория</th>

              <!-- Динамические колонки поставщиков -->
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
              <!-- Фиксированная первая колонка -->
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

              <!-- Категория -->
              <td class="py-4 px-6 text-slate-400 whitespace-nowrap text-xs">
                <span class="px-2.5 py-1 rounded-md bg-white/5 border border-white/5">
                  {{ product.category }}
                </span>
              </td>

              <!-- Цены поставщиков -->
              <td
                v-for="supplier in suppliers"
                :key="supplier"
                class="py-4 px-6 text-right whitespace-nowrap"
              >
                <template v-if="product.supplierPrices[supplier] !== null && product.supplierPrices[supplier] !== undefined">
                  <div class="flex items-center justify-end gap-1.5">
                    <!-- Бейдж лучшей (минимальной) цены -->
                    <span
                      v-if="product.supplierPrices[supplier] === getLowestPrice(product.supplierPrices)"
                      class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      title="Лучшая цена"
                    >
                      <TrendingDown class="w-3 h-3" :stroke-width="2.5" />
                      <span>{{ formatCurrency(product.supplierPrices[supplier]) }}</span>
                    </span>

                    <!-- Стандартное отображение обычной цены -->
                    <span
                      v-else
                      class="text-slate-300 font-mono text-xs"
                    >
                      {{ formatCurrency(product.supplierPrices[supplier]) }}
                    </span>
                  </div>
                </template>

                <!-- Если цена отсутствует -->
                <span v-else class="text-slate-600 font-mono text-xs">
                  —
                </span>
              </td>
            </tr>

            <!-- Если ничего не найдено по фильтрам -->
            <tr v-if="filteredProducts.length === 0">
              <td :colspan="2 + suppliers.length" class="py-12 px-6 text-center text-slate-400">
                <div class="flex flex-col items-center justify-center space-y-2">
                  <Filter class="w-8 h-8 text-slate-600 mb-1" :stroke-width="1.5" />
                  <p class="text-base font-semibold text-white">Товары не найдены</p>
                  <p class="text-xs text-slate-500 max-w-sm">
                    Попробуйте изменить параметры поиска или сбросить фильтры по категориям и поставщикам.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
