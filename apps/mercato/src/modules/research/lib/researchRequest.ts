export type ResearchRequest = {
  companyName: string
  industry: string | null
  websiteUrl: string | null
}

function blankToNull(value?: string | null): string | null {
  if (typeof value !== 'string') return value ?? null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function buildResearchRequest(input: {
  companyName?: string | null
  industry?: string | null
  websiteUrl?: string | null
}): ResearchRequest {
  return {
    companyName: (input.companyName ?? '').trim() || 'Firma',
    industry: blankToNull(input.industry),
    websiteUrl: blankToNull(input.websiteUrl),
  }
}
