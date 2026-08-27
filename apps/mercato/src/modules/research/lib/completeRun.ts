import type { EntityManager } from '@mikro-orm/postgresql'
import type { ResearchRun } from '../data/entities'
import type { ResearchBriefInput } from '../data/validators'
import { applyResearchBrief } from './brief'
import { LIVE_RUN_STATUSES } from './constants'
import { resolveResearchRunEntity } from './orm'
import { addResearchNote } from './researchNote'

export async function completeResearchRun(
  em: EntityManager,
  params: {
    runId: string
    tenantId: string
    organizationId: string
    brief: ResearchBriefInput
  },
): Promise<ResearchRun> {
  const ResearchRun = await resolveResearchRunEntity(em)
  const run = await em.findOne(ResearchRun, {
    id: params.runId,
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    deletedAt: null,
  })
  if (!run) {
    throw Object.assign(new Error('Research run not found'), { status: 404 })
  }
  if (!LIVE_RUN_STATUSES.includes(run.status as (typeof LIVE_RUN_STATUSES)[number])) {
    throw Object.assign(new Error('Research run is not pending or running'), { status: 409 })
  }

  run.status = 'done'
  applyResearchBrief(run, params.brief)
  run.errorMessage = null
  run.finishedAt = new Date()
  run.updatedAt = run.finishedAt
  if (!run.startedAt) run.startedAt = run.finishedAt
  await em.flush()
  const note = typeof params.brief.note === 'string' ? params.brief.note.trim() : ''
  if (note) {
    try {
      await addResearchNote(em, {
        tenantId: params.tenantId,
        organizationId: params.organizationId,
        companyId: run.companyId,
        body: note,
      })
    } catch {
      // Brief is already saved. A missing note must not roll back the run.
    }
  }
  return run
}

export async function failResearchRun(
  em: EntityManager,
  params: {
    runId: string
    tenantId: string
    organizationId: string
    error: string
  },
): Promise<ResearchRun> {
  const ResearchRun = await resolveResearchRunEntity(em)
  const run = await em.findOne(ResearchRun, {
    id: params.runId,
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    deletedAt: null,
  })
  if (!run) {
    throw Object.assign(new Error('Research run not found'), { status: 404 })
  }
  if (!LIVE_RUN_STATUSES.includes(run.status as (typeof LIVE_RUN_STATUSES)[number])) {
    throw Object.assign(new Error('Research run is not pending or running'), { status: 409 })
  }
  run.status = 'failed'
  run.errorMessage = params.error
  run.finishedAt = new Date()
  if (!run.startedAt) run.startedAt = run.finishedAt
  await em.flush()
  return run
}
