import type { ResearchPersonSnapshot, ResearchRun } from '../data/entities'
import type { ResearchBriefInput, ResearchPersonInput } from '../data/validators'

function blankToNull(value?: string | null): string | null {
  if (typeof value !== 'string') return value ?? null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

export function normalizePersonSnapshot(person?: ResearchPersonInput | null): ResearchPersonSnapshot | null {
  if (!person) return null
  const next: ResearchPersonSnapshot = {
    name: blankToNull(person.name),
    title: blankToNull(person.title),
    email: blankToNull(person.email),
    phone: blankToNull(person.phone),
    note: blankToNull(person.note),
  }
  if (!next.name && !next.title && !next.email && !next.phone && !next.note) return null
  return next
}

export function applyResearchBrief(run: ResearchRun, brief: ResearchBriefInput): void {
  if (brief.mainInsight !== undefined) run.mainInsight = blankToNull(brief.mainInsight)
  if (brief.mainInsightSource !== undefined) run.mainInsightSource = blankToNull(brief.mainInsightSource)
  if (brief.actionItems !== undefined) run.actionItems = blankToNull(brief.actionItems)
  if (brief.specificProblems !== undefined) run.specificProblems = brief.specificProblems ?? null
  if (brief.topNews !== undefined) run.topNews = brief.topNews ?? null
  if (brief.genericProblems !== undefined) run.genericProblems = brief.genericProblems ?? null
  if (brief.timeline !== undefined) run.timeline = brief.timeline ?? null
  if (brief.companyDescription !== undefined) run.companyDescription = blankToNull(brief.companyDescription)
  if (brief.websiteUrl !== undefined) run.websiteUrl = blankToNull(brief.websiteUrl)
  if (brief.estimatedHeadcount !== undefined) run.estimatedHeadcount = blankToNull(brief.estimatedHeadcount)
  if (brief.publicTendersParticipates !== undefined) run.publicTendersParticipates = brief.publicTendersParticipates ?? null
  if (brief.publicTenderSources !== undefined) run.publicTenderSources = brief.publicTenderSources ?? null
  if (brief.contactPerson !== undefined) {
    const person = normalizePersonSnapshot(brief.contactPerson)
    run.contactPerson = person ? { ...person } : null
  }
  if (brief.decisionMaker !== undefined) {
    const person = normalizePersonSnapshot(brief.decisionMaker)
    run.decisionMaker = person ? { ...person } : null
  }
  if (brief.annualRevenue !== undefined) run.annualRevenue = blankToNull(brief.annualRevenue)
  if (brief.profit !== undefined) run.profit = blankToNull(brief.profit)
  if (brief.nip !== undefined) run.nip = blankToNull(brief.nip)
  if (brief.krs !== undefined) run.krs = blankToNull(brief.krs)
  if (brief.relatedCompanies !== undefined) run.relatedCompanies = blankToNull(brief.relatedCompanies)
}
