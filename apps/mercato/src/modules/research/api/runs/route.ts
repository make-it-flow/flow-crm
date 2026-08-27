import { after, NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { CustomerCompanyProfile, CustomerEntity } from '@open-mercato/core/modules/customers/data/entities'
import { researchRunCreateSchema, researchRunListQuerySchema, researchRunUpdateSchema } from '../../data/validators'
import { applyResearchBrief } from '../../lib/brief'
import { failResearchRun } from '../../lib/completeRun'
import { LIVE_RUN_STATUSES } from '../../lib/constants'
import { isMockEnrykMode } from '../../lib/enrykMode'
import { resolveIndustryLabel } from '../../lib/industry'
import { settleLiveRunsForCompany } from '../../lib/expireStale'
import { resolveResearchRunEntity } from '../../lib/orm'
import { finishMockResearchRun } from '../../lib/simulateMock'
import { getResearchDispatchQueue } from '../../lib/queue'
import { serializeResearchRun } from '../../lib/serializeRun'

const logger = createLogger('research').child({ component: 'runs-route' })

export const metadata = {
  GET: { requireAuth: true, requireFeatures: ['research.view'] },
  POST: { requireAuth: true, requireFeatures: ['research.run'] },
  PUT: { requireAuth: true, requireFeatures: ['research.view'] },
}

async function resolveScope(req: Request) {
  const auth = await getAuthFromRequest(req)
  if (!auth) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!auth.tenantId) return { error: NextResponse.json({ error: 'Tenant required' }, { status: 400 }) }
  if (!auth.orgId) return { error: NextResponse.json({ error: 'Organization scope required' }, { status: 400 }) }
  return { auth, tenantId: auth.tenantId, organizationId: auth.orgId }
}

export async function GET(req: Request) {
  try {
    const scope = await resolveScope(req)
    if ('error' in scope && scope.error) return scope.error
    const { tenantId, organizationId } = scope
    const url = new URL(req.url)
    const query = researchRunListQuerySchema.parse({ companyId: url.searchParams.get('companyId') })
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    await settleLiveRunsForCompany(em, {
      tenantId,
      organizationId,
      companyId: query.companyId,
    })
    const ResearchRun = await resolveResearchRunEntity(em)
    const run = await em.findOne(
      ResearchRun,
      {
        tenantId,
        organizationId,
        companyId: query.companyId,
        deletedAt: null,
      },
      { orderBy: { createdAt: 'DESC' } },
    )
    return NextResponse.json({ item: run ? serializeResearchRun(run) : null })
  } catch (error) {
    logger.error('Failed to load research run', { err: error })
    return NextResponse.json({ error: 'Failed to load research run' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const scope = await resolveScope(req)
    if ('error' in scope && scope.error) return scope.error
    const { tenantId, organizationId } = scope
    const body = await req.json().catch(() => ({}))
    const input = researchRunCreateSchema.parse(body)
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager

    const company = await em.findOne(CustomerEntity, {
      id: input.companyId,
      tenantId,
      organizationId,
      kind: 'company',
      deletedAt: null,
    })
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const ResearchRun = await resolveResearchRunEntity(em)
    await settleLiveRunsForCompany(em, {
      tenantId,
      organizationId,
      companyId: company.id,
    })
    const live = await em.findOne(ResearchRun, {
      tenantId,
      organizationId,
      companyId: company.id,
      status: { $in: [...LIVE_RUN_STATUSES] },
      deletedAt: null,
    })
    if (live) {
      return NextResponse.json({ error: 'Research already running', runId: live.id, status: live.status }, { status: 409 })
    }

    const profile = await em.findOne(CustomerCompanyProfile, { entity: company })
    const industry = await resolveIndustryLabel(em, {
      tenantId,
      organizationId,
      industry: profile?.industry,
    })
    const run = em.create(ResearchRun, {
      tenantId,
      organizationId,
      companyId: company.id,
      companyName: company.displayName,
      websiteUrl: profile?.websiteUrl ?? null,
      industry,
      status: 'pending',
    })
    em.persist(run)
    await em.flush()

    try {
      await getResearchDispatchQueue().enqueue({
        runId: run.id,
        tenantId,
        organizationId,
      })
    } catch (error) {
      logger.warn('Failed to enqueue research dispatch', { runId: run.id, err: error })
      if (!isMockEnrykMode()) {
        await failResearchRun(em, {
          runId: run.id,
          tenantId,
          organizationId,
          error: 'Nie udało się wstawić researchu do kolejki',
        })
        return NextResponse.json({ error: 'Failed to start research run' }, { status: 500 })
      }
    }

    if (isMockEnrykMode()) {
      after(() => {
        void finishMockResearchRun({
          runId: run.id,
          tenantId,
          organizationId,
          companyId: company.id,
          companyName: run.companyName ?? company.displayName,
          websiteUrl: run.websiteUrl,
          industry: run.industry,
        })
      })
    }

    return NextResponse.json({ runId: run.id, status: run.status, item: serializeResearchRun(run) }, { status: 202 })
  } catch (error) {
    logger.error('Failed to start research run', { err: error })
    return NextResponse.json({ error: 'Failed to start research run' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const scope = await resolveScope(req)
    if ('error' in scope && scope.error) return scope.error
    const { tenantId, organizationId } = scope
    const body = await req.json().catch(() => ({}))
    const input = researchRunUpdateSchema.parse(body)
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager

    const company = await em.findOne(CustomerEntity, {
      id: input.companyId,
      tenantId,
      organizationId,
      kind: 'company',
      deletedAt: null,
    })
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const ResearchRun = await resolveResearchRunEntity(em)
    let run = await em.findOne(
      ResearchRun,
      {
        tenantId,
        organizationId,
        companyId: company.id,
        deletedAt: null,
      },
      { orderBy: { updatedAt: 'DESC' } },
    )

    const now = new Date()
    if (!run) {
      const profile = await em.findOne(CustomerCompanyProfile, { entity: company })
      const industry = await resolveIndustryLabel(em, {
        tenantId,
        organizationId,
        industry: profile?.industry,
      })
      run = em.create(ResearchRun, {
        tenantId,
        organizationId,
        companyId: company.id,
        companyName: company.displayName,
        websiteUrl: profile?.websiteUrl ?? null,
        industry,
        status: 'done',
        startedAt: now,
        finishedAt: now,
      })
      em.persist(run)
    }

    const { companyId: _companyId, ...brief } = input
    applyResearchBrief(run, brief)
    run.updatedAt = now
    await em.flush()
    return NextResponse.json({ item: serializeResearchRun(run) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid research brief', details: error.issues }, { status: 400 })
    }
    logger.error('Failed to update research run', { err: error })
    return NextResponse.json({ error: 'Failed to update research run' }, { status: 500 })
  }
}
