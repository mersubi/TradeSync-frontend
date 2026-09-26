<!-- src/views/MatrixView.vue -->
<script setup lang="ts">
// Заглушка матрицы цен — будет заменена реальным компонентом
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-64 gap-3 text-center">
    <div class="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
      <svg class="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    </div>
    <h1 class="text-xl font-semibold text-white">Матрица цен</h1>
    <p class="text-slate-400 text-sm max-w-xs">Интерактивная матрица ценообразования по поставщикам и категориям.</p>
  </div>
</template>
