import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import { z } from 'zod'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { researchBriefSchema } from '../../../../data/validators'
import { completeResearchRun } from '../../../../lib/completeRun'
import { serializeResearchRun } from '../../../../lib/serializeRun'

const logger = createLogger('research').child({ component: 'runs-complete' })

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
    const brief = researchBriefSchema.parse(await req.json().catch(() => ({})))
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const run = await completeResearchRun(em, {
      runId,
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      brief,
    })
    return NextResponse.json({ item: serializeResearchRun(run) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid research brief', details: error.issues }, { status: 400 })
    }
    const status = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 500
    if (status !== 500) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status })
    }
    logger.error('Failed to complete research run', { err: error })
    return NextResponse.json({ error: 'Failed to complete research run' }, { status: 500 })
  }
}
