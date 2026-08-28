import type { EntityManager } from '@mikro-orm/postgresql'
import {
  LIVE_RUN_AGENT_LOST_ERROR,
  LIVE_RUN_DEADLINE_ERROR,
  LIVE_RUN_EXTENSION_MS,
} from '../lib/constants'

const findMock = jest.fn()
const flushMock = jest.fn()
const failResearchRunMock = jest.fn()
const getCursorAgentLivenessMock = jest.fn()

jest.mock('../lib/orm', () => ({
  resolveResearchRunEntity: jest.fn(async () => class ResearchRun {}),
}))
jest.mock('../lib/completeRun', () => ({
  completeResearchRun: jest.fn(),
  failResearchRun: (...args: unknown[]) => failResearchRunMock(...args),
}))
jest.mock('../lib/cursorCloud', () => ({
  resolveCursorCloudConfig: () => ({ apiKey: 'k', environmentName: 'flow-research', model: null }),
  getCursorAgentLiveness: (...args: unknown[]) => getCursorAgentLivenessMock(...args),
}))

import { settleLiveRunsForCompany } from '../lib/expireStale'

const scope = { tenantId: 't1', organizationId: 'o1', companyId: 'c1' }

type TestRun = {
  id: string
  status: string
  providerAgentId: string | null
  deadlineAt: Date | null
  deadlineExtendedAt: Date | null
  updatedAt: Date
}

function makeRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    id: 'run-1',
    status: 'running',
    providerAgentId: 'bc-1',
    deadlineAt: new Date(Date.now() - 1000),
    deadlineExtendedAt: null,
    updatedAt: new Date(),
    ...overrides,
  }
}

const em = { find: findMock, flush: flushMock } as unknown as EntityManager

describe('settleLiveRunsForCompany in live mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEARCH_MODE = 'live'
  })

  it('leaves a run alone before its deadline', async () => {
    findMock.mockResolvedValue([makeRun({ deadlineAt: new Date(Date.now() + 60_000) })])
    await expect(settleLiveRunsForCompany(em, scope)).resolves.toBe(0)
    expect(getCursorAgentLivenessMock).not.toHaveBeenCalled()
    expect(failResearchRunMock).not.toHaveBeenCalled()
  })

  it('extends a still-working agent once and does not fail it', async () => {
    const run = makeRun()
    findMock.mockResolvedValue([run])
    getCursorAgentLivenessMock.mockResolvedValue('working')

    await expect(settleLiveRunsForCompany(em, scope)).resolves.toBe(0)
    expect(failResearchRunMock).not.toHaveBeenCalled()
    expect(run.deadlineExtendedAt).toBeInstanceOf(Date)
    expect(run.deadlineAt!.getTime() - run.deadlineExtendedAt!.getTime()).toBe(LIVE_RUN_EXTENSION_MS)
  })

  it('fails a run whose extension is already spent without asking the provider again', async () => {
    findMock.mockResolvedValue([makeRun({ deadlineExtendedAt: new Date(Date.now() - 60_000) })])

    await expect(settleLiveRunsForCompany(em, scope)).resolves.toBe(1)
    expect(getCursorAgentLivenessMock).not.toHaveBeenCalled()
    expect(failResearchRunMock).toHaveBeenCalledWith(em, expect.objectContaining({ error: LIVE_RUN_DEADLINE_ERROR }))
  })

  it('fails a run whose agent finished without reporting back', async () => {
    findMock.mockResolvedValue([makeRun()])
    getCursorAgentLivenessMock.mockResolvedValue('finished')

    await expect(settleLiveRunsForCompany(em, scope)).resolves.toBe(1)
    expect(failResearchRunMock).toHaveBeenCalledWith(em, expect.objectContaining({ error: LIVE_RUN_AGENT_LOST_ERROR }))
  })

  it('does not kill a run when the provider status is unavailable', async () => {
    const run = makeRun()
    findMock.mockResolvedValue([run])
    getCursorAgentLivenessMock.mockResolvedValue('unknown')

    await expect(settleLiveRunsForCompany(em, scope)).resolves.toBe(0)
    expect(failResearchRunMock).not.toHaveBeenCalled()
    expect(run.deadlineExtendedAt).toBeNull()
  })

  it('fails an expired run that never recorded an agent id', async () => {
    findMock.mockResolvedValue([makeRun({ providerAgentId: null })])

    await expect(settleLiveRunsForCompany(em, scope)).resolves.toBe(1)
    expect(getCursorAgentLivenessMock).not.toHaveBeenCalled()
    expect(failResearchRunMock).toHaveBeenCalledWith(em, expect.objectContaining({ error: LIVE_RUN_DEADLINE_ERROR }))
  })
})
