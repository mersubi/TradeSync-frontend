<!-- src/views/UploadView.vue -->
<script setup lang="ts">
// Заглушка загрузки данных — доступна только роли Operator
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-64 gap-3 text-center">
    <div class="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
      <svg class="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
    </div>
    <h1 class="text-xl font-semibold text-white">Загрузка данных</h1>
    <p class="text-slate-400 text-sm max-w-xs">Раздел для загрузки прайс-листов и данных закупок. Доступен только операторам.</p>
  </div>
</template>
