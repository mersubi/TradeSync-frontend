// src/utils/confidence.ts
// ─────────────────────────────────────────────────────────────────────────────
// Логика «Светофора» (Traffic Light) — в одном месте для всего приложения.
// Её используют бейдж ConfidenceBadge, фильтры и счётчики в таблице валидации,
// поэтому пороги гарантированно одинаковые везде.
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** Порог «зелёного» уровня: модели можно доверять без проверки */
export const HIGH_THRESHOLD = 0.85
/** Порог «жёлтого» уровня: ниже него — «красный», нужна ручная проверка */
export const MEDIUM_THRESHOLD = 0.6

/**
 * Определяет цвет светофора по уверенности модели (от 0 до 1).
 *   > 85%  → 'high'   (зелёный)
 *   60–85% → 'medium' (жёлтый)
 *   < 60%  → 'low'    (красный), а также если кандидат не найден (null)
 */
export function getConfidenceLevel(score?: number | null): ConfidenceLevel {
  if (score == null) return 'low'
  if (score > HIGH_THRESHOLD) return 'high'
  if (score >= MEDIUM_THRESHOLD) return 'medium'
  return 'low'
}

/** Перевод уверенности в проценты для отображения: 0.923 → "92%" */
export function formatPercent(score?: number | null): string {
  return score == null ? '—' : `${Math.round(score * 100)}%`
}

