<!-- src/components/MatchingTable.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { CheckCircle, AlertTriangle, XCircle, Info, Send } from '@lucide/vue'

// Тип для результатов сопоставления с кандидатами
interface MatchingResult {
  id: number
  originalSupplierItem: string
  systemMatchCandidate: string
  candidates: string[]
  confidenceScore: number
}

// Начальное состояние моковых данных для таблицы
const initialData: MatchingResult[] = [
  {
    id: 1,
    originalSupplierItem: 'Шина Michelin X-Ice North 4 205/55 R16',
    systemMatchCandidate: 'Michelin X-Ice North 4 205/55 R16 94T XL (шипованная)',
    candidates: [
      'Michelin X-Ice North 4 205/55 R16 94T XL (шипованная)',
      'Michelin X-Ice North 4 205/55 R16 91T',
      'Michelin X-Ice 3 205/55 R16'
    ],
    confidenceScore: 95
  },
  {
    id: 2,
    originalSupplierItem: 'Nokian Hakkapeliitta 10p 185/65 R15',
    systemMatchCandidate: 'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
    candidates: [
      'Nokian Tyres Hakkapeliitta 10p 185/65 R15',
      'Nokian Tyres Hakkapeliitta 9 185/65 R15',
      'Nokian Nordman 8 185/65 R15'
    ],
    confidenceScore: 88
  },
  {
    id: 3,
    originalSupplierItem: 'Pirelli Ice Zero 2 225/45',
    systemMatchCandidate: 'Pirelli Ice Zero 2 225/45 R17 94T XL',
    candidates: [
      'Pirelli Ice Zero 2 225/45 R17 94T XL',
      'Pirelli Ice Zero 2 225/45 R18 95T XL',
      'Pirelli Scorpion Ice Zero 2 225/45 R17'
    ],
    confidenceScore: 72
  },
  {
    id: 4,
    originalSupplierItem: 'Диск литой R16 5x114.3',
    systemMatchCandidate: 'КиК КС740 (16_Solaris) 6x16/5x114.3 D54.1 ET43',
    candidates: [
      'КиК КС740 (16_Solaris) 6x16/5x114.3 D54.1 ET43',
      'Скад KL-294 6.5x16/5x114.3 D67.1 ET45',
      'Tech-Line 615 6.5x16/5x114.3 D66.1 ET40',
      'Вручную: нет совпадений'
    ],
    confidenceScore: 61
  },
  {
    id: 5,
    originalSupplierItem: 'Резина Летняя Bridgestone',
    systemMatchCandidate: 'Bridgestone Turanza T005 205/55 R16 91V',
    candidates: [
      'Bridgestone Turanza T005 205/55 R16 91V',
      'Bridgestone Potenza Sport 225/45 R17',
      'Bridgestone Alenza 001 215/60 R17',
      'Вручную: нет совпадений'
    ],
    confidenceScore: 45
  },
  {
    id: 6,
    originalSupplierItem: 'Колесо',
    systemMatchCandidate: 'Неизвестная модель',
    candidates: [
      'Неизвестная модель',
      'Уточнить у поставщика',
      'Пропустить'
    ],
    confidenceScore: 12
  }
]

// Глубокое копирование начальных данных для реактивности
const mockData = ref<MatchingResult[]>(JSON.parse(JSON.stringify(initialData)))
const isSubmitting = ref(false)
const showSuccessAlert = ref(false)

// Вспомогательная функция для определения статуса (цвета) на основе оценки
const getScoreStatus = (score: number) => {
  if (score > 85) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

// Вспомогательная функция для получения классов строки таблицы
const getRowClass = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high':
      return 'bg-emerald-50/50 hover:bg-emerald-100/50'
    case 'medium':
      return 'bg-amber-50/50 hover:bg-amber-100/50'
    case 'low':
      return 'bg-rose-50/50 hover:bg-rose-100/50'
  }
}

// Вспомогательная функция для получения классов бейджа с оценкой
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

// Вспомогательная функция для получения иконки статуса
const getStatusIcon = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high': return CheckCircle
    case 'medium': return AlertTriangle
    case 'low': return XCircle
  }
}

