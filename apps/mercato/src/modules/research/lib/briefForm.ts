import type { ResearchPersonDto, ResearchRunDto } from './serializeRun'

export type ResearchPersonForm = {
  name: string
  title: string
  email: string
  phone: string
  note: string
}

export type SourcedTextForm = { text: string; source: string }

export type ResearchBriefForm = {
  mainInsight: string
  mainInsightSource: string
  actionItems: string
  specificProblems: SourcedTextForm
  topNews: SourcedTextForm
  genericProblems: SourcedTextForm
  timeline: SourcedTextForm
  contactPerson: ResearchPersonForm
  decisionMaker: ResearchPersonForm
}

export function emptyPersonForm(): ResearchPersonForm {
  return { name: '', title: '', email: '', phone: '', note: '' }
}

function emptySourced(): SourcedTextForm {
  return { text: '', source: '' }
}

function uniqueSources(values: Array<string | null | undefined>): string {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).join('; ')
}

function joinLines(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join('\n\n')
}

function personFromDto(person?: ResearchPersonDto | null): ResearchPersonForm {
  return {
    name: person?.name ?? '',
    title: person?.title ?? '',
    email: person?.email ?? '',
    phone: person?.phone ?? '',
    note: person?.note ?? '',
  }
}

function sourcedFromProblems(items: { text: string; source?: string | null }[] | null | undefined): SourcedTextForm {
  if (!items?.length) return emptySourced()
  return {
    text: joinLines(items.map((item) => item.text)),
    source: uniqueSources(items.map((item) => item.source)),
  }
}

function oneOrNone(item: SourcedTextForm): SourcedTextForm | null {
  const text = item.text.trim()
  if (!text) return null
  return { text, source: item.source.trim() }
}

export function briefFromRun(run: ResearchRunDto | null): ResearchBriefForm {
  return {
    mainInsight: run?.mainInsight ?? '',
    mainInsightSource: run?.mainInsightSource ?? '',
    actionItems: run?.actionItems ?? '',
    specificProblems: sourcedFromProblems(run?.specificProblems),
    topNews: run?.topNews?.length
      ? {
          text: joinLines(run.topNews.map((item) => (item.url ? `${item.title}\n${item.url}` : item.title))),
          source: uniqueSources(run.topNews.map((item) => item.source)),
        }
      : emptySourced(),
    genericProblems: sourcedFromProblems(run?.genericProblems),
    timeline: run?.timeline?.length
      ? {
          text: joinLines(run.timeline.map((item) => item.event)),
          source: uniqueSources(run.timeline.map((item) => item.source)),
        }
      : emptySourced(),
    contactPerson: personFromDto(run?.contactPerson),
    decisionMaker: personFromDto(run?.decisionMaker),
  }
}

export function briefToPayload(brief: ResearchBriefForm) {
  const specific = oneOrNone(brief.specificProblems)
  const news = oneOrNone(brief.topNews)
  const generic = oneOrNone(brief.genericProblems)
  const history = oneOrNone(brief.timeline)
  return {
    mainInsight: brief.mainInsight,
    mainInsightSource: brief.mainInsightSource,
    actionItems: brief.actionItems,
    specificProblems: specific ? [{ text: specific.text, source: specific.source || null }] : [],
    topNews: news ? [{ title: news.text, url: null, source: news.source || null }] : [],
    genericProblems: generic ? [{ text: generic.text, source: generic.source || null }] : [],
    timeline: history ? [{ event: history.text, source: history.source || null }] : [],
    contactPerson: brief.contactPerson,
    decisionMaker: brief.decisionMaker,
  }
}
