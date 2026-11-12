<!-- src/views/UploadView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { procurementApi } from '@/api/procurement'
import type { SupplierResponse, ProcurementSessionResponse } from '@/api/procurement'
import MLProgressBar from '@/components/MLProgressBar.vue'
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  Plus,
  ArrowRight,
} from '@lucide/vue'

const router = useRouter()

// ── Состояние загрузки файла ──────────────────────────────────────────────────
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)
const uploadSuccess = ref(false)
const errorMessage = ref<string | null>(null)
const uploadedSessionId = ref<number | null>(null)
const uploadedTotalItems = ref<number>(0)

// ── Поставщики и сессии с бэкенда ─────────────────────────────────────────────
const suppliers = ref<SupplierResponse[]>([])
const sessions = ref<ProcurementSessionResponse[]>([])
const selectedSupplierId = ref<number | null>(null)
const targetSessionId = ref<number | null>(null)

// Создание нового поставщика
const showNewSupplierForm = ref(false)
const newSupplierName = ref('')
const newSupplierInn = ref('')
const isCreatingSupplier = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)
const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx']

onMounted(async () => {
  try {
    const [supList, sessList] = await Promise.all([
      procurementApi.listSuppliers(),
      procurementApi.listSessions(0, 30),
    ])
    suppliers.value = supList
    sessions.value = sessList.filter((s) => s.status !== 'APPROVED')
    if (supList.length > 0) {
      selectedSupplierId.value = supList[0].id
    }
  } catch {
    // Сервер может быть не запущен — продолжаем работу
  }
})

// Добавление нового поставщика (POST /api/v1/procurement/suppliers)
async function handleCreateSupplier() {
  if (!newSupplierName.value.trim()) return
  isCreatingSupplier.value = true
  errorMessage.value = null
  try {
    const created = await procurementApi.createSupplier({
      name: newSupplierName.value.trim(),
      inn: newSupplierInn.value.trim() || null,
    })
    suppliers.value.push(created)
    selectedSupplierId.value = created.id
    newSupplierName.value = ''
    newSupplierInn.value = ''
    showNewSupplierForm.value = false
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail || 'Не удалось создать поставщика на сервере'
  } finally {
    isCreatingSupplier.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Байт'
  const k = 1024
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

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

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    validateAndSetFile(target.files[0])
  }
}

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

function removeFile() {
  selectedFile.value = null
  uploadSuccess.value = false
  errorMessage.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// ── Отправка файла на реальный бэкенд (/api/v1/procurement/upload) ─────────────
async function handleSubmit() {
  if (!selectedFile.value || isUploading.value) return

  isUploading.value = true
  errorMessage.value = null
  uploadSuccess.value = false

  try {
    const res = targetSessionId.value
      ? await procurementApi.uploadAdditionalFile(
          targetSessionId.value,
          selectedFile.value,
          selectedSupplierId.value,
        )
      : await procurementApi.uploadFile(selectedFile.value, selectedSupplierId.value)

    uploadedSessionId.value = res.session_id
    uploadedTotalItems.value = res.total_items
    uploadSuccess.value = true
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail ||
      err?.message ||
      'Ошибка при отправке файла на сервер. Проверьте, запущен ли бэкенд.'
  } finally {
    isUploading.value = false
  }
}

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
    <!-- Заголовок страницы -->
    <div class="border-b border-white/8 pb-6">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <FileUp class="w-5 h-5 text-emerald-400" :stroke-width="1.75" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white tracking-tight">Загрузка прайс-листа</h1>
          <p class="text-slate-400 text-sm mt-0.5">
            Импорт спецификаций и цен поставщиков в форматах Excel и CSV с автоматическим ML-сопоставлением
          </p>
        </div>
      </div>
    </div>

    <!-- Выбор поставщика и целевой сессии -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/60 border border-white/8 rounded-2xl p-5">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Поставщик прайс-листа
          </label>
          <button
            type="button"
            @click="showNewSupplierForm = !showNewSupplierForm"
            class="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>{{ showNewSupplierForm ? 'Отмена' : 'Новый поставщик' }}</span>
          </button>
        </div>

        <select
          v-model="selectedSupplierId"
          class="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option :value="null">— Без привязки к поставщику —</option>
          <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
            {{ sup.name }} {{ sup.inn ? `(ИНН ${sup.inn})` : '' }}
          </option>
        </select>

        <!-- Мини-форма создания поставщика -->
        <div v-if="showNewSupplierForm" class="mt-3 p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2.5">
          <input
            v-model="newSupplierName"
            type="text"
            placeholder="Наименование (например, ООО ШинТорг)"
            class="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white"
          />
          <div class="flex items-center gap-2">
            <input
              v-model="newSupplierInn"
              type="text"
              placeholder="ИНН (необязательно)"
              class="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white"
            />
            <button
              type="button"
              @click="handleCreateSupplier"
              :disabled="isCreatingSupplier || !newSupplierName.trim()"
              class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
            >
              Создать
            </button>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          Режим сессии
        </label>
        <select
          v-model="targetSessionId"
          class="w-full bg-slate-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option :value="null">Создать новую закупочную сессию</option>
          <option v-for="sess in sessions" :key="sess.id" :value="sess.id">
            Дозагрузить в сессию #{{ sess.id }}: {{ sess.title }} ({{ sess.total_items }} поз.)
          </option>
        </select>
      </div>
    </div>

    <!-- Основной блок формы загрузки -->
    <div class="space-y-6">
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
        <div v-if="!selectedFile" class="flex flex-col items-center justify-center space-y-4">
          <div
            class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400"
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

          <button
            type="button"
            class="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none cursor-pointer"
            title="Удалить файл"
            :disabled="isUploading"
            @click="removeFile"
          >
            <Trash2 class="w-5 h-5" :stroke-width="1.75" />
          </button>
        </div>
      </div>

      <!-- Сообщения об ошибках и успехе -->
      <Transition name="fade-slide">
        <div
          v-if="errorMessage"
          class="flex items-center gap-3 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm"
          role="alert"
        >
          <AlertCircle class="w-5 h-5 shrink-0 text-red-400" :stroke-width="1.75" />
          <span>{{ errorMessage }}</span>
        </div>

        <div
          v-else-if="uploadSuccess"
          class="space-y-4"
          role="status"
        >
          <div class="flex items-center justify-between gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm">
            <div class="flex items-center gap-3">
              <CheckCircle2 class="w-5 h-5 shrink-0 text-emerald-400" :stroke-width="1.75" />
              <div>
                <p class="font-medium">
                  Прайс-лист загружен! Сессия #{{ uploadedSessionId }} ({{ uploadedTotalItems }} позиций)
                </p>
                <p class="text-xs text-emerald-300/80 mt-0.5">
                  Запущена задача ML-сопоставления в очереди Celery + pgvector.
                </p>
              </div>
            </div>

            <button
              v-if="uploadedSessionId"
              type="button"
              @click="router.push({ path: '/validation', query: { session_id: String(uploadedSessionId) } })"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              <span>К валидации сессии</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Живой прогресс по WebSocket /api/v1/ws/procurement/{session_id} -->
          <MLProgressBar :session-id="uploadedSessionId" />
        </div>
      </Transition>

      <!-- Кнопка отправки на обработку -->
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
          <span>{{ isUploading ? 'Отправка на сервер...' : 'Отправить на обработку' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
