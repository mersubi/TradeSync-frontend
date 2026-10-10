// src/services/ExportService.ts

/**
 * Сервис для экспорта данных в различные форматы.
 */
export const ExportService = {
  /**
   * Экспортирует данные в формате JSON и инициирует скачивание файла.
   * 
   * @param data Любые данные для экспорта
   * @param filename Имя выходного файла (без расширения)
   */
  exportToJson(data: any, filename: string) {
    // Преобразуем данные в строку JSON с красивым форматированием
    const jsonString = JSON.stringify(data, null, 2)
    
    // Создаем Blob объект с типом application/json
    const blob = new Blob([jsonString], { type: 'application/json' })
    
    // Вызываем вспомогательную функцию для скачивания
    this.downloadBlob(blob, `${filename}.json`)
  },

  /**
   * Имитирует экспорт в Excel, генерируя CSV файл и инициируя его скачивание.
   * В реальном проекте здесь можно использовать библиотеки вроде xlsx или exceljs.
   * 
   * @param data Массив объектов для экспорта
   * @param filename Имя выходного файла (без расширения)
   */
  exportToExcel(data: any[], filename: string) {
    if (!data || !data.length) {
      console.warn('Нет данных для экспорта в Excel/CSV')
      return
    }

    // Извлекаем заголовки (ключи первого объекта)
    const headers = Object.keys(data[0])
    
    // Формируем строки CSV
    const csvRows = []
    
    // Добавляем строку с заголовками
    csvRows.push(headers.join(','))
    
    // Добавляем данные
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header]
        // Экранируем значения, содержащие запятые, кавычки или переносы строк
        const stringVal = val === null || val === undefined ? '' : String(val)
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`
        }
        return stringVal
      })
      csvRows.push(values.join(','))
    }
    
    // Объединяем строки с переносом
    // Добавляем BOM (Byte Order Mark), чтобы Excel правильно распознал UTF-8
    const csvString = '\uFEFF' + csvRows.join('\n')
    
    // Создаем Blob объект с типом text/csv
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    
    // Вызываем вспомогательную функцию для скачивания
    this.downloadBlob(blob, `${filename}.csv`)
  },

  /**
   * Внутренняя функция для создания невидимой ссылки и триггера скачивания Blob.
   * 
   * @param blob Объект Blob для скачивания
   * @param filename Полное имя файла с расширением
   */
  downloadBlob(blob: Blob, filename: string) {
    // Создаем временный URL для Blob
    const url = URL.createObjectURL(blob)
    
    // Создаем невидимый элемент <a>
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    // Добавляем ссылку в DOM, кликаем и сразу удаляем
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Освобождаем память, удаляя временный URL
    URL.revokeObjectURL(url)
  }
}

