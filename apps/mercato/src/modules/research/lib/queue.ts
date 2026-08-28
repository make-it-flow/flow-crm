import { createModuleQueue, type Queue } from '@open-mercato/queue'

export const RESEARCH_DISPATCH_QUEUE = 'research-dispatch'

export type ResearchDispatchPayload = {
  runId: string
  tenantId: string
  organizationId: string
}

const GLOBAL_KEY = '__research_dispatch_queue__' as const

export function getResearchDispatchQueue(): Queue<ResearchDispatchPayload> {
  const g = globalThis as Record<string, unknown>
  const existing = g[GLOBAL_KEY] as Queue<ResearchDispatchPayload> | undefined
  if (existing) return existing
  const created = createModuleQueue<ResearchDispatchPayload>(RESEARCH_DISPATCH_QUEUE, { concurrency: 2 })
  g[GLOBAL_KEY] = created
  return created
}
