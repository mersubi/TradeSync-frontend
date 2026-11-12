<!-- src/components/ui/ProcessStepper.vue
     Полоса шагов бизнес-процесса закупки:
       1. Загрузка прайса → 2. ML-валидация → 3. Матрица и сплит → 4. Экспорт в 1С
     Показывается вверху рабочих экранов, чтобы закупщик всегда видел,
     на каком он этапе и что его ждёт дальше.
-->
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Check } from '@lucide/vue'

// current — номер текущего шага (1–4)
defineProps<{
  current: 1 | 2 | 3 | 4
}>()

// Шаги процесса. Экспорт выполняется на экране матрицы, поэтому ведёт туда же.
const steps = [
  { n: 1, label: 'Загрузка прайса', to: '/upload' },
  { n: 2, label: 'ML-валидация',    to: '/validation' },
  { n: 3, label: 'Матрица и сплит', to: '/matrix' },
  { n: 4, label: 'Экспорт в 1С',    to: '/matrix' },
]
</script>

<template>
  <nav aria-label="Шаги процесса закупки" class="flex items-center gap-2 overflow-x-auto">
    <template v-for="(step, i) in steps" :key="step.n">
      <RouterLink
        :to="step.to"
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors"
        :class="
          step.n === current
            ? 'bg-zinc-900 text-white'                          /* текущий шаг   */
            : step.n < current
              ? 'text-zinc-700 hover:bg-zinc-100'               /* пройденный    */
              : 'text-zinc-400 hover:bg-zinc-100'               /* будущий       */
        "
      >
        <!-- Кружок с номером шага; у пройденных шагов — галочка -->
        <span
          class="flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold"
          :class="
            step.n === current
              ? 'bg-brand-400 text-zinc-950'
              : step.n < current
                ? 'bg-brand-100 text-brand-700'
                : 'bg-zinc-100 text-zinc-400'
          "
        >
          <Check v-if="step.n < current" class="w-3 h-3" :stroke-width="3" />
          <template v-else>{{ step.n }}</template>
        </span>
        {{ step.label }}
      </RouterLink>

      <!-- Соединительная линия между шагами -->
      <span
        v-if="i < steps.length - 1"
        class="h-px w-6 shrink-0"
        :class="step.n < current ? 'bg-brand-400' : 'bg-zinc-200'"
      />
    </template>
  </nav>
</template>

