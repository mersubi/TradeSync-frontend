// src/composables/useWebSocket.ts
import { ref, onUnmounted } from 'vue'

export function useWebSocket(url: string = 'ws://localhost:8000/api/v1/ws/progress') {
  // Реактивные переменные для отслеживания состояния
  const progress = ref(0)
  const status = ref<'idle' | 'processing' | 'completed' | 'error'>('idle')
  
  let ws: WebSocket | null = null
  let mockInterval: ReturnType<typeof setInterval> | null = null

  // Функция для подключения к реальному WebSocket (задел на будущее)
  const connect = () => {
    try {
      ws = new WebSocket(url)

      ws.onopen = () => {
        // Подключение успешно установлено
        console.log('WebSocket подключен:', url)
      }

      ws.onmessage = (event) => {
        try {
          // Парсим входящие сообщения, ожидаем формат { "progress": 45, "status": "processing" }
          const data = JSON.parse(event.data)
          
          if (data.progress !== undefined) {
            progress.value = data.progress
          }
          if (data.status !== undefined) {
            status.value = data.status
          }
        } catch (e) {
          console.error('Ошибка парсинга сообщения от WebSocket:', e)
        }
      }

      ws.onerror = (error) => {
        status.value = 'error'
        console.error('Ошибка WebSocket соединения:', error)
      }

      ws.onclose = () => {
        // Соединение закрыто
        console.log('WebSocket соединение закрыто')
      }
    } catch (e) {
      status.value = 'error'
      console.error('Не удалось инициализировать WebSocket:', e)
    }
  }

  // Функция для очистки ресурсов и закрытия соединения
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

  // Мок-функция для UI тестирования
  const startMockProgress = () => {
    // Сбрасываем начальное состояние
    status.value = 'processing'
    progress.value = 0
    
    // Очищаем предыдущий интервал, если он есть
    if (mockInterval) {
      clearInterval(mockInterval)
    }
    
    // Имитируем получение данных от сервера
    mockInterval = setInterval(() => {
      // Увеличиваем прогресс на случайное значение от 10 до 20
      progress.value += Math.floor(Math.random() * 10) + 10
      
      if (progress.value >= 100) {
        progress.value = 100
        status.value = 'completed'
        clearInterval(mockInterval!)
        mockInterval = null
      }
    }, 500)
  }

  // Очистка при уничтожении компонента
  onUnmounted(() => {
    disconnect()
  })

  return {
    progress,
    status,
    connect,
    disconnect,
    startMockProgress
  }
}

