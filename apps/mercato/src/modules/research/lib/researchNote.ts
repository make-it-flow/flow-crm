import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomerComment, CustomerEntity } from '@open-mercato/core/modules/customers/data/entities'
import { createLogger } from '@open-mercato/shared/lib/logger'

const logger = createLogger('research').child({ component: 'research-note' })

export async function addResearchNote(
  em: EntityManager,
  params: {
    tenantId: string
    organizationId: string
    companyId: string
    body: string
  },
): Promise<void> {
  const body = params.body.trim()
  if (!body) return
  const company = await em.findOne(CustomerEntity, {
    id: params.companyId,
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    kind: 'company',
    deletedAt: null,
  })
  if (!company) {
    logger.warn('Company missing for research note', { companyId: params.companyId })
    return
  }
  const comment = em.create(CustomerComment, {
    tenantId: params.tenantId,
    organizationId: params.organizationId,
    entity: company,
    body,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  em.persist(comment)
  await em.flush()
}
