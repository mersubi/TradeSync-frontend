// src/utils/sessionStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Русские подписи и цвета бейджей для статусов закупочной сессии.
// Статусы приходят с бэкенда (TaskStatusEnum), а здесь мы описываем,
// как их показывать пользователю. Используется на нескольких экранах.
// ─────────────────────────────────────────────────────────────────────────────
import type { TaskStatusEnum } from '@/api/procurement'

export const sessionStatusMeta: Record<TaskStatusEnum, { label: string; cls: string }> = {
  PENDING:    { label: 'В очереди',   cls: 'bg-zinc-100 text-zinc-600' },
  PROCESSING: { label: 'Обработка',   cls: 'bg-sky-100 text-sky-700' },
  COMPLETED:  { label: 'На проверке', cls: 'bg-amber-100 text-amber-800' },
  APPROVED:   { label: 'Утверждена',  cls: 'bg-lime-100 text-lime-800' },
  FAILED:     { label: 'Ошибка',      cls: 'bg-rose-100 text-rose-700' },
}

/** Дата в коротком формате: «12 нояб., 19:30» */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

