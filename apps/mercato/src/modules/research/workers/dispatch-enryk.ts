import type { EntityManager } from '@mikro-orm/postgresql'
import type { JobContext, QueuedJob, WorkerMeta } from '@open-mercato/queue'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { completeResearchRun, failResearchRun } from '../lib/completeRun'
import { LIVE_RUN_STATUSES, MOCK_RESEARCH_DELAY_MS } from '../lib/constants'
import { buildEnrykResearchRequest } from '../lib/enrykRequest'
import { buildMockResearchBrief } from '../lib/mockBrief'
import { nextMockVariant } from '../lib/mockVariant'
import { resolveResearchRunEntity } from '../lib/orm'
import { RESEARCH_DISPATCH_QUEUE, type ResearchDispatchPayload } from '../lib/queue'

const logger = createLogger('research').child({ component: 'dispatch-enryk' })

export const metadata: WorkerMeta = {
  queue: RESEARCH_DISPATCH_QUEUE,
  id: 'research:dispatch-enryk',
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

    const mode = (process.env.ENRYK_MODE ?? 'mock').trim().toLowerCase()
    if (mode === 'live') {
      await failResearchRun(em, {
        runId: payload.runId,
        tenantId: payload.tenantId,
        organizationId: payload.organizationId,
        error: 'Enryk niepodłączony',
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
        ...buildEnrykResearchRequest(run),
        variant,
      }),
    })
  } catch (error) {
    logger.error('Research dispatch failed', { runId: payload.runId, err: error })
    await markFailed(em, payload, error)
  }
}
