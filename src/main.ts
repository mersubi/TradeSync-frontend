// src/main.ts
// ─────────────────────────────────────────────────────────────────────────────
// Точка входа клиентского приложения TradeSync.
// Инициализирует экземпляр Vue, подключает хранилище Pinia, маршрутизатор
// Vue Router и глобальные стили Tailwind CSS.
// ─────────────────────────────────────────────────────────────────────────────
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/store/authStore'
import App from './App.vue'
import './style.css'

const pinia = createPinia()
const app = createApp(App)

// Pinia подключается ДО маршрутизатора, чтобы навигационный гард (beforeEach)
// мог обращаться к хранилищу авторизации useAuthStore().
app.use(pinia)
app.use(router)

// ── Обработка истечения сессии (HTTP 401 Unauthorized) ───────────────────────
// Axios-клиент генерирует событие 'tradesync:unauthorized', чтобы избежать
// циклической зависимости (client → router). Перехватываем его здесь и
// возвращаем пользователя на экран входа.
window.addEventListener('tradesync:unauthorized', async () => {
  const auth = useAuthStore()
  auth.forceLogout()
  await router.push({ name: 'Login' })
})

app.mount('#app')
