import type { ResearchPersonSnapshot, ResearchRun } from '../data/entities'

export type ResearchPersonDto = {
  name: string | null
  title: string | null
  email: string | null
  phone: string | null
  note: string | null
}

export type ResearchRunDto = {
  id: string
  companyId: string
  companyName: string | null
  websiteUrl: string | null
  status: ResearchRun['status']
  mainInsight: string | null
  mainInsightSource: string | null
  actionItems: string | null
  specificProblems: { text: string; source?: string | null }[] | null
  topNews: { title: string; url?: string | null; source?: string | null }[] | null
  genericProblems: { text: string; source?: string | null }[] | null
  timeline: { date: string; event: string; source?: string | null }[] | null
  companyDescription: string | null
  estimatedHeadcount: string | null
  publicTendersParticipates: boolean | null
  publicTenderSources: string[] | null
  fitVerdict: string | null
  talkingPoints: string | null
  callScript: string | null
  emailDraft: string | null
  contactPerson: ResearchPersonDto | null
  decisionMaker: ResearchPersonDto | null
  annualRevenue: string | null
  profit: string | null
  nip: string | null
  krs: string | null
  relatedCompanies: string | null
  salesStageIndex: number | null
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
}

function briefText(run: ResearchRun, key: string): string | null {
  const value = run.briefJson?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function briefStageIndex(run: ResearchRun): number | null {
  const raw = run.briefJson?.salesStageIndex
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isInteger(value) || value < 0 || value > 5) return null
  return value
}

function serializePerson(person?: ResearchPersonSnapshot | null): ResearchPersonDto | null {
  if (!person || typeof person !== 'object') return null
  const name = typeof person.name === 'string' ? person.name : null
  const title = typeof person.title === 'string' ? person.title : null
  const email = typeof person.email === 'string' ? person.email : null
  const phone = typeof person.phone === 'string' ? person.phone : null
  const note = typeof person.note === 'string' ? person.note : null
  if (!name && !title && !email && !phone && !note) return null
  return { name, title, email, phone, note }
}

function personFromBrief(run: ResearchRun, key: 'contactPerson' | 'decisionMaker'): ResearchPersonDto | null {
  return serializePerson(run[key]) ?? serializePerson(run.briefJson?.[key] as ResearchPersonSnapshot | null)
}

export function serializeResearchRun(run: ResearchRun): ResearchRunDto {
  return {
    id: run.id,
    companyId: run.companyId,
    companyName: run.companyName ?? null,
    websiteUrl: briefText(run, 'websiteUrl') ?? run.websiteUrl ?? null,
    status: run.status,
    mainInsight: run.mainInsight ?? null,
    mainInsightSource: run.mainInsightSource ?? null,
    actionItems: run.actionItems ?? null,
    specificProblems: run.specificProblems ?? null,
    topNews: run.topNews ?? null,
    genericProblems: run.genericProblems ?? null,
    timeline: run.timeline ?? null,
    companyDescription: run.companyDescription ?? null,
    estimatedHeadcount: run.estimatedHeadcount ?? null,
    publicTendersParticipates: run.publicTendersParticipates ?? null,
    publicTenderSources: run.publicTenderSources ?? null,
    fitVerdict: run.fitVerdict ?? null,
    talkingPoints: run.talkingPoints ?? null,
    callScript: run.callScript ?? null,
    emailDraft: run.emailDraft ?? null,
    contactPerson: personFromBrief(run, 'contactPerson'),
    decisionMaker: personFromBrief(run, 'decisionMaker'),
    annualRevenue: briefText(run, 'annualRevenue'),
    profit: briefText(run, 'profit'),
    nip: briefText(run, 'nip'),
    krs: briefText(run, 'krs'),
    relatedCompanies: briefText(run, 'relatedCompanies'),
    salesStageIndex: briefStageIndex(run),
    errorMessage: run.errorMessage ?? null,
    startedAt: run.startedAt ? run.startedAt.toISOString() : null,
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }
}
