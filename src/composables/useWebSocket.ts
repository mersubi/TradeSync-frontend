// src/composables/useWebSocket.ts
import { ref, onUnmounted } from 'vue'

export type ProgressStatus = 'idle' | 'processing' | 'completed' | 'error'

export function useWebSocket() {
  // Реактивные переменные для отслеживания состояния обработки на бэкенде
  const progress = ref(0)
  const status = ref<ProgressStatus>('idle')
  const message = ref<string>('')
  const matchedItems = ref<number>(0)
  const totalItems = ref<number>(0)

  let ws: WebSocket | null = null
  let mockInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Подключение к реальному WebSocket бэкенда:
   * WS /api/v1/ws/procurement/{session_id}?token=<JWT>
   */
  const connect = (sessionId: number, token?: string | null) => {
    disconnect()

    const jwtToken = token || localStorage.getItem('ts_token') || ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws/procurement/${sessionId}?token=${encodeURIComponent(jwtToken)}`

    try {
      status.value = 'processing'
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket подключен к сессии:', sessionId)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error) {
            status.value = 'error'
            message.value = data.error
            return
          }

          // Бэкенд отправляет progress_percent (0..100) или progress
          if (data.progress_percent !== undefined) {
            progress.value = Math.round(Number(data.progress_percent))
          } else if (data.progress !== undefined) {
            progress.value = Math.round(Number(data.progress))
          }

          if (data.matched_items !== undefined) {
            matchedItems.value = Number(data.matched_items)
          }
          if (data.total_items !== undefined) {
            totalItems.value = Number(data.total_items)
          }
          if (data.message) {
            message.value = data.message
          }

          // Преобразование статусов бэкенда (PENDING, PROCESSING, COMPLETED, APPROVED, FAILED)
          const rawStatus = String(data.status || '').toUpperCase()
          if (rawStatus === 'COMPLETED' || rawStatus === 'APPROVED') {
            progress.value = 100
            status.value = 'completed'
          } else if (rawStatus === 'FAILED' || rawStatus === 'ERROR') {
            status.value = 'error'
          } else if (rawStatus === 'PROCESSING' || rawStatus === 'PENDING') {
            status.value = 'processing'
          }
        } catch (e) {
          console.error('Ошибка парсинга сообщения от WebSocket:', e)
        }
      }

      ws.onerror = (error) => {
        console.warn('Ошибка WebSocket соединения:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket соединение закрыто')
      }
    } catch (e) {
      status.value = 'error'
      console.error('Не удалось инициализировать WebSocket:', e)
    }
  }

  // Очистка ресурсов и закрытие соединения
  const disconnect = () => {
    if (ws) {
      ws.close()
      ws = null
    }
    if (mockInterval) {
      clearInterval(mockInterval)
      mockInterval = null
    }
  }

  // Мок-функция для UI-тестирования без запущенного воркера
  const startMockProgress = () => {
    disconnect()
    status.value = 'processing'
    progress.value = 0
    message.value = 'Тестовая имитация ML-обработки...'

    mockInterval = setInterval(() => {
      progress.value += Math.floor(Math.random() * 15) + 10
      if (progress.value >= 100) {
        progress.value = 100
        status.value = 'completed'
        message.value = 'Обработка успешно завершена'
        clearInterval(mockInterval!)
        mockInterval = null
      }
    }, 400)
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    progress,
    status,
    message,
    matchedItems,
    totalItems,
    connect,
    disconnect,
    startMockProgress,
  }
}
