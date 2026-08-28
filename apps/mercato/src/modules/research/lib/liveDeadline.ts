import { LIVE_RUN_DEADLINE_MS, LIVE_RUN_EXTENSION_MS } from './constants'

export type DeadlineRunInput = {
  deadlineAt?: Date | string | null
  deadlineExtendedAt?: Date | string | null
}

function toTime(value: Date | string | null | undefined): number | null {
  if (!value) return null
  const ms = value instanceof Date ? value.getTime() : Date.parse(value)
  return Number.isNaN(ms) ? null : ms
}

export function initialDeadline(fromMs = Date.now()): Date {
  return new Date(fromMs + LIVE_RUN_DEADLINE_MS)
}

export function extendedDeadline(fromMs = Date.now()): Date {
  return new Date(fromMs + LIVE_RUN_EXTENSION_MS)
}

/**
 * A run without a deadline predates this feature or never reached dispatch. Treating it as
 * expired would kill runs that may still be working, so it is left alone for the caller.
 */
export function isPastDeadline(run: DeadlineRunInput, nowMs = Date.now()): boolean {
  const deadline = toTime(run.deadlineAt)
  if (deadline == null) return false
  return nowMs >= deadline
}

export function hasSpentExtension(run: DeadlineRunInput): boolean {
  return toTime(run.deadlineExtendedAt) != null
}
