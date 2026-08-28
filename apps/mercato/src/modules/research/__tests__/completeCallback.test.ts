/** @jest-environment node */

const getAuthFromRequestMock = jest.fn()
const completeResearchRunMock = jest.fn()
const failResearchRunMock = jest.fn()
const serializeResearchRunMock = jest.fn()
const loggerWarnMock = jest.fn()
const loggerErrorMock = jest.fn()
const entityManager = {}

jest.mock('@open-mercato/shared/lib/auth/server', () => ({
  getAuthFromRequest: (...args: unknown[]) => getAuthFromRequestMock(...args),
}))

jest.mock('@open-mercato/shared/lib/di/container', () => ({
  createRequestContainer: jest.fn(async () => ({
    resolve: (name: string) => {
      if (name === 'em') return entityManager
      throw new Error(`Unexpected container resolve: ${name}`)
    },
  })),
}))

jest.mock('@open-mercato/shared/lib/logger', () => ({
  createLogger: () => ({
    child: () => ({
      warn: (...args: unknown[]) => loggerWarnMock(...args),
      error: (...args: unknown[]) => loggerErrorMock(...args),
    }),
  }),
}))

jest.mock('../lib/completeRun', () => ({
  completeResearchRun: (...args: unknown[]) => completeResearchRunMock(...args),
  failResearchRun: (...args: unknown[]) => failResearchRunMock(...args),
}))

jest.mock('../lib/serializeRun', () => ({
  serializeResearchRun: (...args: unknown[]) => serializeResearchRunMock(...args),
}))

import { POST } from '../api/runs/[id]/complete/route'

const tenantId = '11111111-1111-4111-8111-111111111111'
const organizationId = '22222222-2222-4222-8222-222222222222'
const runId = '33333333-3333-4333-8333-333333333333'

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/research/runs/${runId}/complete`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function post(body: unknown): Promise<Response> {
  return POST(makeRequest(body), { params: { id: runId } })
}

describe('POST /api/research/runs/:id/complete callback validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getAuthFromRequestMock.mockResolvedValue({
      sub: 'research-bot',
      tenantId,
      orgId: organizationId,
    })
    failResearchRunMock.mockResolvedValue({ id: runId, status: 'failed' })
    completeResearchRunMock.mockResolvedValue({ id: runId, status: 'done' })
    serializeResearchRunMock.mockReturnValue({ id: runId, status: 'done' })
  })

  it.each([
    ['an extra top-level key', { mainInsight: 'Insight', unexpected: true }],
    ['a missing required array item field', { specificProblems: [{ source: 'https://example.com' }] }],
    ['a field with the wrong type', { estimatedHeadcount: 120 }],
  ])('fails the run for %s without saving partial brief data', async (_label, body) => {
    const response = await post(body)
    const responseBody = await response.json() as {
      code?: string
      details?: unknown[]
    }

    expect(response.status).toBe(400)
    expect(responseBody.code).toBe('invalid_research_brief')
    expect(responseBody.details?.length).toBeGreaterThan(0)
    expect(completeResearchRunMock).not.toHaveBeenCalled()
    expect(failResearchRunMock).toHaveBeenCalledWith(entityManager, {
      runId,
      tenantId,
      organizationId,
      error: 'research.profile.invalidCallbackPayload',
    })
    expect(loggerWarnMock).toHaveBeenCalledWith(
      'Research callback payload failed validation',
      expect.objectContaining({ runId, tenantId, organizationId }),
    )
  })

  it('fails malformed JSON instead of accepting an empty fallback brief', async () => {
    const request = new Request(`http://localhost/api/research/runs/${runId}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    })

    const response = await POST(request, { params: { id: runId } })

    expect(response.status).toBe(400)
    expect(failResearchRunMock).toHaveBeenCalled()
    expect(completeResearchRunMock).not.toHaveBeenCalled()
  })

  it('saves a valid brief without marking the run failed', async () => {
    const response = await post({
      mainInsight: 'Potwierdzony insight',
      mainInsightSource: 'https://example.com/source',
      specificProblems: [{ text: 'Potwierdzony problem', source: 'https://example.com/problem' }],
    })

    expect(response.status).toBe(200)
    expect(failResearchRunMock).not.toHaveBeenCalled()
    expect(completeResearchRunMock).toHaveBeenCalledWith(entityManager, {
      runId,
      tenantId,
      organizationId,
      brief: {
        mainInsight: 'Potwierdzony insight',
        mainInsightSource: 'https://example.com/source',
        specificProblems: [{ text: 'Potwierdzony problem', source: 'https://example.com/problem' }],
      },
    })
  })

  it('does not mutate a run before authentication and run identity are known', async () => {
    getAuthFromRequestMock.mockResolvedValue(null)
    const response = await post({ estimatedHeadcount: 120 })

    expect(response.status).toBe(401)
    expect(failResearchRunMock).not.toHaveBeenCalled()
    expect(completeResearchRunMock).not.toHaveBeenCalled()
  })
})