// Вспомогательная функция для получения цвета иконки
const getIconColorClass = (score: number) => {
  const status = getScoreStatus(score)
  switch (status) {
    case 'high': return 'text-emerald-500'
    case 'medium': return 'text-amber-500'
    case 'low': return 'text-rose-500'
  }
}

// Вычисляемое свойство для поиска изменённых строк пользователем
const changedItems = computed(() => {
  return mockData.value.filter((current, index) => {
    return current.systemMatchCandidate !== initialData[index].systemMatchCandidate
  })
})

// Функция для имитации отправки данных (Active Learning)
const submitCorrections = () => {
  if (changedItems.value.length === 0) return

  isSubmitting.value = true

  // Имитация задержки сети
  setTimeout(() => {
    console.log('Отправка исправленных данных для дообучения ML (Active Learning):')
    changedItems.value.forEach(item => {
      console.log(`- ID ${item.id}: "${item.originalSupplierItem}" -> Новое совпадение: "${item.systemMatchCandidate}"`)
    })

    // Обновляем "исходные данные" чтобы сбросить счетчик изменений
    changedItems.value.forEach(item => {
      const originalItem = initialData.find(i => i.id === item.id)
      if (originalItem) {
        originalItem.systemMatchCandidate = item.systemMatchCandidate
      }
    })

    isSubmitting.value = false
    showSuccessAlert.value = true

    // Скрываем алерт успеха через 3 секунды
    setTimeout(() => {
      showSuccessAlert.value = false
    }, 3000)
  }, 1000)
}
</script>

<template>
  <div class="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
    <!-- Заголовок таблицы -->
    <div class="p-6 border-b border-gray-200 bg-gray-50/50">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Результаты сопоставления ML (Traffic Light)</h2>
          <p class="mt-1 text-sm text-gray-500">
            Оценка уверенности алгоритма: <span class="text-emerald-600 font-medium">>85% (Высокая)</span>, 
            <span class="text-amber-600 font-medium">60-85% (Средняя)</span>, 
            <span class="text-rose-600 font-medium"><60% (Низкая)</span>
          </p>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Оповещение об успешной отправке -->
          <transition enter-active-class="transition ease-out duration-300" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-200" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
            <span v-if="showSuccessAlert" class="text-sm font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle class="w-4 h-4" /> Исправления отправлены
            </span>
          </transition>
          
          <!-- Кнопка Active Learning -->
          <button 
            @click="submitCorrections"
            :disabled="changedItems.length === 0 || isSubmitting"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            <Send v-if="!isSubmitting" class="w-4 h-4" />
            <svg v-else class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Отправить исправления {{ changedItems.length > 0 ? `(${changedItems.length})` : '' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Таблица -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            <th class="py-3 px-6 w-12 text-center">Статус</th>
            <th class="py-3 px-6">Товар поставщика (Оригинал)</th>
            <th class="py-3 px-6 w-1/3">Кандидат в нашей системе</th>
            <th class="py-3 px-6 text-center w-32">Уверенность</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr 
            v-for="item in mockData" 
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
            </td>
            
            <!-- Кандидат в системе (Active Learning UI) -->
            <td class="py-4 px-6">
              <!-- Если уверенность высокая (>85), показываем обычный текст -->
              <div v-if="item.confidenceScore > 85" class="text-sm text-gray-700">
                {{ item.systemMatchCandidate }}
              </div>
              
              <!-- Иначе показываем выпадающий список (Select) для корректировки -->
              <div v-else class="flex flex-col gap-1">
                <select 
                  v-model="item.systemMatchCandidate"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-700 bg-white"
                  :class="{ 'border-indigo-300 bg-indigo-50': item.systemMatchCandidate !== initialData.find(i => i.id === item.id)?.systemMatchCandidate }"
                >
                  <option v-for="candidate in item.candidates" :key="candidate" :value="candidate">
                    {{ candidate }}
                  </option>
                </select>
                <div class="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Info class="w-3 h-3 text-amber-500" v-if="item.confidenceScore >= 60" />
                  <Info class="w-3 h-3 text-rose-500" v-else />
                  <span>Пожалуйста, подтвердите или выберите правильный вариант</span>
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
