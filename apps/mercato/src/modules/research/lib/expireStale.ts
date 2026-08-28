import type { EntityManager } from '@mikro-orm/postgresql'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { completeResearchRun, failResearchRun } from './completeRun'
import {
  LIVE_RUN_AGENT_LOST_ERROR,
  LIVE_RUN_DEADLINE_ERROR,
  LIVE_RUN_STATUSES,
  MOCK_RESEARCH_DELAY_MS,
  STALE_LIVE_RUN_ERROR,
} from './constants'
import { getCursorAgentLiveness, resolveCursorCloudConfig } from './cursorCloud'
import { extendedDeadline, hasSpentExtension, isPastDeadline } from './liveDeadline'
import { buildMockResearchBrief } from './mockBrief'
import { nextMockVariant } from './mockVariant'
import { resolveResearchRunEntity } from './orm'
import { isMockResearchMode } from './researchMode'
import { buildResearchRequest } from './researchRequest'
import { isStaleLiveRun, liveRunAgeMs, type StaleRunInput } from './staleRun'

const logger = createLogger('research').child({ component: 'expire-stale' })

type Scope = { tenantId: string; organizationId: string; companyId: string }

type MockSettleInput = StaleRunInput & {
  id: string
  companyName?: string | null
  industry?: string | null
  websiteUrl?: string | null
}

async function settleMockRun(
  em: EntityManager,
  scope: Scope,
  live: MockSettleInput,
): Promise<boolean> {
  if (isStaleLiveRun(live)) {
    await failResearchRun(em, {
      runId: live.id,
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      error: STALE_LIVE_RUN_ERROR,
    })
    return true
  }
  const age = liveRunAgeMs(live)
  if (age == null || age < MOCK_RESEARCH_DELAY_MS) return false
  const variant = await nextMockVariant(em, scope)
  await completeResearchRun(em, {
    runId: live.id,
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    brief: buildMockResearchBrief({
      ...buildResearchRequest(live),
      variant,
    }),
  })
  return true
}

export async function settleLiveRunsForCompany(
  em: EntityManager,
  params: Scope,
): Promise<number> {
  const ResearchRun = await resolveResearchRunEntity(em)
  const liveRuns = await em.find(ResearchRun, {
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    companyId: params.companyId,
    status: { $in: [...LIVE_RUN_STATUSES] },
    deletedAt: null,
  })
  const mockMode = isMockResearchMode()
  const config = mockMode ? null : resolveCursorCloudConfig()
  let settled = 0

  for (const live of liveRuns) {
    if (mockMode) {
      if (await settleMockRun(em, params, live)) settled += 1
      continue
    }
    if (!isPastDeadline(live)) continue

    // The extension is granted once, and only when the provider confirms the agent is alive.
    // An unreachable provider leaves the run untouched rather than killing usable work.
    if (!hasSpentExtension(live) && live.providerAgentId && config) {
      const liveness = await getCursorAgentLiveness({ config, agentId: live.providerAgentId })
      if (liveness === 'unknown') {
        logger.warn('Cursor Cloud status unavailable, leaving run untouched', {
          runId: live.id,
          agentId: live.providerAgentId,
        })
        continue
      }
      if (liveness === 'working') {
        const now = new Date()
        live.deadlineAt = extendedDeadline(now.getTime())
        live.deadlineExtendedAt = now
        live.updatedAt = now
        await em.flush()
        logger.info('Research deadline extended once', {
          runId: live.id,
          agentId: live.providerAgentId,
          deadlineAt: live.deadlineAt.toISOString(),
        })
        continue
      }
      await failResearchRun(em, {
        runId: live.id,
        tenantId: params.tenantId,
        organizationId: params.organizationId,
        error: LIVE_RUN_AGENT_LOST_ERROR,
      })
      settled += 1
      continue
    }

    await failResearchRun(em, {
      runId: live.id,
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      error: LIVE_RUN_DEADLINE_ERROR,
    })
    settled += 1
  }
  return settled
}
