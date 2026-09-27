<!-- src/views/ValidationView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ListFilter,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Eye,
  Inbox,
  UploadCloud,
  FileSpreadsheet,
} from '@lucide/vue'

const router = useRouter()

// ── Типизация задачи валидации ────────────────────────────────────────────────
export type ValidationStatus = 'pending' | 'processing' | 'mapped' | 'error'

export interface ValidationTask {
  id: string
  supplierName: string
  filename: string
  uploadDate: string
  status: ValidationStatus
  itemsCount: number
}

// ── Моковые данные очереди валидации ──────────────────────────────────────────
const tasks = ref<ValidationTask[]>([
  {
    id: 'TSK-1001',
    supplierName: 'ООО "Северсталь Дистрибуция"',
    filename: 'severstal_metal_q3_2026.xlsx',
    uploadDate: '27.09.2026, 14:30',
    status: 'pending',
    itemsCount: 1420,
  },
  {
    id: 'TSK-1002',
    supplierName: 'ПАО "Мечел Торг"',
    filename: 'mechel_pipes_prices.csv',
    uploadDate: '27.09.2026, 15:12',
    status: 'processing',
    itemsCount: 850,
  },
  {
    id: 'TSK-1003',
    supplierName: 'АО "Трубная Промышленная Компания"',
    filename: 'tpk_valves_fitting_v2.xlsx',
    uploadDate: '26.09.2026, 18:45',
    status: 'mapped',
    itemsCount: 320,
  },
  {
    id: 'TSK-1004',
    supplierName: 'ООО "ПромКомплектПоставка"',
    filename: 'prom_prices_corrupted.xls',
    uploadDate: '26.09.2026, 11:20',
    status: 'error',
    itemsCount: 0,
  },
  {
    id: 'TSK-1005',
    supplierName: 'ТД "Металл-Холдинг"',
    filename: 'metall_holding_september.xlsx',
    uploadDate: '25.09.2026, 16:05',
    status: 'mapped',
    itemsCount: 2190,
  },
])

// ── Конфигурация отображения статусов ────────────────────────────────────────
interface StatusConfig {
  label: string
  badgeClass: string
  icon: any
  iconClass: string
  isSpinning?: boolean
}

const statusConfigs: Record<ValidationStatus, StatusConfig> = {
  pending: {
    label: 'Ожидает маппинга',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: Clock,
    iconClass: 'text-amber-400',
  },
  processing: {
    label: 'Обработка',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Loader2,
    iconClass: 'text-blue-400',
    isSpinning: true,
  },
  mapped: {
    label: 'Смапплен',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
  },
  error: {
    label: 'Ошибка формата',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: AlertCircle,
    iconClass: 'text-red-400',
  },
}

// ── Обработчики действий над строками ─────────────────────────────────────────
function handleConfigureMapping(task: ValidationTask) {
  // Заглушка перехода к конфигурации маппинга столбцов
  console.log(`Настройка маппинга для задачи: ${task.id}`)
}

function handleViewDetails(task: ValidationTask) {
  // Заглушка перехода к просмотру обработанных данных
  console.log(`Просмотр данных для задачи: ${task.id}`)
}

