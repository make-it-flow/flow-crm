import {
  DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS,
  resolveResearchAvailability,
  resolveResearchSuccessCooldownMs,
} from '../lib/researchAvailability'

describe('resolveResearchAvailability', () => {
  const nowMs = Date.parse('2026-08-28T06:00:00.000Z')

  it('blocks a live run and exposes its deadline', () => {
    expect(resolveResearchAvailability({
      liveRun: {
        id: 'live-1',
        status: 'running',
        deadlineAt: '2026-08-28T06:15:00.000Z',
      },
      nowMs,
    })).toEqual({
      canStart: false,
      reason: 'running',
      availableAt: '2026-08-28T06:15:00.000Z',
      runId: 'live-1',
    })
  })

  it('blocks for exactly 24 hours after a successful run', () => {
    const finishedAtMs = nowMs - 60_000
    expect(resolveResearchAvailability({
      latestSuccessfulRun: {
        id: 'done-1',
        status: 'done',
        finishedAt: new Date(finishedAtMs),
      },
      nowMs,
      cooldownMs: DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS,
    })).toEqual({
      canStart: false,
      reason: 'cooldown',
      availableAt: new Date(finishedAtMs + DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS).toISOString(),
      runId: 'done-1',
    })
  })

  it('allows a new run when the successful run is exactly 24 hours old', () => {
    expect(resolveResearchAvailability({
      latestSuccessfulRun: {
        id: 'done-1',
        status: 'done',
        finishedAt: new Date(nowMs - DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS),
      },
      nowMs,
      cooldownMs: DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS,
    })).toEqual({
      canStart: true,
      reason: null,
      availableAt: null,
      runId: null,
    })
  })

  it('allows a new run immediately after failure', () => {
    expect(resolveResearchAvailability({
      latestSuccessfulRun: {
        id: 'failed-1',
        status: 'failed',
        finishedAt: new Date(nowMs - 1),
      },
      nowMs,
    }).canStart).toBe(true)
  })

  it('prioritizes an active run over an earlier successful cooldown', () => {
    expect(resolveResearchAvailability({
      liveRun: {
        id: 'live-1',
        status: 'pending',
        deadlineAt: null,
      },
      latestSuccessfulRun: {
        id: 'done-1',
        status: 'done',
        finishedAt: new Date(nowMs - 60_000),
      },
      nowMs,
    })).toEqual({
      canStart: false,
      reason: 'running',
      availableAt: null,
      runId: 'live-1',
    })
  })

  it('skips the cooldown when the duration is zero', () => {
    expect(resolveResearchAvailability({
      latestSuccessfulRun: {
        id: 'done-1',
        status: 'done',
        finishedAt: new Date(nowMs - 1),
      },
      nowMs,
      cooldownMs: 0,
    }).canStart).toBe(true)
  })

  it('honours a short cooldown from configuration', () => {
    expect(resolveResearchAvailability({
      latestSuccessfulRun: {
        id: 'done-1',
        status: 'done',
        finishedAt: new Date(nowMs - 500),
      },
      nowMs,
      cooldownMs: 1_000,
    }).canStart).toBe(false)
    expect(resolveResearchAvailability({
      latestSuccessfulRun: {
        id: 'done-1',
        status: 'done',
        finishedAt: new Date(nowMs - 1_000),
      },
      nowMs,
      cooldownMs: 1_000,
    }).canStart).toBe(true)
  })
})

describe('resolveResearchSuccessCooldownMs', () => {
  const originalOverride = process.env.RESEARCH_SUCCESS_COOLDOWN_MS

  afterEach(() => {
    if (originalOverride == null) delete process.env.RESEARCH_SUCCESS_COOLDOWN_MS
    else process.env.RESEARCH_SUCCESS_COOLDOWN_MS = originalOverride
  })

  it('defaults to a day when nothing overrides it', () => {
    delete process.env.RESEARCH_SUCCESS_COOLDOWN_MS
    expect(resolveResearchSuccessCooldownMs()).toBe(DEFAULT_RESEARCH_SUCCESS_COOLDOWN_MS)
  })

  it('reads the override from the environment', () => {
    process.env.RESEARCH_SUCCESS_COOLDOWN_MS = '1000'
    expect(resolveResearchSuccessCooldownMs()).toBe(1_000)
  })

  it('treats off/0 as disabled', () => {
    expect(resolveResearchSuccessCooldownMs('off')).toBe(0)
    expect(resolveResearchSuccessCooldownMs('0')).toBe(0)
    expect(resolveResearchSuccessCooldownMs('1000')).toBe(1_000)
  })
})
