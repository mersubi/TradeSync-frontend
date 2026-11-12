<!-- src/views/LoginView.vue
     Страница входа и регистрации.
     Слева — форма, справа — лаймовая панель с кратким описанием продукта.
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/authStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import { ArrowLeftRight, AlertCircle, Sparkles, Calculator, FileOutput } from '@lucide/vue'

const auth   = useAuthStore()
const router = useRouter()
const route  = useRoute()

// ── Состояние формы ───────────────────────────────────────────────────────────
// isRegisterMode переключает форму между «Вход» и «Регистрация»
const isRegisterMode = ref(false)
const email          = ref('')
const password       = ref('')

// ── Отправка формы на бэкенд (/auth/login или /auth/register) ─────────────────
async function handleSubmit() {
  try {
    if (isRegisterMode.value) {
      await auth.register(email.value, password.value)
    } else {
      await auth.login(email.value, password.value)
    }
    // После входа возвращаем пользователя туда, куда он шёл до логина
    const redirectPath = (route.query.redirect as string) || '/'
    await router.push(redirectPath)
  } catch {
    // Текст ошибки уже записан в auth.error и показывается в шаблоне
  }
}

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
  auth.error = null
}

// ── Тестовые аккаунты бэкенда (создаются скриптом scripts/seed_db.py) ─────────
const seedCredentials = [
  { email: 'admin@taires.com', password: 'admin123', role: 'Администратор' },
  { email: 'buyer@taires.com', password: 'buyer123', role: 'Закупщик' },
]

function fillCredentials(cred: { email: string; password: string }) {
  isRegisterMode.value = false
  email.value    = cred.email
  password.value = cred.password
}

// ── Преимущества продукта для правой панели ───────────────────────────────────
const features = [
  { icon: Sparkles,   title: 'ML-сопоставление',  text: 'Нейросеть сама находит эталонную шину для каждой строки прайса.' },
  { icon: Calculator, title: 'Оптимальный сплит', text: 'Алгоритм MILP распределяет заказ между поставщиками по минимальной цене.' },
  { icon: FileOutput, title: 'Экспорт в 1С',      text: 'Готовая спецификация в CommerceML XML, Excel или JSON.' },
]
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-white">
    <!-- ═════════════ ЛЕВАЯ ЧАСТЬ: ФОРМА ═════════════ -->
    <div class="flex flex-col justify-center px-6 py-12 sm:px-16">
      <div class="w-full max-w-sm mx-auto">
        <!-- Логотип -->
        <div class="flex items-center gap-3 mb-12">
          <div class="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-400">
            <ArrowLeftRight class="w-5 h-5 text-zinc-950" :stroke-width="2.5" />
          </div>
          <span class="text-lg font-semibold tracking-tight text-zinc-900">TradeSync</span>
        </div>

        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">
          {{ isRegisterMode ? 'Создайте аккаунт' : 'С возвращением' }}
        </h1>
        <p class="mt-2 text-sm text-zinc-500">
          {{ isRegisterMode ? 'Регистрация займёт меньше минуты.' : 'Войдите, чтобы продолжить работу с закупками.' }}
        </p>

        <form class="mt-8 space-y-4" novalidate @submit.prevent="handleSubmit">
          <div>
            <label for="email" class="block mb-1.5 text-sm font-medium text-zinc-700">Электронная почта</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="buyer@taires.com"
              class="field"
              :disabled="auth.isLoading"
            />
          </div>

          <div>
            <label for="password" class="block mb-1.5 text-sm font-medium text-zinc-700">Пароль</label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="field"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Сообщение об ошибке от сервера -->
          <div
            v-if="auth.error"
            role="alert"
            class="flex items-start gap-2 p-3 rounded-xl bg-rose-50 text-sm text-rose-700 ring-1 ring-rose-200"
          >
            <AlertCircle class="w-4 h-4 mt-0.5 shrink-0" />
            {{ auth.error }}
          </div>

          <BaseButton
            id="login-submit-btn"
            type="submit"
            class="w-full"
            :loading="auth.isLoading"
            :disabled="!email || !password"
          >
            {{ isRegisterMode ? 'Зарегистрироваться' : 'Войти' }}
          </BaseButton>
        </form>

        <p class="mt-6 text-sm text-center text-zinc-500">
          {{ isRegisterMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?' }}
          <button type="button" class="font-semibold text-brand-700 hover:underline cursor-pointer" @click="toggleMode">
            {{ isRegisterMode ? 'Войти' : 'Зарегистрироваться' }}
          </button>
        </p>

        <!-- Быстрый вход тестовыми аккаунтами (удобно для демонстрации) -->
        <div class="mt-10 pt-6 border-t border-zinc-100">
          <p class="mb-3 text-xs font-medium text-zinc-400">Тестовые аккаунты — нажмите, чтобы подставить</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="cred in seedCredentials"
              :key="cred.email"
              type="button"
              class="p-3 rounded-xl text-left ring-1 ring-zinc-200 hover:ring-brand-400 hover:bg-brand-50
                     transition cursor-pointer"
              @click="fillCredentials(cred)"
            >
              <p class="text-xs font-semibold text-zinc-900">{{ cred.role }}</p>
              <p class="mt-0.5 text-[11px] font-mono text-zinc-500 truncate">{{ cred.email }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═════════════ ПРАВАЯ ЧАСТЬ: О ПРОДУКТЕ ═════════════ -->
    <div class="hidden lg:flex p-4">
      <div class="relative flex flex-col justify-between w-full p-12 rounded-3xl overflow-hidden bg-zinc-950">
        <!-- Декоративное лаймовое свечение -->
        <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-400/30 blur-3xl pointer-events-none" />
        <div class="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div class="relative">
          <span class="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-brand-400 text-zinc-950">
            B2B закупки шин
          </span>
          <h2 class="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white">
            От прайс-листа<br />до заказа в 1С —<br /><span class="text-brand-400">за минуты.</span>
          </h2>
        </div>

        <ul class="relative space-y-5">
          <li v-for="f in features" :key="f.title" class="flex gap-4">
            <div class="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-white/10">
              <component :is="f.icon" class="w-5 h-5 text-brand-400" :stroke-width="1.9" />
            </div>
            <div>
              <p class="text-sm font-semibold text-white">{{ f.title }}</p>
              <p class="mt-0.5 text-sm text-zinc-400">{{ f.text }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
