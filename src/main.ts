// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from './App.vue'
import './style.css'

const pinia = createPinia()
const app = createApp(App)

// Pinia must be installed BEFORE the router so that navigation guards can
// access stores via useAuthStore() inside beforeEach.
app.use(pinia)
app.use(router)

// ── Handle 401 Unauthorized events from the Axios interceptor ──────────────
// The Axios client dispatches 'tradesync:unauthorized' to avoid a circular
// dependency (client → router). We handle it here at the app root instead.
window.addEventListener('tradesync:unauthorized', async () => {
  const { useAuthStore } = await import('@/store/authStore')
  const auth = useAuthStore()
  auth.forceLogout()
  await router.push({ name: 'Login' })
})

app.mount('#app')
