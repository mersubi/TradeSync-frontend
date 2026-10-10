<!-- src/components/SplitOptimizer.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
// Строго импортируем иконки только из @lucide/vue
import { DollarSign, TrendingDown, PieChart, ShoppingCart, Check, Download, FileSpreadsheet, FileJson } from '@lucide/vue'
// Импортируем сервис экспорта
import { ExportService } from '@/services/ExportService'

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
  split: SupplierSplit[]
}

// Моковые данные для матрицы сплит-оптимизатора
const summary = ref<OptimizerSummary>({
  totalCost: 250000,
  totalSavings: 35000,
  split: [
    { supplierName: 'Поставщик А', itemCount: 5, totalCost: 150000, colorClass: 'bg-indigo-500' },
    { supplierName: 'Поставщик Б', itemCount: 2, totalCost: 100000, colorClass: 'bg-emerald-500' }
  ]
})

const items = ref<PurchaseItem[]>([
  {
    id: 1,
    name: 'Michelin X-Ice North 4 205/55 R16',
    quantity: 10,
    selectedSupplier: 'Поставщик А',
    unitPrice: 8500,
    totalPrice: 85000
  },
  {
    id: 2,
    name: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    quantity: 4,
    selectedSupplier: 'Поставщик Б',
    unitPrice: 7000,
    totalPrice: 28000
  },
  {
    id: 3,
    name: 'Pirelli Ice Zero 2 225/45 R17',
    quantity: 4,
    selectedSupplier: 'Поставщик А',
    unitPrice: 12000,
    totalPrice: 48000
  },
  {
    id: 4,
    name: 'КиК КС740 6x16/5x114.3',
    quantity: 4,
    selectedSupplier: 'Поставщик А',
    unitPrice: 4250,
    totalPrice: 17000
  },
  {
    id: 5,
    name: 'Bridgestone Turanza T005 205/55 R16',
    quantity: 8,
    selectedSupplier: 'Поставщик Б',
    unitPrice: 9000,
    totalPrice: 72000
  }
])

// Вспомогательная функция для форматирования валюты (рубли)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value)
}

// Вычисляем процент сплита для визуального бара
const totalSplitCost = computed(() => {
  return summary.value.split.reduce((acc, curr) => acc + curr.totalCost, 0)
})

// Получаем цвет фона для бейджа поставщика в таблице
const getSupplierBadgeClass = (supplierName: string) => {
  const supplier = summary.value.split.find(s => s.supplierName === supplierName)
  // Используем прозрачные версии цветов из сплита
  if (supplier?.colorClass === 'bg-indigo-500') return 'bg-indigo-100 text-indigo-800 border-indigo-200'
  if (supplier?.colorClass === 'bg-emerald-500') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

// Функции для обработки экспорта
const handleExportExcel = () => {
  // Экспортируем только список элементов заказа в CSV (как имитацию Excel)
  ExportService.exportToExcel(items.value, 'optimization_results')
}

const handleExportJson = () => {
  // Экспортируем все данные: и сводку, и элементы заказа
  const exportData = {
    summary: summary.value,
    items: items.value
  }
  ExportService.exportToJson(exportData, 'optimization_results')
}
</script>

<template>
  <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto">
    <!-- Заголовок страницы и действия (Экспорт) -->
    <div class="flex items-center justify-between mb-2">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Матрица Сплит-Оптимизатора</h1>
        <p class="text-gray-500 mt-1">Результаты распределения заказа для достижения минимального чека</p>
      </div>
      
      <!-- Блок действий (кнопки экспорта) -->
      <div class="flex items-center gap-3">
        <button 
          @click="handleExportExcel"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <FileSpreadsheet class="w-4 h-4" />
          Скачать Excel
        </button>
        <button 
          @click="handleExportJson"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          <FileJson class="w-4 h-4" />
          Скачать JSON
        </button>
      </div>
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
        <div class="absolute right-0 top-0 opacity-5 w-24 h-24 transform translate-x-4 -translate-y-4">
          <TrendingDown class="w-full h-full" />
        </div>
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
        <div class="w-full h-3 rounded-full flex overflow-hidden mb-3">
          <div 
            v-for="part in summary.split" 
            :key="part.supplierName"
            :class="part.colorClass"
            :style="{ width: `${(part.totalCost / totalSplitCost) * 100}%` }"
            :title="`${part.supplierName}: ${formatCurrency(part.totalCost)}`"
          ></div>
        </div>
        
        <!-- Легенда -->
        <div class="flex items-center justify-between text-xs text-gray-600">
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
              <!-- Наименование -->
              <td class="py-4 px-6 text-sm font-medium text-gray-900">
                {{ item.name }}
              </td>
              
              <!-- Количество -->
              <td class="py-4 px-6 text-center text-sm text-gray-600">
                {{ item.quantity }} шт.
              </td>
              
              <!-- Победитель тендера для данной позиции -->
              <td class="py-4 px-6">
                <span 
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                  :class="getSupplierBadgeClass(item.selectedSupplier)"
                >
                  <Check class="w-3 h-3" />
                  {{ item.selectedSupplier }}
                </span>
              </td>
              
              <!-- Выделенная цена за штуку (победная цена) -->
              <td class="py-4 px-6 text-right">
                <div class="text-sm font-semibold text-emerald-600">
                  {{ formatCurrency(item.unitPrice) }}
                </div>
              </td>
              
              <!-- Итоговая сумма по позиции -->
              <td class="py-4 px-6 text-right text-sm font-medium text-gray-900">
                {{ formatCurrency(item.totalPrice) }}
              </td>
            </tr>
          </tbody>
          <!-- Итоговая строка таблицы -->
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
