<!-- src/views/ValidationView.vue
     Шаг 2 процесса: проверка результатов ML-сопоставления.
     Слева — список сессий, справа — прогресс обработки и таблица «Светофор».
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { procurementApi } from '@/api/procurement'
import type { ProcurementSessionResponse } from '@/api/procurement'
import { sessionStatusMeta, formatShortDate } from '@/utils/sessionStatus'
import MLProgressBar from '@/components/MLProgressBar.vue'
import MatchingTable from '@/components/MatchingTable.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProcessStepper from '@/components/ui/ProcessStepper.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { UploadCloud, RefreshCw, ArrowRight, Inbox, AlertCircle } from '@lucide/vue'

const router = useRouter()
const route  = useRoute()

// ── Состояние ─────────────────────────────────────────────────────────────────
const sessions        = ref<ProcurementSessionResponse[]>([])
const selectedSession = ref<ProcurementSessionResponse | null>(null)
const isLoading       = ref(false)
const errorMessage    = ref<string | null>(null)

// ── Загрузка списка сессий ────────────────────────────────────────────────────
// Вызывается при открытии страницы и после каждого изменения в таблице
// (исправление, утверждение), чтобы статусы и счётчики были актуальны.
async function fetchSessions() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const list = await procurementApi.listSessions(0, 50)
    sessions.value = list

    // 1) Если пришли со ссылкой ?session_id=5 — выбираем эту сессию
    const querySessionId = Number(route.query.session_id)
    const fromQuery = querySessionId ? list.find((s) => s.id === querySessionId) : undefined
    // 2) Иначе обновляем данные уже выбранной сессии
    const current = list.find((s) => s.id === selectedSession.value?.id)
    // 3) Иначе выбираем первую сессию в списке
    selectedSession.value = current ?? fromQuery ?? list[0] ?? null
  } catch (err: any) {
    errorMessage.value = err?.response?.data?.detail || 'Не удалось загрузить список сессий'
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchSessions)

// Выбор сессии + обновление адреса страницы (чтобы ссылкой можно было поделиться)
function selectSession(s: ProcurementSessionResponse) {
  selectedSession.value = s
  router.replace({ query: { session_id: String(s.id) } })
}

function goToMatrix() {
  router.push({ path: '/matrix', query: { session_id: String(selectedSession.value?.id) } })
}
</script>

<template>
  <div class="space-y-8">
    <!-- ── Заголовок ───────────────────────────────────────────────────────── -->
    <div class="space-y-5">
      <ProcessStepper :current="2" />
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">ML-валидация</h1>
          <p class="mt-1 text-sm text-zinc-500">
            Проверьте, правильно ли модель сопоставила позиции прайса с каталогом.
          </p>
        </div>
        <div class="flex gap-2">
          <BaseButton variant="secondary" :icon="RefreshCw" :loading="isLoading" @click="fetchSessions">Обновить</BaseButton>
          <BaseButton
            v-if="selectedSession?.status === 'APPROVED'"
            :icon="ArrowRight"
            @click="goToMatrix"
          >
            К матрице цен
          </BaseButton>
        </div>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-sm text-rose-700 ring-1 ring-rose-200"
    >
      <AlertCircle class="w-4 h-4" /> {{ errorMessage }}
    </p>

    <div class="grid gap-6 xl:grid-cols-[280px_1fr]">
      <!-- ═════════════ СПИСОК СЕССИЙ ═════════════ -->
      <aside class="space-y-2">
        <p class="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">Сессии</p>

        <div
          v-if="!isLoading && sessions.length === 0"
          class="bg-white rounded-2xl ring-1 ring-zinc-200/70"
        >
          <EmptyState :icon="Inbox" title="Нет сессий" hint="Сначала загрузите прайс-лист.">
            <BaseButton size="sm" :icon="UploadCloud" @click="router.push('/upload')">Загрузить</BaseButton>
          </EmptyState>
        </div>

        <!-- Карточка сессии; выбранная выделена тёмным фоном -->
        <button
          v-for="s in sessions"
          :key="s.id"
          type="button"
          class="w-full p-4 text-left rounded-2xl transition-all cursor-pointer"
          :class="
            selectedSession?.id === s.id
              ? 'bg-zinc-900 text-white shadow-lg'
              : 'bg-white ring-1 ring-zinc-200/70 hover:ring-zinc-300'
          "
          @click="selectSession(s)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold truncate">{{ s.title }}</p>
            <span class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold" :class="sessionStatusMeta[s.status]?.cls">
              {{ sessionStatusMeta[s.status]?.label ?? s.status }}
            </span>
          </div>
          <div
            class="flex items-center justify-between mt-2 text-xs"
            :class="selectedSession?.id === s.id ? 'text-zinc-400' : 'text-zinc-500'"
          >
            <span class="font-mono">#{{ s.id }} · {{ s.matched_items }}/{{ s.total_items }}</span>
            <span>{{ formatShortDate(s.created_at) }}</span>
          </div>
        </button>
      </aside>

      <!-- ═════════════ ПРОГРЕСС И ТАБЛИЦА ═════════════ -->
      <div class="space-y-6 min-w-0">
        <!-- Прогресс показываем только пока сессия обрабатывается -->
        <MLProgressBar
          v-if="selectedSession && (selectedSession.status === 'PENDING' || selectedSession.status === 'PROCESSING')"
          :session-id="selectedSession.id"
          @completed="fetchSessions"
        />

        <MatchingTable
          :session-id="selectedSession?.id ?? null"
          :session-status="selectedSession?.status"
          @updated="fetchSessions"
          @approved="fetchSessions"
        />
      </div>
    </div>
  </div>
</template>
