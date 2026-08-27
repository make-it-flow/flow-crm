import { NextResponse } from 'next/server'
import type { EntityManager } from '@mikro-orm/postgresql'
import { getAuthFromRequest } from '@open-mercato/shared/lib/auth/server'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { researchRunFailSchema } from '../../../../data/validators'
import { failResearchRun } from '../../../../lib/completeRun'
import { serializeResearchRun } from '../../../../lib/serializeRun'

const logger = createLogger('research').child({ component: 'runs-fail' })

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
    const body = researchRunFailSchema.parse(await req.json().catch(() => ({})))
    const container = await createRequestContainer()
    const em = container.resolve('em') as EntityManager
    const run = await failResearchRun(em, {
      runId,
      tenantId: auth.tenantId,
      organizationId: auth.orgId,
      error: body.error,
    })
    return NextResponse.json({ item: serializeResearchRun(run) })
  } catch (error) {
    const status = typeof (error as { status?: number }).status === 'number' ? (error as { status: number }).status : 500
    if (status !== 500) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status })
    }
    logger.error('Failed to fail research run', { err: error })
    return NextResponse.json({ error: 'Failed to fail research run' }, { status: 500 })
  }
}
