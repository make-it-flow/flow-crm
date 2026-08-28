import { LIVE_RUN_DEADLINE_MS, LIVE_RUN_EXTENSION_MS } from '../lib/constants'
import { extendedDeadline, hasSpentExtension, initialDeadline, isPastDeadline } from '../lib/liveDeadline'

describe('live run deadlines', () => {
  const now = Date.parse('2026-08-28T06:00:00.000Z')

  it('gives a real cloud agent minutes, not the mock-sized window', () => {
    expect(LIVE_RUN_DEADLINE_MS).toBe(15 * 60_000)
    expect(initialDeadline(now).toISOString()).toBe('2026-08-28T06:15:00.000Z')
    expect(extendedDeadline(now).getTime() - now).toBe(LIVE_RUN_EXTENSION_MS)
  })

  it('expires only once the deadline is reached', () => {
    const run = { deadlineAt: new Date(now + LIVE_RUN_DEADLINE_MS) }
    expect(isPastDeadline(run, now)).toBe(false)
    expect(isPastDeadline(run, now + LIVE_RUN_DEADLINE_MS - 1)).toBe(false)
    expect(isPastDeadline(run, now + LIVE_RUN_DEADLINE_MS)).toBe(true)
  })

  it('accepts a serialized deadline', () => {
    expect(isPastDeadline({ deadlineAt: '2026-08-28T05:59:59.000Z' }, now)).toBe(true)
    expect(isPastDeadline({ deadlineAt: '2026-08-28T06:00:01.000Z' }, now)).toBe(false)
  })

  it('leaves runs without a deadline alone instead of killing them', () => {
    expect(isPastDeadline({ deadlineAt: null }, now)).toBe(false)
    expect(isPastDeadline({}, now)).toBe(false)
    expect(isPastDeadline({ deadlineAt: 'not a date' }, now)).toBe(false)
  })

  it('spends the extension exactly once', () => {
    expect(hasSpentExtension({ deadlineExtendedAt: null })).toBe(false)
    expect(hasSpentExtension({})).toBe(false)
    expect(hasSpentExtension({ deadlineExtendedAt: new Date(now) })).toBe(true)
  })
})
