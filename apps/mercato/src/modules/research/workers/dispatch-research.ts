import type { EntityManager } from '@mikro-orm/postgresql'
import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { completeResearchRun, failResearchRun } from '../lib/completeRun'
import { LIVE_RUN_STATUSES, MOCK_RESEARCH_DELAY_MS } from '../lib/constants'
import {
  createCursorResearchAgent,
  CursorCloudTransientError,
  describeMissingCursorCloudConfig,
  newCursorAgentId,
  resolveCursorCloudConfig,
} from '../lib/cursorCloud'
import { initialDeadline } from '../lib/liveDeadline'
import { buildMockResearchBrief } from '../lib/mockBrief'
import { nextMockVariant } from '../lib/mockVariant'
import { resolveResearchRunEntity } from '../lib/orm'
import { RESEARCH_DISPATCH_QUEUE, type ResearchDispatchPayload } from '../lib/queue'
import { isMockResearchMode } from '../lib/researchMode'
import { buildResearchRequest } from '../lib/researchRequest'

const logger = createLogger('research').child({ component: 'dispatch-research' })

export const metadata: WorkerMeta = {
  queue: RESEARCH_DISPATCH_QUEUE,
  id: 'research:dispatch-research',
  concurrency: 2,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function markFailed(
  em: EntityManager | null,
  payload: ResearchDispatchPayload,
  error: unknown,
): Promise<void> {
  if (!em) return
  const message = error instanceof Error ? error.message : 'Research nie powiódł się'
  try {
    await failResearchRun(em, {
      runId: payload.runId,
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
      error: message,
    })
  } catch (failError) {
    logger.warn('Could not mark research run failed', { runId: payload.runId, err: failError })
  }
}

export default async function handle(
  job: QueuedJob<ResearchDispatchPayload>,
  _ctx: JobContext,
): Promise<void> {
  const payload = job.payload
  let em: EntityManager | null = null
  try {
    const container = await createRequestContainer()
    em = container.resolve('em') as EntityManager
    const ResearchRun = await resolveResearchRunEntity(em)
    const run = await em.findOne(ResearchRun, {
      id: payload.runId,
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
      deletedAt: null,
    })
    if (!run) {
      logger.warn('Research run missing for dispatch', { runId: payload.runId })
      return
    }
    if (!LIVE_RUN_STATUSES.includes(run.status as (typeof LIVE_RUN_STATUSES)[number])) {
      return
    }

    run.status = 'running'
    run.startedAt = run.startedAt ?? new Date()
    await em.flush()

    if (!isMockResearchMode()) {
      const config = resolveCursorCloudConfig()
      if (!config) {
        await failResearchRun(em, {
          runId: payload.runId,
          tenantId: payload.tenantId,
          organizationId: payload.organizationId,
          error: describeMissingCursorCloudConfig(),
        })
        return
      }

      // Persisted before the call so a lost response still leaves a traceable agent, and so a
      // retry reuses the same id instead of paying for a second one.
      const agentId = run.providerAgentId ?? newCursorAgentId()
      run.providerAgentId = agentId
      run.deadlineAt = run.deadlineAt ?? initialDeadline()
      await em.flush()

      const dispatch = await createCursorResearchAgent({
        config,
        agentId,
        runId: run.id,
        company: buildResearchRequest(run),
        model: run.cursorModel ?? null,
      })
      if (dispatch.providerRunId) {
        run.providerRunId = dispatch.providerRunId
        await em.flush()
      }
      logger.info('Research dispatched to Cursor Cloud', {
        runId: run.id,
        agentId: dispatch.agentId,
        providerRunId: dispatch.providerRunId,
        environment: config.environmentName,
        model: run.cursorModel ?? null,
        alreadyExisted: dispatch.alreadyExisted,
      })
      return
    }

    await sleep(MOCK_RESEARCH_DELAY_MS)
    const variant = await nextMockVariant(em, {
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
      companyId: run.companyId,
    })
    await completeResearchRun(em, {
      runId: payload.runId,
      tenantId: payload.tenantId,
      organizationId: payload.organizationId,
      brief: buildMockResearchBrief({
        ...buildResearchRequest(run),
        variant,
      }),
    })
  } catch (error) {
    // Transient provider failures must stay retryable: the run keeps its agent id, so the retry
    // hits a conflict and settles instead of spawning a second paid agent.
    if (error instanceof CursorCloudTransientError) {
      logger.warn('Research dispatch will retry', { runId: payload.runId, err: error })
      throw error
    }
    logger.error('Research dispatch failed', { runId: payload.runId, err: error })
    await markFailed(em, payload, error)
  }
}
