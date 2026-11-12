<!-- src/components/ui/BaseButton.vue
     Единая кнопка приложения. Вариант (variant) определяет цвет,
     флаг loading показывает спиннер и блокирует повторное нажатие.
-->
<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Loader2 } from '@lucide/vue'

// ── Props ─────────────────────────────────────────────────────────────────────
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    loading?: boolean
    disabled?: boolean
    icon?: Component            // иконка из @lucide/vue слева от текста
    type?: 'button' | 'submit'
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

// ── Словарь стилей ────────────────────────────────────────────────────────────
// Классы записаны целиком (а не склеиваются строкой вида `bg-${color}-400`),
// потому что Tailwind находит используемые классы простым поиском по тексту
// файлов — «склеенные» классы он не увидит и не сгенерирует.
const variantClasses = {
  primary:   'bg-brand-400 text-zinc-950 hover:bg-brand-300 shadow-sm shadow-brand-500/30',
  secondary: 'bg-white text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-50',
  ghost:     'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger:    'bg-rose-500 text-white hover:bg-rose-600',
}

const sizeClasses = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

// computed пересобирает строку классов, только когда меняются props
const classes = computed(() => [variantClasses[props.variant], sizeClasses[props.size]])
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap
           transition-colors duration-150 cursor-pointer
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
           disabled:opacity-50 disabled:cursor-not-allowed"
    :class="classes"
  >
    <!-- Во время загрузки вместо иконки показываем вращающийся спиннер -->
    <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
    <component :is="icon" v-else-if="icon" class="w-4 h-4" :stroke-width="2" />
    <slot />
  </button>
</template>

