<!-- src/App.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import MainLayout from '@/components/MainLayout.vue'

// ── Определяем, нужна ли обёртка лэйаута ─────────────────────────────────────
const route = useRoute()
const auth  = useAuthStore()

// Показываем MainLayout только для аутентифицированных пользователей,
// находящихся не на странице входа
const useLayout = computed(
  () => auth.isAuthenticated && route.name !== 'Login',
)
</script>

<template>
  <!-- Если пользователь аутентифицирован — оборачиваем в лэйаут -->
  <MainLayout v-if="useLayout" />

  <!-- Иначе (страница входа / незалогинен) — рендерим роут напрямую -->
  <RouterView v-else />
</template>
