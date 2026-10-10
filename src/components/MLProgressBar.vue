<!-- src/components/MLProgressBar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { Loader2, CheckCircle, AlertCircle } from '@lucide/vue'

const { progress, status, startMockProgress } = useWebSocket()

// Вычисляемое свойство для определения цвета полосы прогресса в зависимости от статуса
const barColorClass = computed(() => {
  switch (status.value) {
    case 'error':
      return 'bg-red-500'
    case 'completed':
      return 'bg-emerald-500'
    case 'processing':
      return 'bg-blue-500'
    default:
      return 'bg-gray-300'
  }
})

// Вычисляемое свойство для текстового описания текущего статуса
const statusText = computed(() => {
  switch (status.value) {
    case 'processing':
      return 'Обработка данных ML...'
    case 'completed':
      return 'Обработка успешно завершена'
    case 'error':
      return 'Ошибка при обработке'
    default:
      return 'Ожидание запуска...'
  }
})
</script>

<template>
  <div class="w-full max-w-xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
    <!-- Блок заголовка: иконка статуса, текст и проценты -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <!-- Показываем крутилку при обработке -->
        <Loader2 
          v-if="status === 'processing'" 
          class="w-5 h-5 text-blue-500 animate-spin" 
        />
        <!-- Галочка при успешном завершении -->
        <CheckCircle 
          v-else-if="status === 'completed'" 
          class="w-5 h-5 text-emerald-500" 
        />
        <!-- Значок ошибки при сбое -->
        <AlertCircle 
          v-else-if="status === 'error'" 
          class="w-5 h-5 text-red-500" 
        />
        <!-- Серый круглый контур для состояния ожидания -->
        <div 
          v-else 
          class="w-5 h-5 rounded-full border-2 border-gray-300"
        ></div>
        
        <span class="font-medium text-gray-700">{{ statusText }}</span>
      </div>
      
      <!-- Текст с текущим процентом прогресса -->
      <span class="text-sm font-semibold text-gray-500">{{ progress }}%</span>
    </div>

    <!-- Контейнер для прогресс-бара -->
    <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-6">
      <!-- Заполняющаяся часть бара с плавной анимацией ширины и цвета -->
      <div 
        class="h-full rounded-full transition-all duration-500 ease-out"
        :class="barColorClass"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Кнопка-заглушка для ручного запуска тестирования UI -->
    <div class="flex justify-end">
      <button 
        @click="startMockProgress"
        class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="status === 'processing'"
      >
        Тест прогресса
      </button>
    </div>
  </div>
</template>

