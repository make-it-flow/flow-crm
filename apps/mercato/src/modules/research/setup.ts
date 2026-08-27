import type { EntityManager } from '@mikro-orm/postgresql'
import type { ModuleSetupConfig } from '@open-mercato/shared/modules/setup'
import { installCustomEntitiesFromModules } from '@open-mercato/core/modules/entities/lib/install-from-ce'
import { COMPANY_PROFILE_ENTITY_ID } from './lib/constants'
import { ensureFlowPipeline } from './lib/pipeline'

async function installResearchDefinitions(em: EntityManager, tenantId: string): Promise<void> {
  await installCustomEntitiesFromModules(em, null, {
    entityIds: [COMPANY_PROFILE_ENTITY_ID],
    tenantIds: [tenantId],
    includeGlobal: false,
  })
}

export const setup: ModuleSetupConfig = {
  defaultRoleFeatures: {
    superadmin: ['research.*'],
    admin: ['research.*'],
    employee: ['research.view', 'research.run'],
  },

  async onTenantCreated({ em, tenantId }) {
    await installResearchDefinitions(em, tenantId)
  },

  async seedDefaults({ em, tenantId, organizationId }) {
    await installResearchDefinitions(em, tenantId)
    await ensureFlowPipeline(em, { tenantId, organizationId })
  },
}

export default setup
