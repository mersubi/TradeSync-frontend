<!-- src/views/LoginView.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/authStore'

// ── Зависимости ───────────────────────────────────────────────────────────────
const auth   = useAuthStore()
const router = useRouter()

// ── Состояние формы ───────────────────────────────────────────────────────────
const email    = ref('')
const password = ref('')

// ── Отправка формы ────────────────────────────────────────────────────────────
async function handleSubmit() {
  try {
    await auth.login(email.value, password.value)
    // После успешной авторизации переходим на дашборд
    await router.push('/')
  } catch {
    // Ошибка уже записана в auth.error — отображаем её в шаблоне
  }
}

// ── Тестовые аккаунты (только для разработки) ────────────────────────────────
const mockCredentials = [
  { email: 'operator@tradesync.io', role: 'Operator' },
  { email: 'manager@tradesync.io',  role: 'Manager'  },
  { email: 'admin@tradesync.io',    role: 'Admin'    },
]

// Быстрое заполнение полей тестовыми данными
function fillCredentials(cred: { email: string }) {
  email.value    = cred.email
  password.value = 'password'
}
</script>

<template>
  <!-- Полноэкранный контейнер с градиентным фоном -->
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">

    <!-- Фоновые декоративные элементы -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
    </div>

    <!-- Карточка формы входа -->
    <div class="relative w-full max-w-md">

      <!-- Логотип и заголовок -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/40 mb-4">
          <!-- Иконка логотипа TradeSync -->
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M3 12h18M3 17h18" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 3v18M17 3v18" opacity="0.5" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white tracking-tight">TradeSync</h1>
        <p class="text-slate-400 text-sm mt-1">Система управления закупками B2B</p>
      </div>

      <!-- Форма входа -->
      <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
        <h2 class="text-lg font-semibold text-white mb-6">Войти в систему</h2>

        <form @submit.prevent="handleSubmit" class="space-y-5" novalidate>

          <!-- Поле Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-slate-300 mb-1.5">
              Электронная почта
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              required
              placeholder="you@tradesync.io"
              class="w-full px-4 py-2.5 rounded-lg bg-white/8 border border-white/15 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50
                     transition-all duration-200 text-sm"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Поле пароля -->
          <div>
            <label for="password" class="block text-sm font-medium text-slate-300 mb-1.5">
              Пароль
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              class="w-full px-4 py-2.5 rounded-lg bg-white/8 border border-white/15 text-white placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500/70 focus:border-blue-500/50
                     transition-all duration-200 text-sm"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Блок ошибки (отображается при неверных данных) -->
          <Transition name="fade-slide">
            <div
              v-if="auth.error"
              class="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-sm"
              role="alert"
            >
              <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ auth.error }}
            </div>
          </Transition>

          <!-- Кнопка входа -->
          <button
            id="login-submit-btn"
            type="submit"
            :disabled="auth.isLoading || !email || !password"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
                   bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed
                   text-white font-semibold text-sm tracking-wide
                   shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40
                   transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            <!-- Индикатор загрузки -->
            <svg v-if="auth.isLoading" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            {{ auth.isLoading ? 'Вход...' : 'Войти' }}
          </button>
        </form>
      </div>

      <!-- Тестовые аккаунты для разработчиков -->
      <div class="mt-5 bg-white/4 border border-white/8 rounded-xl p-4">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Тестовые аккаунты (пароль: <code class="text-slate-400">password</code>)
        </p>
        <div class="space-y-1.5">
          <button
            v-for="cred in mockCredentials"
            :key="cred.email"
            type="button"
            @click="fillCredentials(cred)"
            class="w-full flex items-center justify-between px-3 py-2 rounded-lg
                   bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15
                   transition-all duration-150 group cursor-pointer"
          >
            <span class="text-slate-300 text-xs font-mono">{{ cred.email }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="{
                'bg-emerald-500/20 text-emerald-400': cred.role === 'Operator',
                'bg-amber-500/20 text-amber-400':    cred.role === 'Manager',
                'bg-purple-500/20 text-purple-400':  cred.role === 'Admin',
              }"
            >
              {{ cred.role }}
            </span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Плавная анимация появления сообщения об ошибке */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Тонкий стеклянный фон для полей ввода */
input[type='email'],
input[type='password'] {
  background-color: rgb(255 255 255 / 0.05);
}
input[type='email']:focus,
input[type='password']:focus {
  background-color: rgb(255 255 255 / 0.08);
}
</style>
