<!-- src/views/UploadView.vue
     Шаг 1 процесса: загрузка прайс-листа поставщика (.xlsx / .xls / .csv).
     После загрузки бэкенд запускает ML-сопоставление, а прогресс приходит
     по WebSocket и показывается компонентом MLProgressBar.
-->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { procurementApi } from '@/api/procurement'
import type { SupplierResponse, ProcurementSessionResponse } from '@/api/procurement'
import MLProgressBar from '@/components/MLProgressBar.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProcessStepper from '@/components/ui/ProcessStepper.vue'
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Lightbulb,
} from '@lucide/vue'

const router = useRouter()

// ── Состояние загрузки файла ──────────────────────────────────────────────────
const selectedFile       = ref<File | null>(null)
const isDragging         = ref(false)   // файл «висит» над зоной перетаскивания
const isUploading        = ref(false)
const uploadSuccess      = ref(false)
const errorMessage       = ref<string | null>(null)
const uploadedSessionId  = ref<number | null>(null)
const uploadedTotalItems = ref(0)

// ── Поставщики и сессии с бэкенда ─────────────────────────────────────────────
const suppliers          = ref<SupplierResponse[]>([])
const sessions           = ref<ProcurementSessionResponse[]>([])
const selectedSupplierId = ref<number | null>(null)
const targetSessionId    = ref<number | null>(null) // null = создать новую сессию

// ── Мини-форма «Новый поставщик» ──────────────────────────────────────────────
const showNewSupplierForm = ref(false)
const newSupplierName     = ref('')
const newSupplierInn      = ref('')
const isCreatingSupplier  = ref(false)

// Ссылка на скрытый <input type="file">, чтобы открыть диалог выбора по клику
const fileInputRef = ref<HTMLInputElement | null>(null)
const ACCEPTED_EXTENSIONS = ['.csv', '.xls', '.xlsx']

// ── Загрузка справочников при открытии страницы ───────────────────────────────
onMounted(async () => {
  try {
    const [supList, sessList] = await Promise.all([
      procurementApi.listSuppliers(),
      procurementApi.listSessions(0, 30),
    ])
    suppliers.value = supList
    // Дозагружать можно только в ещё не утверждённые сессии
    sessions.value = sessList.filter((s) => s.status !== 'APPROVED')
    if (supList.length > 0) selectedSupplierId.value = supList[0].id
  } catch {
    // Сервер может быть не запущен — страница всё равно работает
  }
})

// ── Создание поставщика (POST /api/v1/procurement/suppliers) ──────────────────
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
    errorMessage.value = err?.response?.data?.detail || 'Не удалось создать поставщика'
  } finally {
    isCreatingSupplier.value = false
  }
}

