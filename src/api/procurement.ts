// src/api/procurement.ts
import { apiClient } from './client'

// ---------------------------------------------------------------------------
// Типы данных, соответствующие схемам бэкенда (src/server/schemas/procurement.py)
// ---------------------------------------------------------------------------

export type TaskStatusEnum = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'APPROVED'
export type MatchStatusEnum = 'AUTO' | 'NEEDS_REVIEW' | 'MANUAL' | 'UNMATCHED'

export interface TireShortResponse {
  id: number
  sku: string
  width_mm: number
  profile_ratio: number
  diameter_inch: number
  load_index_code?: number | null
  speed_index_code?: string | null
  search_text?: string | null
}

export interface SupplierCreate {
  name: string
  inn?: string | null
}

export interface SupplierResponse {
  id: number
  name: string
  inn?: string | null
}

export interface CandidateTire {
  tire_id?: number
  id?: number
  sku: string
  search_text?: string
  confidence_score?: number
  similarity?: number
}

export interface RawOfferItemSchema {
  id: number
  session_id?: number
  raw_name: string
  price: number
  quantity: number
  lot_size: number
  min_order_qty: number
  supplier_article?: string | null
  supplier_id?: number | null
  matched_tire_id?: number | null
  matched_tire?: TireShortResponse | null
  confidence_score?: number | null
  match_status: MatchStatusEnum
  candidates?: CandidateTire[] | null
}

export interface UploadProcurementResponse {
  message: string
  session_id: number
  total_items: number
}

export interface ProcurementSessionResponse {
  id: number
  user_id?: number | null
  title: string
  status: TaskStatusEnum
  total_items: number
  matched_items: number
  created_at: string
}

export interface ProcurementSessionDetail extends ProcurementSessionResponse {
  raw_offer_items: RawOfferItemSchema[]
}

export interface MatchedNomenclatureRow {
  row_number: number
  enterprise_id?: number | null
  enterprise_name?: string | null
  supplier_name: string
  supplier_price: number
  confidence_score: number
  match_status: MatchStatusEnum
  candidates: CandidateTire[]
}

export interface ApproveResponse {
  session_id: number
  status: TaskStatusEnum
  matched_items: number
  total_items: number
  message: string
}

export interface DemandItemCreate {
  tire_id: number
  required_qty: number
}

export interface DemandItemResponse {
  id: number
  session_id: number
  tire_id: number
  required_qty: number
}

export interface OptimizeRequest {
  demand?: DemandItemCreate[] | null
  min_supplier_order_amount?: number
  timeout_seconds?: number
}

export interface AllocationItemSchema {
  tire_id: number
  sku?: string | null
  offer_item_id: number
  supplier_id?: number | null
  supplier_name?: string | null
  supplier_article?: string | null
  qty: number
  lots: number
  lot_size: number
  price: number
  total: number
}

export interface UnfulfilledItemSchema {
  tire_id: number
  required_qty: number
  allocated_qty: number
  shortage_qty: number
}

export interface OptimizationResponse {
  session_id: number
  solver_method: string
  allocations: AllocationItemSchema[]
  total_cost: number
  baseline_cost?: number | null
  savings: number
  savings_percent: number
  unfulfilled: UnfulfilledItemSchema[]
}

export interface WebhookExportResponse {
  session_id: number
  task_id: string
  target_url: string
  status: string
}

// ---------------------------------------------------------------------------
// Сервис закупочных сессий (Procurement API)
// ---------------------------------------------------------------------------

