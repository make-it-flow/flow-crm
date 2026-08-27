import { LIVE_RUN_STATUSES, STALE_LIVE_RUN_MS } from './constants'

type LiveStatus = (typeof LIVE_RUN_STATUSES)[number]

export type StaleRunInput = {
  status: string
  createdAt?: Date | string | null
  startedAt?: Date | string | null
  updatedAt?: Date | string | null
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const ms = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export function isLiveRunStatus(status: string): status is LiveStatus {
  return LIVE_RUN_STATUSES.includes(status as LiveStatus)
}

export function liveRunAgeMs(run: StaleRunInput, nowMs = Date.now()): number | null {
  const anchor = toTime(run.startedAt) ?? toTime(run.createdAt) ?? toTime(run.updatedAt)
  if (anchor == null) return null
  return nowMs - anchor
}

export function isStaleLiveRun(run: StaleRunInput, nowMs = Date.now()): boolean {
  if (!isLiveRunStatus(run.status)) return false
  const age = liveRunAgeMs(run, nowMs)
  if (age == null) return false
  return age >= STALE_LIVE_RUN_MS
}

export function isFreshLiveRun(run: StaleRunInput | null | undefined, nowMs = Date.now()): boolean {
  if (!run || !isLiveRunStatus(run.status)) return false
  return !isStaleLiveRun(run, nowMs)
}
