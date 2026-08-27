import type { EntityManager } from '@mikro-orm/postgresql'
import { resolveResearchRunEntity } from './orm'

export async function nextMockVariant(
  em: EntityManager,
  params: { tenantId: string; organizationId: string; companyId: string },
): Promise<number> {
  const ResearchRun = await resolveResearchRunEntity(em)
  const count = await em.count(ResearchRun, {
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    companyId: params.companyId,
    deletedAt: null,
  })
  return Math.max(1, count)
}
