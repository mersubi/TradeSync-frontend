import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    // Настройка прокси для перехвата запросов к /auth
    // Все пути начинающиеся на /auth будут перенаправлены на локальный бэкенд FastAPI
    proxy: {
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
