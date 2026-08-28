import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { readJsonSafe } from '@open-mercato/shared/lib/http/readJsonSafe'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { researchBriefSchema } from '../../../../data/validators'
import { completeResearchRun, failResearchRun } from '../../../../lib/completeRun'
import { serializeResearchRun } from '../../../../lib/serializeRun'

const logger = createLogger('research').child({ component: 'runs-complete' })
const INVALID_CALLBACK_ERROR_KEY = 'research.profile.invalidCallbackPayload'

export const metadata = {
  POST: { requireAuth: true, requireFeatures: ['research.run'] },
}

export async function POST(req: Request, ctx: { params?: { id?: string } }) {
  try {
    const auth = await getAuthFromRequest(req)
    if (!auth?.tenantId || !auth.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const runId = ctx.params?.id
    if (!runId) return NextResponse.json({ error: 'Missing run id' }, { status: 400 })
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const parsedBrief = researchBriefSchema.safeParse(await readJsonSafe<unknown>(req, null))
    if (!parsedBrief.success) {
      logger.warn('Research callback payload failed validation', {
        runId,
        tenantId: auth.tenantId,
        organizationId: auth.orgId,
        issues: parsedBrief.error.issues,
      })
      try {
        await failResearchRun(em, {
          runId,
          tenantId: auth.tenantId,
          organizationId: auth.orgId,
          error: INVALID_CALLBACK_ERROR_KEY,
        })
      } catch (markFailedError) {
        logger.warn('Could not mark invalid research callback as failed', {
          runId,
          err: markFailedError,
        })
      }
      return NextResponse.json(
        {
          error: 'Invalid research brief',
          code: 'invalid_research_brief',
          details: parsedBrief.error.issues,
        },
        { status: 400 },
      )
    }
    const run = await completeResearchRun(em, {
      runId,
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      brief: parsedBrief.data,
    })
    return NextResponse.json({ item: serializeResearchRun(run) })
  } catch (error) {
    const status = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 500
    if (status !== 500) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status })
    }
    logger.error('Failed to complete research run', { err: error })
    return NextResponse.json({ error: 'Failed to complete research run' }, { status: 500 })
  }
}
