<!-- src/components/ui/ConfidenceBadge.vue
     Бейдж «Светофор» — показывает уверенность ML-модели в сопоставлении.
       > 85%   — зелёный (лайм): можно доверять автоматически
       60–85%  — жёлтый (янтарь): желательно проверить
       < 60%   — красный (коралл): нужна ручная проверка
     Сами пороги описаны в src/utils/confidence.ts.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { getConfidenceLevel, formatPercent } from '@/utils/confidence'

// score — уверенность модели от 0 до 1 (например, 0.92 = 92%)
const props = defineProps<{
  score?: number | null
}>()

// computed пересчитывается автоматически, когда меняется props.score —
// поэтому бейдж сам перекрашивается после ручной правки в Active Learning.
const level = computed(() => getConfidenceLevel(props.score))

// Словарь стилей для каждого уровня (классы записаны полностью,
// чтобы Tailwind нашёл их при сборке)
const styles = {
  high:   { badge: 'bg-lime-100 text-lime-800',   dot: 'bg-lime-500' },
  medium: { badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  low:    { badge: 'bg-rose-100 text-rose-700',   dot: 'bg-rose-500' },
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
    :class="styles[level].badge"
  >
    <span class="w-1.5 h-1.5 rounded-full" :class="styles[level].dot" />
    <span class="font-mono tabular-nums">{{ formatPercent(score) }}</span>
  </span>
</template>
