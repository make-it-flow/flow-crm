import type { EntityManager } from '@mikro-orm/postgresql'
import { getOrm } from '@open-mercato/shared/lib/db/mikro'
import { ResearchRun } from '../data/entities'

function isResearchRunMeta(meta: { tableName?: string; className?: string; name?: string; class?: unknown } | null | undefined) {
  if (!meta) return false
  return meta.tableName === 'research_runs'
    || meta.className === 'ResearchRun'
    || meta.name === 'ResearchRun'
    || meta.name === 'research.ResearchRun'
}

function classFromMeta(meta: { class?: unknown } | null | undefined): typeof ResearchRun | null {
  return typeof meta?.class === 'function' ? meta.class as typeof ResearchRun : null
}

function findRegisteredClass(em: EntityManager): typeof ResearchRun | null {
  const metadata = em.getMetadata()
  if (metadata.has(ResearchRun)) return ResearchRun

  const byName = metadata.getByClassName('ResearchRun', false)
  const named = classFromMeta(byName)
  if (named) return named

  for (const meta of metadata.getAll().values()) {
    if (isResearchRunMeta(meta)) {
      const ctor = classFromMeta(meta)
      if (ctor) return ctor
    }
  }
  return null
}

export async function resolveResearchRunEntity(em: EntityManager): Promise<typeof ResearchRun> {
  const fromRequest = findRegisteredClass(em)
  if (fromRequest) return fromRequest

  const orm = await getOrm()
  const fromRoot = findRegisteredClass(orm.em)
  if (fromRoot) return fromRoot

  const alreadyOnTable = [...orm.em.getMetadata().getAll().values()].some((meta) => meta.tableName === 'research_runs')
  if (alreadyOnTable) {
    throw new Error('ResearchRun is registered under a different class identity. Restart the app.')
  }

  orm.discoverEntity(ResearchRun)
  return ResearchRun
}
