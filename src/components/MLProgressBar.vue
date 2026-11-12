<!-- src/components/MLProgressBar.vue
     Живой индикатор ML-сопоставления. Получает прогресс с сервера
     по WebSocket (через композабл useWebSocket) и отображает его полосой.
-->
<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useWebSocket } from '@/composables/useWebSocket'
import { Loader2, CheckCircle2, AlertCircle, Cpu, RefreshCw } from '@lucide/vue'

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  sessionId?: number | null
  autoConnect?: boolean
}>()

const emit = defineEmits<{
  (e: 'completed', sessionId?: number | null): void
}>()

// Композабл возвращает реактивные переменные: при каждом сообщении
// от сервера они обновляются, и шаблон перерисовывается сам.
const { progress, status, message, matchedItems, totalItems, connect, startMockProgress } = useWebSocket()

// ── Подключение к WebSocket ───────────────────────────────────────────────────
onMounted(() => {
  if (props.sessionId && props.autoConnect !== false) connect(props.sessionId)
})

// Если родитель передал новую сессию — переподключаемся
watch(() => props.sessionId, (newId) => {
  if (newId) connect(newId)
})

// Сообщаем родителю, когда обработка завершилась
watch(status, (newStatus) => {
  if (newStatus === 'completed') emit('completed', props.sessionId)
})

// ── Цвет полосы по статусу ────────────────────────────────────────────────────
const barClass = computed(() => {
  switch (status.value) {
    case 'error':     return 'bg-rose-500'
    case 'completed': return 'bg-brand-500'
    default:          return 'bg-gradient-to-r from-brand-400 to-emerald-500'
  }
})

// ── Подпись текущего этапа ────────────────────────────────────────────────────
const statusText = computed(() => {
  if (message.value) return message.value
  switch (status.value) {
    case 'processing': return 'Нейросеть сопоставляет позиции с каталогом…'
    case 'completed':  return 'Сопоставление завершено'
    case 'error':      return 'Ошибка при обработке'
    default:           return 'Ожидание запуска'
  }
})
</script>

<template>
  <div class="p-5 bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft">
    <div class="flex items-center justify-between gap-4 mb-4">
      <div class="flex items-center gap-3 min-w-0">
        <!-- Иконка статуса -->
        <div class="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-zinc-100">
          <Loader2      v-if="status === 'processing'"     class="w-5 h-5 text-brand-600 animate-spin" />
          <CheckCircle2 v-else-if="status === 'completed'" class="w-5 h-5 text-brand-600" />
          <AlertCircle  v-else-if="status === 'error'"     class="w-5 h-5 text-rose-500" />
          <Cpu          v-else                             class="w-5 h-5 text-zinc-400" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-zinc-900 truncate">{{ statusText }}</p>
          <p v-if="totalItems > 0" class="text-xs text-zinc-500">
            Сопоставлено <span class="font-mono">{{ matchedItems }}</span> из
            <span class="font-mono">{{ totalItems }}</span>
          </p>
        </div>
      </div>
      <span class="text-2xl font-semibold font-mono tabular-nums text-zinc-900">{{ progress }}%</span>
    </div>

    <!-- Полоса прогресса: ширина задаётся напрямую из процента -->
    <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :class="barClass"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <div class="flex items-center justify-between gap-2 mt-4">
      <span class="text-xs font-mono text-zinc-400">
        {{ sessionId ? `WebSocket · сессия #${sessionId}` : 'Демо-режим' }}
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900
               disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        :disabled="status === 'processing'"
        @click="sessionId ? connect(sessionId) : startMockProgress()"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        {{ sessionId ? 'Переподключить' : 'Тест прогресса' }}
      </button>
    </div>
  </div>
</template>