// Размер файла в человекочитаемом виде: 153600 → «150 КБ»
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Байт'
  const sizes = ['Байт', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${sizes[i]}`
}

// Проверяем расширение и запоминаем файл
function validateAndSetFile(file: File) {
  errorMessage.value = null
  uploadSuccess.value = false
  const isValid = ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  if (!isValid) {
    errorMessage.value = 'Неподдерживаемый формат. Загрузите файл .csv, .xls или .xlsx'
    return
  }
  selectedFile.value = file
}

function handleFileInputChange(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (files && files.length > 0) validateAndSetFile(files[0])
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
// Модификатор .prevent в шаблоне отменяет стандартное поведение браузера
// (иначе он просто откроет файл в новой вкладке).
function handleDrop(e: DragEvent) {
  isDragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) validateAndSetFile(files[0])
}

function removeFile() {
  selectedFile.value = null
  uploadSuccess.value = false
  errorMessage.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// ── Отправка файла на сервер ──────────────────────────────────────────────────
// Если выбрана существующая сессия — дозагружаем в неё, иначе создаём новую.
async function handleSubmit() {
  if (!selectedFile.value || isUploading.value) return
  isUploading.value = true
  errorMessage.value = null
  uploadSuccess.value = false

  try {
    const res = targetSessionId.value
      ? await procurementApi.uploadAdditionalFile(targetSessionId.value, selectedFile.value, selectedSupplierId.value)
      : await procurementApi.uploadFile(selectedFile.value, selectedSupplierId.value)

    uploadedSessionId.value  = res.session_id
    uploadedTotalItems.value = res.total_items
    uploadSuccess.value = true
  } catch (err: any) {
    errorMessage.value =
      err?.response?.data?.detail || err?.message || 'Ошибка отправки файла. Проверьте, запущен ли бэкенд.'
  } finally {
    isUploading.value = false
  }
}

// Цвет рамки зоны загрузки зависит от состояния
const dropzoneClasses = computed(() => {
  if (isDragging.value)   return 'border-brand-500 bg-brand-50'
  if (selectedFile.value) return 'border-brand-300 bg-white'
  return 'border-zinc-300 bg-white hover:border-brand-400 hover:bg-brand-50/40'
})

function goToValidation() {
  router.push({ path: '/validation', query: { session_id: String(uploadedSessionId.value) } })
}
</script>

<template>
  <div class="space-y-8">
    <!-- ── Заголовок и шаги процесса ───────────────────────────────────────── -->
    <div class="space-y-5">
      <ProcessStepper :current="1" />
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900">Загрузка прайс-листа</h1>
        <p class="mt-1 text-sm text-zinc-500">
          Добавьте файл поставщика — ML-модель автоматически сопоставит каждую строку с эталонным каталогом шин.
        </p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- ═════════════ ЛЕВАЯ КОЛОНКА: ФАЙЛ ═════════════ -->
      <div class="space-y-4 lg:col-span-2">
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          accept=".csv,.xls,.xlsx"
          @change="handleFileInputChange"
        />

        <!-- Зона перетаскивания файла -->
        <div
          class="flex flex-col items-center justify-center min-h-72 p-8 rounded-2xl border-2 border-dashed
                 text-center transition-colors duration-200"
          :class="[dropzoneClasses, selectedFile ? '' : 'cursor-pointer']"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="!selectedFile && fileInputRef?.click()"
        >
          <!-- Файл ещё не выбран -->
          <template v-if="!selectedFile">
            <div class="flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-brand-400 shadow-lg shadow-brand-500/30">
              <UploadCloud class="w-7 h-7 text-zinc-950" :stroke-width="2" />
            </div>
            <p class="text-base font-semibold text-zinc-900">Перетащите файл сюда</p>
            <p class="mt-1 text-sm text-zinc-500">
              или <span class="font-semibold text-brand-700 underline underline-offset-2">выберите на компьютере</span>
            </p>
            <div class="flex gap-2 mt-5">
              <span
                v-for="ext in ACCEPTED_EXTENSIONS"
                :key="ext"
                class="px-2 py-0.5 rounded-md bg-zinc-100 text-xs font-mono text-zinc-500"
              >
                {{ ext }}
              </span>
            </div>
          </template>

          <!-- Файл выбран: карточка файла -->
          <div v-else class="w-full max-w-md">
            <div class="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
              <div class="flex items-center justify-center w-12 h-12 shrink-0 rounded-xl bg-brand-100">
                <FileSpreadsheet class="w-6 h-6 text-brand-700" :stroke-width="1.75" />
              </div>
              <div class="flex-1 min-w-0 text-left">
                <p class="text-sm font-semibold text-zinc-900 truncate">{{ selectedFile.name }}</p>
                <p class="text-xs text-zinc-500">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button
                type="button"
                title="Убрать файл"
                class="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                :disabled="isUploading"
                @click.stop="removeFile"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <BaseButton class="w-full mt-4" :loading="isUploading" :icon="ArrowRight" @click.stop="handleSubmit">
              {{ isUploading ? 'Отправляем на сервер…' : 'Запустить ML-сопоставление' }}
            </BaseButton>
          </div>
        </div>

        <!-- Ошибка -->
        <div
          v-if="errorMessage"
          role="alert"
          class="flex items-center gap-3 p-4 rounded-xl bg-rose-50 text-sm text-rose-700 ring-1 ring-rose-200"
        >
          <AlertCircle class="w-5 h-5 shrink-0" :stroke-width="1.75" />
          {{ errorMessage }}
        </div>

        <!-- Успешная загрузка + живой прогресс ML -->
        <div v-else-if="uploadSuccess" class="space-y-4" role="status">
          <div class="flex flex-col gap-4 p-5 rounded-2xl bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-3">
              <CheckCircle2 class="w-6 h-6 shrink-0 text-brand-400" :stroke-width="1.75" />
              <div>
                <p class="font-semibold text-white">Прайс загружен — сессия #{{ uploadedSessionId }}</p>
                <p class="text-sm text-zinc-400">
                  <span class="font-mono">{{ uploadedTotalItems }}</span> позиций отправлено на ML-сопоставление
                </p>
              </div>
            </div>
            <BaseButton :icon="ArrowRight" @click="goToValidation">К проверке</BaseButton>
          </div>

          <!-- Прогресс приходит по WebSocket /api/v1/ws/procurement/{session_id} -->
          <MLProgressBar :session-id="uploadedSessionId" />
        </div>
      </div>

      <!-- ═════════════ ПРАВАЯ КОЛОНКА: НАСТРОЙКИ ═════════════ -->
      <div class="space-y-4">
        <BaseCard title="Параметры загрузки">
          <div class="space-y-5">
            <!-- Поставщик -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="supplier" class="text-sm font-medium text-zinc-700">Поставщик</label>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline cursor-pointer"
                  @click="showNewSupplierForm = !showNewSupplierForm"
                >
                  <Plus class="w-3.5 h-3.5" />
                  {{ showNewSupplierForm ? 'Отмена' : 'Новый' }}
                </button>
              </div>
              <select id="supplier" v-model="selectedSupplierId" class="field">
                <option :value="null">— Без привязки —</option>
                <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                  {{ sup.name }}{{ sup.inn ? ` · ИНН ${sup.inn}` : '' }}
                </option>
              </select>

              <!-- Мини-форма создания поставщика -->
              <div v-if="showNewSupplierForm" class="mt-3 p-3 space-y-2 rounded-xl bg-zinc-50 ring-1 ring-zinc-200">
                <input v-model="newSupplierName" type="text" placeholder="Название, напр. ООО «ШинТорг»" class="field" />
                <input v-model="newSupplierInn" type="text" placeholder="ИНН (необязательно)" class="field font-mono" />
                <BaseButton
                  size="sm"
                  class="w-full"
                  :loading="isCreatingSupplier"
                  :disabled="!newSupplierName.trim()"
                  @click="handleCreateSupplier"
                >
                  Добавить поставщика
                </BaseButton>
              </div>
            </div>

            <!-- Сессия -->
            <div>
              <label for="session" class="block mb-1.5 text-sm font-medium text-zinc-700">Закупочная сессия</label>
              <select id="session" v-model="targetSessionId" class="field">
                <option :value="null">Создать новую сессию</option>
                <option v-for="sess in sessions" :key="sess.id" :value="sess.id">
                  Дозагрузить в #{{ sess.id }} · {{ sess.title }}
                </option>
              </select>
              <p class="mt-1.5 text-xs text-zinc-500">
                Дозагрузка позволяет сравнить прайсы нескольких поставщиков в одной матрице.
              </p>
            </div>
          </div>
        </BaseCard>

        <!-- Подсказка для закупщика -->
        <div class="flex gap-3 p-4 rounded-2xl bg-brand-50 ring-1 ring-brand-200">
          <Lightbulb class="w-5 h-5 shrink-0 text-brand-700" :stroke-width="1.9" />
          <div class="text-sm">
            <p class="font-semibold text-zinc-900">Совет</p>
            <p class="mt-0.5 text-zinc-600">
              В файле должны быть колонки с наименованием, ценой и количеством. Порядок колонок не важен.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
