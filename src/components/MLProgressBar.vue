<!-- src/components/MLProgressBar.vue -->
<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { Loader2, CheckCircle, AlertCircle } from '@lucide/vue'

const props = defineProps<{
  sessionId?: number | null
  autoConnect?: boolean
}>()

const emit = defineEmits<{
  (e: 'completed', sessionId?: number | null): void
}>()

const { progress, status, message, matchedItems, totalItems, connect, startMockProgress } = useWebSocket()

onMounted(() => {
  if (props.sessionId && props.autoConnect !== false) {
    connect(props.sessionId)
  }
})

watch(
  () => props.sessionId,
  (newId) => {
    if (newId) {
      connect(newId)
    }
  },
)

watch(status, (newStatus) => {
  if (newStatus === 'completed') {
    emit('completed', props.sessionId)
  }
})

// Цвет полосы прогресса в зависимости от статуса
const barColorClass = computed(() => {
  switch (status.value) {
    case 'error':
      return 'bg-red-500'
    case 'completed':
      return 'bg-emerald-500'
    case 'processing':
      return 'bg-blue-500'
    default:
      return 'bg-slate-700'
  }
})

// Текстовое описание текущего статуса
const statusText = computed(() => {
  if (message.value) return message.value
  switch (status.value) {
    case 'processing':
      return 'Обработка данных ML (Bi-Encoder + pgvector)...'
    case 'completed':
      return 'ML-сопоставление успешно завершено'
    case 'error':
      return 'Ошибка при обработке'
    default:
      return 'Ожидание запуска...'
  }
})
</script>

<template>
  <div class="w-full p-5 bg-slate-900/70 rounded-2xl shadow-lg border border-white/10">
    <!-- Блок заголовка: иконка статуса, текст и проценты -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-3">
        <Loader2
          v-if="status === 'processing'"
          class="w-5 h-5 text-blue-400 animate-spin"
        />
        <CheckCircle
          v-else-if="status === 'completed'"
          class="w-5 h-5 text-emerald-400"
        />
        <AlertCircle
          v-else-if="status === 'error'"
          class="w-5 h-5 text-red-400"
        />
        <div
          v-else
          class="w-5 h-5 rounded-full border-2 border-slate-600"
        ></div>

        <div>
          <span class="font-medium text-white text-sm">{{ statusText }}</span>
          <p v-if="totalItems > 0" class="text-xs text-slate-400">
            Сопоставлено: {{ matchedItems }} из {{ totalItems }} позиций
          </p>
        </div>
      </div>

      <span class="text-sm font-semibold text-blue-400 font-mono">{{ progress }}%</span>
    </div>

    <!-- Контейнер для прогресс-бара -->
    <div class="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :class="barColorClass"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Кнопки управления -->
    <div class="flex items-center justify-between gap-2">
      <span v-if="sessionId" class="text-xs text-slate-500 font-mono">
        Сессия #{{ sessionId }} (WS /api/v1/ws/procurement/{{ sessionId }})
      </span>
      <span v-else class="text-xs text-slate-500">Демо-режим прогресса</span>

      <button
        type="button"
        @click="sessionId ? connect(sessionId) : startMockProgress()"
        class="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        :disabled="status === 'processing'"
      >
        {{ sessionId ? 'Обновить WS' : 'Тест прогресса' }}
      </button>
    </div>
  </div>
</template>