function navigateToUpload() {
  router.push('/upload')
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- ── Заголовок страницы ───────────────────────────────────────────────── -->
    <div class="border-b border-white/8 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <ListFilter class="w-5 h-5 text-amber-400" :stroke-width="1.75" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Очередь валидации</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Контроль и сопоставление структуры загруженных прайс-листов
          </p>
        </div>
      </div>

      <!-- Кнопка загрузки нового файла -->
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        @click="navigateToUpload"
      >
        <UploadCloud class="w-4 h-4" :stroke-width="2" />
        <span>Загрузить прайс-лист</span>
      </button>
    </div>

    <!-- ── Таблица задач ────────────────────────────────────────────────────── -->
    <div v-if="tasks.length > 0" class="bg-slate-900/60 border border-white/8 rounded-2xl overflow-hidden shadow-xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-white/8 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th scope="col" class="py-3.5 px-6">ID Задачи</th>
              <th scope="col" class="py-3.5 px-6">Поставщик</th>
              <th scope="col" class="py-3.5 px-6">Файл</th>
              <th scope="col" class="py-3.5 px-6">Дата загрузки</th>
              <th scope="col" class="py-3.5 px-6">Статус</th>
              <th scope="col" class="py-3.5 px-6 text-right">Действие</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-sm">
            <tr
              v-for="task in tasks"
              :key="task.id"
              class="hover:bg-white/[0.02] transition-colors"
            >
              <!-- ID задачи -->
              <td class="py-4 px-6 font-mono text-xs text-slate-400 whitespace-nowrap">
                {{ task.id }}
              </td>

              <!-- Поставщик -->
              <td class="py-4 px-6 font-medium text-white whitespace-nowrap">
                {{ task.supplierName }}
              </td>

              <!-- Файл и количество позиций -->
              <td class="py-4 px-6">
                <div class="flex items-center gap-2">
                  <FileSpreadsheet class="w-4 h-4 text-slate-400 shrink-0" :stroke-width="1.75" />
                  <div class="min-w-0">
                    <p class="text-slate-200 truncate max-w-xs" :title="task.filename">
                      {{ task.filename }}
                    </p>
                    <p v-if="task.itemsCount > 0" class="text-xs text-slate-500">
                      {{ task.itemsCount }} позиций
                    </p>
                  </div>
                </div>
              </td>

              <!-- Дата загрузки -->
              <td class="py-4 px-6 text-slate-400 whitespace-nowrap text-xs">
                {{ task.uploadDate }}
              </td>

              <!-- Статус задачи с бейджем -->
              <td class="py-4 px-6 whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  :class="statusConfigs[task.status].badgeClass"
                >
                  <component
                    :is="statusConfigs[task.status].icon"
                    class="w-3.5 h-3.5 shrink-0"
                    :class="[
                      statusConfigs[task.status].iconClass,
                      { 'animate-spin': statusConfigs[task.status].isSpinning },
                    ]"
                    :stroke-width="2"
                  />
                  <span>{{ statusConfigs[task.status].label }}</span>
                </span>
              </td>

              <!-- Действия -->
              <td class="py-4 px-6 text-right whitespace-nowrap">
                <!-- Кнопка «Настроить маппинг» для ожидающих и ошибочных -->
                <button
                  v-if="task.status === 'pending' || task.status === 'error'"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                  @click="handleConfigureMapping(task)"
                >
                  <SlidersHorizontal class="w-3.5 h-3.5" :stroke-width="1.75" />
                  <span>Настроить маппинг</span>
                </button>

                <!-- Кнопка «Посмотреть» для смаппленных файлов -->
                <button
                  v-else-if="task.status === 'mapped'"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  @click="handleViewDetails(task)"
                >
                  <Eye class="w-3.5 h-3.5 text-slate-400" :stroke-width="1.75" />
                  <span>Посмотреть</span>
                </button>

                <!-- Индикатор в процессе обработки -->
                <span
                  v-else-if="task.status === 'processing'"
                  class="text-xs text-slate-500 italic"
                >
                  Обработка...
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Пустое состояние (Empty State) ──────────────────────────────────── -->
    <div
      v-else
      class="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 border border-white/8 rounded-2xl space-y-4"
    >
      <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
        <Inbox class="w-8 h-8" :stroke-width="1.5" />
      </div>
      <div class="space-y-1">
        <h3 class="text-base font-semibold text-white">Очередь валидации пуста</h3>
        <p class="text-sm text-slate-400 max-w-sm">
          На данный момент нет файлов, ожидающих проверки. Загрузите новый прайс-лист для начала работы.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        @click="navigateToUpload"
      >
        <UploadCloud class="w-4 h-4" :stroke-width="2" />
        <span>Загрузить прайс-лист</span>
      </button>
    </div>
  </div>
</template>
