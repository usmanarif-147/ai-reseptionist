export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/

export function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false
  const d = new Date(value + 'T00:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function isDateInPast(dateStr: string): boolean {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return dateStr < todayStr
}

export function isValidTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_REGEX.test(value)
}

export function normalizeTime(value: string): string {
  // Postgres `time` columns return HH:MM:SS; normalize to HH:MM.
  return value.length >= 5 ? value.slice(0, 5) : value
}

export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function slotsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = normalizeTime(aStart)
  const ae = normalizeTime(aEnd)
  const bs = normalizeTime(bStart)
  const be = normalizeTime(bEnd)
  return as < be && ae > bs
}

export function todayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getDayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? ''
}

export function addDaysLocal(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
