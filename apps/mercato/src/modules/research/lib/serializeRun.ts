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
  industry: string | null
  status: ResearchRun['status']
  mainInsight: string | null
  mainInsightSource: string | null
  actionItems: string | null
  specificProblems: { text: string; source?: string | null }[] | null
  topNews: { title: string; url?: string | null; source?: string | null }[] | null
  genericProblems: { text: string; source?: string | null }[] | null
  timeline: { event: string; source?: string | null }[] | null
  companyDescription: string | null
  estimatedHeadcount: string | null
  publicTendersParticipates: boolean | null
  publicTenderSources: string[] | null
  contactPerson: ResearchPersonDto | null
  decisionMaker: ResearchPersonDto | null
  annualRevenue: string | null
  profit: string | null
  nip: string | null
  krs: string | null
  relatedCompanies: string | null
  errorMessage: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
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

export function serializeResearchRun(run: ResearchRun): ResearchRunDto {
  return {
    id: run.id,
    companyId: run.companyId,
    companyName: run.companyName ?? null,
    websiteUrl: run.websiteUrl ?? null,
    industry: run.industry ?? null,
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
    contactPerson: serializePerson(run.contactPerson),
    decisionMaker: serializePerson(run.decisionMaker),
    annualRevenue: run.annualRevenue ?? null,
    profit: run.profit ?? null,
    nip: run.nip ?? null,
    krs: run.krs ?? null,
    relatedCompanies: run.relatedCompanies ?? null,
    errorMessage: run.errorMessage ?? null,
    startedAt: run.startedAt ? run.startedAt.toISOString() : null,
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  }
}