export const procurementApi = {
  /**
   * Список поставщиков -> GET /api/v1/procurement/suppliers
   */
  async listSuppliers(): Promise<SupplierResponse[]> {
    const { data } = await apiClient.get<SupplierResponse[]>('/api/v1/procurement/suppliers')
    return data
  },

  /**
   * Создание поставщика -> POST /api/v1/procurement/suppliers
   */
  async createSupplier(payload: SupplierCreate): Promise<SupplierResponse> {
    const { data } = await apiClient.post<SupplierResponse>('/api/v1/procurement/suppliers', payload)
    return data
  },

  /**
   * Загрузка прайс-листа (.xlsx/.csv) и создание новой сессии -> POST /api/v1/procurement/upload
   */
  async uploadFile(file: File, supplierId?: number | null): Promise<UploadProcurementResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const params: Record<string, number> = {}
    if (supplierId !== undefined && supplierId !== null) {
      params.supplier_id = supplierId
    }

    const { data } = await apiClient.post<UploadProcurementResponse>(
      '/api/v1/procurement/upload',
      formData,
      {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return data
  },

  /**
   * Дозагрузка прайс-листа другого поставщика в существующую сессию -> POST /api/v1/procurement/{session_id}/upload
   */
  async uploadAdditionalFile(
    sessionId: number,
    file: File,
    supplierId?: number | null,
  ): Promise<UploadProcurementResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const params: Record<string, number> = {}
    if (supplierId !== undefined && supplierId !== null) {
      params.supplier_id = supplierId
    }

    const { data } = await apiClient.post<UploadProcurementResponse>(
      `/api/v1/procurement/${sessionId}/upload`,
      formData,
      {
        params,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    )
    return data
  },

  /**
   * Список закупочных сессий -> GET /api/v1/procurement/sessions
   */
  async listSessions(skip = 0, limit = 50): Promise<ProcurementSessionResponse[]> {
    const { data } = await apiClient.get<ProcurementSessionResponse[]>(
      '/api/v1/procurement/sessions',
      { params: { skip, limit } },
    )
    return data
  },

  /**
   * Детальная информация о сессии со списком позиций -> GET /api/v1/procurement/{session_id}
   */
  async getSessionDetails(sessionId: number): Promise<ProcurementSessionDetail> {
    const { data } = await apiClient.get<ProcurementSessionDetail>(
      `/api/v1/procurement/${sessionId}`,
    )
    return data
  },

  /**
   * Позиции с низкой уверенностью -> GET /api/v1/procurement/{session_id}/matches
   */
  async getLowConfidenceMatches(
    sessionId: number,
    maxConfidence = 1.0,
    skip = 0,
    limit = 200,
  ): Promise<RawOfferItemSchema[]> {
    const { data } = await apiClient.get<RawOfferItemSchema[]>(
      `/api/v1/procurement/${sessionId}/matches`,
      { params: { max_confidence: maxConfidence, skip, limit } },
    )
    return data
  },

  /**
   * Полная таблица сопоставленной номенклатуры -> GET /api/v1/procurement/{session_id}/matched-table
   */
  async getMatchedTable(sessionId: number): Promise<MatchedNomenclatureRow[]> {
    const { data } = await apiClient.get<MatchedNomenclatureRow[]>(
      `/api/v1/procurement/${sessionId}/matched-table`,
      { params: { format: 'json' } },
    )
    return data
  },

  /**
   * Скачивание таблицы сопоставленной номенклатуры в CSV или XLSX
   */
  async downloadMatchedTable(sessionId: number, format: 'csv' | 'xlsx'): Promise<Blob> {
    const { data } = await apiClient.get(`/api/v1/procurement/${sessionId}/matched-table`, {
      params: { format },
      responseType: 'blob',
    })
    return data
  },

  /**
   * Ручная перепривязка эталонной шины (Active Learning / FeedbackAuditLog) -> PATCH /api/v1/procurement/items/{item_id}
   */
  async manualRematchItem(itemId: number, tireId: number): Promise<RawOfferItemSchema> {
    const { data } = await apiClient.patch<RawOfferItemSchema>(
      `/api/v1/procurement/items/${itemId}`,
      { tire_id: tireId },
    )
    return data
  },

  /**
   * Утверждение сопоставлений сессии (перевод в статус APPROVED) -> POST /api/v1/procurement/{session_id}/approve
   */
  async approveSession(sessionId: number, force = true): Promise<ApproveResponse> {
    const { data } = await apiClient.post<ApproveResponse>(
      `/api/v1/procurement/${sessionId}/approve`,
      null,
      { params: { force } },
    )
    return data
  },

  /**
   * Установка потребности по шинам -> POST /api/v1/procurement/{session_id}/demand
   */
  async setDemand(sessionId: number, items: DemandItemCreate[]): Promise<DemandItemResponse[]> {
    const { data } = await apiClient.post<DemandItemResponse[]>(
      `/api/v1/procurement/${sessionId}/demand`,
      { items },
    )
    return data
  },

  /**
   * Запуск алгоритма SplitOptimizer -> POST /api/v1/procurement/{session_id}/optimize
   */
  async optimizeSession(
    sessionId: number,
    payload: OptimizeRequest = {},
  ): Promise<OptimizationResponse> {
    const { data } = await apiClient.post<OptimizationResponse>(
      `/api/v1/procurement/${sessionId}/optimize`,
      payload,
    )
    return data
  },

  /**
   * Экспорт спецификации в 1С CommerceML 2.08 (XML или JSON) -> GET /api/v1/procurement/{session_id}/export/1c
   */
  async export1C(sessionId: number, format: 'xml' | 'json' = 'xml'): Promise<Blob> {
    const { data } = await apiClient.get(`/api/v1/procurement/${sessionId}/export/1c`, {
      params: { format },
      responseType: 'blob',
    })
    return data
  },

  /**
   * Отправка спецификации в ERP по Webhook -> POST /api/v1/procurement/{session_id}/export/webhook
   */
  async exportWebhook(sessionId: number, webhookUrl?: string): Promise<WebhookExportResponse> {
    const { data } = await apiClient.post<WebhookExportResponse>(
      `/api/v1/procurement/${sessionId}/export/webhook`,
      webhookUrl ? { webhook_url: webhookUrl } : {},
    )
    return data
  },
}
