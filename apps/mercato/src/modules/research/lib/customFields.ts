import { FIRMOGRAPHY_CF_KEYS } from './constants'

export function readCustomField(values: Record<string, unknown> | undefined, key: string): unknown {
  if (!values) return undefined
  const candidates = [key, `cf_${key}`, `cf:${key}`]
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(values, candidate)) return values[candidate]
  }
  return undefined
}

export function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export function asBoolean(value: unknown): boolean {
  if (value === true || value === 1 || value === '1') return true
  if (typeof value === 'string' && value.trim().toLowerCase() === 'true') return true
  return false
}

export function toDateInputValue(value: unknown): string {
  const raw = asString(value).trim()
  if (!raw) return ''
  const day = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  if (day) return day[1]
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export function toCrmAnnualRevenue(value: string): string | null | undefined {
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/,/g, '').replace(/\s+/g, '')
  if (/^\d+(\.\d{1,2})?$/.test(normalized)) return normalized
  return undefined
}

export function toCrmWebsiteUrl(value: string): string | null | undefined {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined
    return withScheme
  } catch {
    return undefined
  }
}

export function readFirmographyCustomFields(values: Record<string, unknown> | undefined) {
  return {
    nip: asString(readCustomField(values, FIRMOGRAPHY_CF_KEYS.nip)),
    krs: asString(readCustomField(values, FIRMOGRAPHY_CF_KEYS.krs)),
    profit: asString(readCustomField(values, FIRMOGRAPHY_CF_KEYS.profit)),
    nda: asBoolean(readCustomField(values, FIRMOGRAPHY_CF_KEYS.nda)),
    ndaDate: toDateInputValue(readCustomField(values, FIRMOGRAPHY_CF_KEYS.ndaDate)),
    ndaDriveUrl: asString(readCustomField(values, FIRMOGRAPHY_CF_KEYS.ndaDriveUrl)),
    relatedCompanies: asString(readCustomField(values, FIRMOGRAPHY_CF_KEYS.relatedCompanies)),
  }
}
