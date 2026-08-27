import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomerPipeline, CustomerPipelineStage } from '@open-mercato/core/modules/customers/data/entities'
import { FLOW_PIPELINE_NAME, FLOW_SALES_STAGES } from './constants'

export async function ensureFlowPipeline(
  em: EntityManager,
  scope: { tenantId: string; organizationId: string },
): Promise<void> {
  const existing = await em.findOne(CustomerPipeline, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    name: FLOW_PIPELINE_NAME,
  })
  if (existing) return

  const pipeline = em.create(CustomerPipeline, {
    tenantId: scope.tenantId,
    organizationId: scope.organizationId,
    name: FLOW_PIPELINE_NAME,
    isDefault: false,
  })
  em.persist(pipeline)
  await em.flush()

  for (let index = 0; index < FLOW_SALES_STAGES.length; index += 1) {
    em.persist(em.create(CustomerPipelineStage, {
      tenantId: scope.tenantId,
      organizationId: scope.organizationId,
      pipelineId: pipeline.id,
      label: FLOW_SALES_STAGES[index],
      order: index,
    }))
  }
  await em.flush()
}
