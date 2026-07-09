// Display helpers for job enums + salary, shared across the candidate job
// surfaces. Mirrors the maps used on the public careers page.

export const WORK_MODE_LABELS: Record<string, string> = {
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
  ONSITE: 'On-site',
}

export const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERNSHIP: 'Internship',
  TEMPORARY: 'Temporary',
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  PKR: '₨',
}

export function workModeLabel(v: string | null): string {
  return v ? (WORK_MODE_LABELS[v] ?? v) : ''
}

export function employmentLabel(v: string | null): string {
  return v ? (EMPLOYMENT_LABELS[v] ?? v) : ''
}

function money(v: number, currency: string | null): string {
  const sym = CURRENCY_SYMBOLS[currency ?? 'USD'] ?? ''
  return v >= 1000 ? `${sym}${Math.round(v / 1000)}k` : `${sym}${v}`
}

export function salaryLine(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  if (min && max) return `${money(min, currency)} — ${money(max, currency)}`
  if (min) return `From ${money(min, currency)}`
  if (max) return `Up to ${money(max, currency)}`
  return ''
}

/** Brand gradient for a company mark, falling back to the HireFlow indigo. */
export function brandGradient(color: string | null | undefined): string {
  const c = color ?? '#4F46E5'
  return `linear-gradient(135deg, ${c}, ${c}cc)`
}
