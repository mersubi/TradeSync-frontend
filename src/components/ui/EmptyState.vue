<!-- src/components/ui/EmptyState.vue
     «Пустое состояние» — показывается, когда данных ещё нет.
     Вместо пустой таблицы пользователь видит иконку, понятное объяснение
     и подсказку, что делать дальше (через слот можно добавить кнопку).
-->
<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component   // иконка из @lucide/vue
  title: string     // короткий заголовок: «Сессий пока нет»
  hint?: string     // подсказка: «Загрузите первый прайс-лист…»
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center py-14 px-6">
    <div class="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 ring-1 ring-brand-200 mb-4">
      <component :is="icon" class="w-6 h-6 text-brand-600" :stroke-width="1.75" />
    </div>
    <h3 class="text-sm font-semibold text-zinc-900">{{ title }}</h3>
    <p v-if="hint" class="mt-1 max-w-sm text-sm text-zinc-500">{{ hint }}</p>
    <!-- Слот для кнопки действия, например «Загрузить прайс» -->
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>

