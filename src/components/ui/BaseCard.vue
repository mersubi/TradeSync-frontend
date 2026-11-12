<!-- src/components/ui/BaseCard.vue
     Универсальная карточка — основной «строительный блок» всех экранов.
     Даёт единый вид: белый фон, скругление rounded-2xl, мягкая тень.
-->
<script setup lang="ts">
// ── Props ─────────────────────────────────────────────────────────────────────
// title / subtitle — необязательный заголовок карточки.
// padded — добавлять ли внутренние отступы (для таблиц удобно отключать,
//          чтобы таблица прилегала к краям карточки).
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    padded?: boolean
  }>(),
  { padded: true },
)
</script>

<template>
  <section class="bg-white rounded-2xl ring-1 ring-zinc-200/70 shadow-soft">
    <!-- Шапка карточки показывается, только если передан заголовок
         или заполнен слот actions (кнопки справа) -->
    <header
      v-if="title || $slots.actions"
      class="flex items-start justify-between gap-4 px-6 pt-5"
      :class="padded ? '' : 'pb-4 border-b border-zinc-100'"
    >
      <div>
        <h2 class="text-base font-semibold text-zinc-900">{{ title }}</h2>
        <p v-if="subtitle" class="mt-0.5 text-sm text-zinc-500">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0">
        <slot name="actions" />
      </div>
    </header>

    <!-- Основное содержимое карточки -->
    <div :class="padded ? 'p-6' : ''">
      <slot />
    </div>
  </section>
</template>

