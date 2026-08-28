import { LIVE_RUN_STATUSES } from './constants'

export const DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS = 24 * 60 * 60_000

export function resolveResearchSuccessCooldownMs(
  raw = process.env.RESEARCH_SUCCESS_COOLDOWN_MS,
): number {
  if (raw == null) return DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed || trimmed === 'off' || trimmed === 'false') return 0
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS
  return Math.floor(parsed)
}

export type ResearchBlockReason = 'running' | 'cooldown'

export type ResearchAvailability = {
  canStart: boolean
  reason: ResearchBlockReason | null
  availableAt: string | null
  runId: string | null
}

type ResearchAvailabilityRun = {
  id: string
  status: string
  deadlineAt?: Date | string | null
  finishedAt?: Date | string | null
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const time = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function toIso(value: Date | string | null | undefined): string | null {
  const time = toTime(value)
  return time == null ? null : new Date(time).toISOString()
}

export function resolveResearchAvailability(params: {
  liveRun?: ResearchAvailabilityRun | null
  latestSuccessfulRun?: ResearchAvailabilityRun | null
  nowMs?: number
  cooldownMs?: number
}): ResearchAvailability {
  const nowMs = params.nowMs ?? Date.now()
  const cooldownMs = params.cooldownMs ?? resolveResearchSuccessCooldownMs()
  const liveRun = params.liveRun
  if (
    liveRun
    && LIVE_RUN_STATUSES.includes(liveRun.status as (typeof LIVE_RUN_STATUSES)[number])
  ) {
    return {
      canStart: false,
      reason: 'running',
      availableAt: toIso(liveRun.deadlineAt),
      runId: liveRun.id,
    }
  }

  const successfulRun = params.latestSuccessfulRun
  const finishedAtMs = successfulRun?.status === 'done'
    ? toTime(successfulRun.finishedAt)
    : null
  if (successfulRun && finishedAtMs != null && cooldownMs > 0) {
    const availableAtMs = finishedAtMs + cooldownMs
    if (availableAtMs > nowMs) {
      return {
        canStart: false,
        reason: 'cooldown',
        availableAt: new Date(availableAtMs).toISOString(),
        runId: successfulRun.id,
      }
    }
  }

  return {
    canStart: true,
    reason: null,
    availableAt: null,
    runId: null,
  }
}
