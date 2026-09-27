<!-- src/views/UploadView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
} from '@lucide/vue'

// ── Состояние загрузки файла ──────────────────────────────────────────────────
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)
const uploadSuccess = ref(false)
const errorMessage = ref<string | null>(null)

// Ссылка на скрытый input выбора файла
const fileInputRef = ref<HTMLInputElement | null>(null)

// Поддерживаемые форматы файлов
const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx']

// ── Форматирование размера файла (Байты -> КБ / МБ) ──────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Байт'
  const k = 1024
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// ── Валидация расширения файла ────────────────────────────────────────────────
function validateAndSetFile(file: File) {
  errorMessage.value = null
  uploadSuccess.value = false

  const fileName = file.name.toLowerCase()
  const isValidExtension = ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext))

  if (!isValidExtension) {
    errorMessage.value = 'Неподдерживаемый формат. Пожалуйста, загрузите .csv, .xls или .xlsx'
    return
  }

  selectedFile.value = file
}

// ── Обработчики выбора файла через стандартный диалог ────────────────────────
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    validateAndSetFile(target.files[0])
  }
}

// ── Обработчики событий Drag-and-Drop ─────────────────────────────────────────
function handleDragEnter(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = false

  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    validateAndSetFile(e.dataTransfer.files[0])
  }
}

// ── Удаление выбранного файла ─────────────────────────────────────────────────
function removeFile() {
  selectedFile.value = null
  uploadSuccess.value = false
  errorMessage.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// ── Имитация отправки файла на сервер ─────────────────────────────────────────
async function handleSubmit() {
  if (!selectedFile.value || isUploading.value) return

  isUploading.value = true
  errorMessage.value = null
  uploadSuccess.value = false

  try {
    // Имитация задержки сетевого запроса (1.5 секунды)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    uploadSuccess.value = true
  } catch (error) {
    errorMessage.value = 'Ошибка при отправке файла. Попробуйте еще раз.'
  } finally {
    isUploading.value = false
  }
}

// ── Вычисляемые свойства для стилизации дропзоны ──────────────────────────────
const dropzoneClasses = computed(() => {
  if (isDragging.value) {
    return 'border-blue-500 bg-blue-500/10 scale-[1.01]'
  }
  if (selectedFile.value) {
    return 'border-emerald-500/40 bg-emerald-500/5'
  }
  return 'border-white/15 hover:border-blue-500/50 hover:bg-white/[0.02]'
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- ── Заголовок страницы ───────────────────────────────────────────────── -->
    <div class="border-b border-white/8 pb-6">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <FileUp class="w-5 h-5 text-emerald-400" :stroke-width="1.75" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Загрузка прайс-листа</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Импорт спецификаций и цен поставщиков в форматах Excel и CSV
          </p>
        </div>
      </div>
    </div>

    <!-- ── Основной блок формы загрузки ────────────────────────────────────── -->
    <div class="space-y-6">
      <!-- Скрытый инпут для файлов -->
      <input
        ref="fileInputRef"
        type="file"
        class="hidden"
        accept=".csv, .xls, .xlsx"
        @change="handleFileInputChange"
      />

      <!-- Drag and Drop зона -->
      <div
        class="relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer select-none"
        :class="dropzoneClasses"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        @click="!selectedFile && triggerFileInput()"
      >
        <!-- Вариант 1: Файл НЕ выбран -->
        <div v-if="!selectedFile" class="flex flex-col items-center justify-center space-y-4">
          <div
            class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-200"
          >
            <UploadCloud class="w-8 h-8 text-blue-400" :stroke-width="1.5" />
          </div>

          <div class="space-y-1">
            <p class="text-base font-medium text-white">
              Перетащите файл сюда или
              <button
                type="button"
                class="text-blue-400 hover:text-blue-300 underline font-semibold focus:outline-none"
                @click.stop="triggerFileInput"
              >
                выберите на компьютере
              </button>
            </p>
            <p class="text-xs text-slate-500">
              Поддерживаются форматы: .CSV, .XLS, .XLSX (до 50 МБ)
            </p>
          </div>
        </div>

        <!-- Вариант 2: Файл ВЫБРАН -->
        <div
          v-else
          class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-white/10 cursor-default"
          @click.stop
        >
          <div class="flex items-center gap-4 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <FileSpreadsheet class="w-6 h-6 text-emerald-400" :stroke-width="1.75" />
            </div>
            <div class="text-left min-w-0">
              <p class="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                {{ selectedFile.name }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ formatFileSize(selectedFile.size) }}
              </p>
            </div>
          </div>

          <!-- Кнопка удаления файла -->
          <button
            type="button"
            class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none"
            title="Удалить файл"
            :disabled="isUploading"
            @click="removeFile"
          >
            <Trash2 class="w-5 h-5" :stroke-width="1.75" />
          </button>
        </div>
      </div>

      <!-- ── Сообщения об ошибках и успехе ──────────────────────────────────── -->
      <Transition name="fade-slide">
        <!-- Блок ошибки -->
        <div
          v-if="errorMessage"
          class="flex items-center gap-3 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm"
          role="alert"
        >
          <AlertCircle class="w-5 h-5 shrink-0 text-red-400" :stroke-width="1.75" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Блок успешной загрузки -->
        <div
          v-else-if="uploadSuccess"
          class="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm"
          role="status"
        >
          <CheckCircle2 class="w-5 h-5 shrink-0 text-emerald-400" :stroke-width="1.75" />
          <div>
            <p class="font-medium">Файл успешно отправлен на обработку!</p>
            <p class="text-xs text-emerald-300/80 mt-0.5">
              Данные будут проверены и отображены в разделе валидации.
            </p>
          </div>
        </div>
      </Transition>

      <!-- ── Кнопка отправки на обработку ───────────────────────────────────── -->
      <div class="flex justify-end pt-2">
        <button
          type="button"
          class="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          :class="[
            !selectedFile || isUploading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 hover:shadow-blue-500/40 cursor-pointer',
          ]"
          :disabled="!selectedFile || isUploading"
          @click="handleSubmit"
        >
          <Loader2 v-if="isUploading" class="w-4 h-4 animate-spin" />
          <span>{{ isUploading ? 'Обработка файла...' : 'Отправить на обработку' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Анимация появления уведомлений */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
