import type { EntityManager } from '@mikro-orm/postgresql'
import { completeResearchRun, failResearchRun } from './completeRun'
import { LIVE_RUN_STATUSES, MOCK_RESEARCH_DELAY_MS, STALE_LIVE_RUN_ERROR } from './constants'
import { isMockEnrykMode } from './enrykMode'
import { buildEnrykResearchRequest } from './enrykRequest'
import { buildMockResearchBrief } from './mockBrief'
import { nextMockVariant } from './mockVariant'
import { resolveResearchRunEntity } from './orm'
import { isStaleLiveRun, liveRunAgeMs } from './staleRun'

export async function settleLiveRunsForCompany(
  em: EntityManager,
  params: { tenantId: string; organizationId: string; companyId: string },
): Promise<number> {
  const ResearchRun = await resolveResearchRunEntity(em)
  const liveRuns = await em.find(ResearchRun, {
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    companyId: params.companyId,
    status: { $in: [...LIVE_RUN_STATUSES] },
    deletedAt: null,
  })
  let settled = 0
  for (const live of liveRuns) {
    if (isMockEnrykMode()) {
      if (isStaleLiveRun(live)) {
        await failResearchRun(em, {
          runId: live.id,
          tenantId: params.tenantId,
          organizationId: params.organizationId,
          error: STALE_LIVE_RUN_ERROR,
        })
        settled += 1
        continue
      }
      const age = liveRunAgeMs(live)
      if (age == null || age < MOCK_RESEARCH_DELAY_MS) continue
      const variant = await nextMockVariant(em, params)
      await completeResearchRun(em, {
        runId: live.id,
        tenantId: params.tenantId,
        organizationId: params.organizationId,
        brief: buildMockResearchBrief({
          ...buildEnrykResearchRequest(live),
          variant,
        }),
      })
      settled += 1
      continue
    }
    if (!isStaleLiveRun(live)) continue
    await failResearchRun(em, {
      runId: live.id,
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      error: STALE_LIVE_RUN_ERROR,
    })
    settled += 1
  }
  return settled
}
