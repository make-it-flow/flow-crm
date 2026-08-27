import type { EntityManager } from '@mikro-orm/postgresql'
import { createRequestContainer } from '@open-mercato/shared/lib/di/container'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { completeResearchRun, failResearchRun } from './completeRun'
import { MOCK_RESEARCH_DELAY_MS } from './constants'
import { buildMockResearchBrief } from './mockBrief'
import { nextMockVariant } from './mockVariant'

const logger = createLogger('research').child({ component: 'simulate-mock' })

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function finishMockResearchRun(params: {
  runId: string
  tenantId: string
  organizationId: string
  companyId: string
  companyName: string
  websiteUrl?: string | null
}): Promise<void> {
  await sleep(MOCK_RESEARCH_DELAY_MS)
  const container = await createRequestContainer()
  const em = container.resolve('em') as EntityManager
  const variant = await nextMockVariant(em, {
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    companyId: params.companyId,
  })
  try {
    await completeResearchRun(em, {
      runId: params.runId,
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      brief: buildMockResearchBrief({
        companyName: params.companyName,
        websiteUrl: params.websiteUrl,
        variant,
      }),
    })
  } catch (error) {
    logger.warn('Mock research complete failed', { runId: params.runId, err: error })
    try {
      await failResearchRun(em, {
        runId: params.runId,
        tenantId: params.tenantId,
        organizationId: params.organizationId,
        error: error instanceof Error ? error.message : 'Research nie powiódł się',
      })
    } catch (failError) {
      logger.warn('Could not mark mock research failed', { runId: params.runId, err: failError })
    }
  }
}
