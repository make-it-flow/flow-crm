import {
  createCursorResearchAgent,
  CursorCloudPermanentError,
  CursorCloudTransientError,
  describeMissingCursorCloudConfig,
  getCursorAgentLiveness,
  newCursorAgentId,
  RESEARCH_PROMPT_NOTION_URL,
  listCursorModels,
  resolveCursorCloudConfig,
  type CursorCloudConfig,
} from '../lib/cursorCloud'

const config: CursorCloudConfig = {
  apiKey: 'crsr_secret_key',
  environmentName: 'flow-research',
}

const company = { companyName: 'Acme', industry: 'IT', websiteUrl: 'https://acme.example' }

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const spy = jest.fn(impl)
  ;(globalThis as { fetch: unknown }).fetch = spy as unknown as typeof fetch
  return spy
}

function lastRequestBody(spy: jest.Mock): Record<string, unknown> {
  const init = spy.mock.calls[spy.mock.calls.length - 1][1] as RequestInit
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

describe('resolveCursorCloudConfig', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
  })

  it('returns null until both the key and the named environment are set', () => {
    delete process.env.RESEARCH_CURSOR_API_KEY
    delete process.env.RESEARCH_CURSOR_ENVIRONMENT
    expect(resolveCursorCloudConfig()).toBeNull()

    process.env.RESEARCH_CURSOR_API_KEY = 'crsr_x'
    expect(resolveCursorCloudConfig()).toBeNull()
    expect(describeMissingCursorCloudConfig()).toContain('RESEARCH_CURSOR_ENVIRONMENT')

    process.env.RESEARCH_CURSOR_ENVIRONMENT = 'flow-research'
    expect(resolveCursorCloudConfig()).toEqual({
      apiKey: 'crsr_x',
      environmentName: 'flow-research',
    })
  })

  it('treats whitespace-only values as missing', () => {
    process.env.RESEARCH_CURSOR_API_KEY = '   '
    process.env.RESEARCH_CURSOR_ENVIRONMENT = 'flow-research'
    expect(resolveCursorCloudConfig()).toBeNull()
  })
})

describe('createCursorResearchAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('sends the client-supplied agent id and the named cloud environment', async () => {
    const spy = mockFetch(async () => jsonResponse(200, { id: 'bc-1', run: { id: 'run-9' } }))
    const result = await createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company })

    const body = lastRequestBody(spy)
    expect(body.agentId).toBe('bc-1')
    expect(body.env).toEqual({ type: 'cloud', name: 'flow-research' })
    expect(body.autoCreatePR).toBe(false)
    expect(body).not.toHaveProperty('target')
    expect(body).not.toHaveProperty('model')
    expect(result).toEqual({ agentId: 'bc-1', providerRunId: 'run-9', alreadyExisted: false })
  })

  it('sends the run-selected model when provided', async () => {
    const spy = mockFetch(async () => jsonResponse(200, { id: 'bc-1' }))
    await createCursorResearchAgent({
      config,
      agentId: 'bc-1',
      runId: 'r1',
      company,
      model: 'claude-4-sonnet-thinking',
    })
    expect(lastRequestBody(spy).model).toEqual({ id: 'claude-4-sonnet-thinking' })
  })

  it('hands the agent the Notion instruction and CRM fields, without secrets', async () => {
    const spy = mockFetch(async () => jsonResponse(200, { id: 'bc-1' }))
    await createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company })

    const prompt = (lastRequestBody(spy).prompt as { text: string }).text
    expect(prompt).toContain(RESEARCH_PROMPT_NOTION_URL)
    expect(prompt).toContain('runId:  r1')
    expect(prompt).toContain('firma:  Acme')
    expect(prompt).toContain('branza: IT')
    expect(prompt).toContain('strona: https://acme.example')
    expect(prompt).not.toContain('crsr_secret_key')
    expect(prompt).not.toMatch(/https?:\/\/[^\s]*\/api\/research\/runs/)
    expect(prompt).not.toContain('mainInsight')
  })

  it('treats an id conflict as an already dispatched agent', async () => {
    mockFetch(async () => jsonResponse(409, { error: 'agent_id_conflict' }))
    await expect(
      createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company }),
    ).resolves.toEqual({ agentId: 'bc-1', providerRunId: null, alreadyExisted: true })
  })

  it('classifies rate limits and server errors as retryable', async () => {
    mockFetch(async () => jsonResponse(503, { error: 'unavailable' }))
    await expect(
      createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company }),
    ).rejects.toBeInstanceOf(CursorCloudTransientError)

    mockFetch(async () => jsonResponse(429, { error: 'slow down' }))
    await expect(
      createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company }),
    ).rejects.toBeInstanceOf(CursorCloudTransientError)
  })

  it('classifies a network failure as retryable rather than a failed run', async () => {
    mockFetch(async () => {
      throw new Error('socket hang up')
    })
    await expect(
      createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company }),
    ).rejects.toBeInstanceOf(CursorCloudTransientError)
  })

  it('classifies a rejected request as permanent', async () => {
    mockFetch(async () => jsonResponse(400, { error: 'unknown environment' }))
    await expect(
      createCursorResearchAgent({ config, agentId: 'bc-1', runId: 'r1', company }),
    ).rejects.toBeInstanceOf(CursorCloudPermanentError)
  })
})

