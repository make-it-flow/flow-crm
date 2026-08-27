import type { EntityManager } from '@mikro-orm/postgresql'
import { CustomerDictionaryEntry } from '@open-mercato/core/modules/customers/data/entities'

function blankToNull(value?: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export async function resolveIndustryLabel(
  em: EntityManager,
  params: { tenantId: string; organizationId: string; industry?: string | null },
): Promise<string | null> {
  const industry = blankToNull(params.industry)
  if (!industry) return null

  try {
    const entry = await em.findOne(CustomerDictionaryEntry, {
      tenantId: params.tenantId,
      organizationId: params.organizationId,
      kind: 'industries',
      value: industry,
    })
    const label = blankToNull(entry?.label)
    return label ?? industry
  } catch {
    return industry
  }
}