describe('getCursorAgentLiveness', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reports a running agent as working', async () => {
    mockFetch(async () => jsonResponse(200, { id: 'bc-1', status: 'RUNNING' }))
    await expect(getCursorAgentLiveness({ config, agentId: 'bc-1' })).resolves.toBe('working')
  })

  it('treats unrecognised non-terminal statuses as working', async () => {
    for (const status of ['ACTIVE', 'CREATING', 'SOMETHING_NEW']) {
      mockFetch(async () => jsonResponse(200, { id: 'bc-1', status }))
      await expect(getCursorAgentLiveness({ config, agentId: 'bc-1' })).resolves.toBe('working')
    }
  })

  it('reports terminal states and a missing agent as finished', async () => {
    for (const status of ['FINISHED', 'ERROR', 'IDLE', 'ARCHIVED']) {
      mockFetch(async () => jsonResponse(200, { id: 'bc-1', status }))
      await expect(getCursorAgentLiveness({ config, agentId: 'bc-1' })).resolves.toBe('finished')
    }

    mockFetch(async () => jsonResponse(404, { error: 'not found' }))
    await expect(getCursorAgentLiveness({ config, agentId: 'bc-1' })).resolves.toBe('finished')
  })

  it('reports unknown when the provider cannot be reached or gives no status', async () => {
    mockFetch(async () => {
      throw new Error('ECONNRESET')
    })
    await expect(getCursorAgentLiveness({ config, agentId: 'bc-1' })).resolves.toBe('unknown')

    mockFetch(async () => jsonResponse(200, { id: 'bc-1' }))
    await expect(getCursorAgentLiveness({ config, agentId: 'bc-1' })).resolves.toBe('unknown')
  })
})

describe('listCursorModels', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns the recommended models from Cursor', async () => {
    mockFetch(async () => jsonResponse(200, {
      items: [
        { id: 'composer-2', displayName: 'Composer 2', description: 'Default' },
        { id: 'claude-4-sonnet-thinking', displayName: 'Claude 4 Sonnet Thinking' },
      ],
    }))
    await expect(listCursorModels(config)).resolves.toEqual([
      { id: 'composer-2', displayName: 'Composer 2', description: 'Default' },
      { id: 'claude-4-sonnet-thinking', displayName: 'Claude 4 Sonnet Thinking', description: null },
    ])
  })

  it('classifies a rejected models request as permanent', async () => {
    mockFetch(async () => jsonResponse(401, { error: 'unauthorized' }))
    await expect(listCursorModels(config)).rejects.toBeInstanceOf(CursorCloudPermanentError)
  })
})

describe('newCursorAgentId', () => {
  it('generates unique prefixed ids', () => {
    const first = newCursorAgentId()
    const second = newCursorAgentId()
    expect(first).toMatch(/^bc-/)
    expect(first).not.toBe(second)
  })
})
