import { z } from 'zod'

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const optionalText = z.preprocess(emptyToNull, z.string().nullable().optional())

const sourcedTextSchema = z.object({
  text: z.string().min(1),
  source: optionalText,
})

const newsItemSchema = z.object({
  title: z.string().min(1),
  url: optionalText,
  source: optionalText,
})

const timelineItemSchema = z.object({
  event: z.string().min(1),
  source: optionalText,
})

export const researchPersonSchema = z.object({
  name: optionalText,
  title: optionalText,
  email: optionalText,
  phone: optionalText,
  note: optionalText,
})

export const researchRunCreateSchema = z.object({
  companyId: z.string().uuid(),
})

export const researchRunListQuerySchema = z.object({
  companyId: z.string().uuid(),
})

export const researchBriefSchema = z.object({
  mainInsight: optionalText,
  mainInsightSource: optionalText,
  actionItems: optionalText,
  specificProblems: z.array(sourcedTextSchema).nullable().optional(),
  topNews: z.array(newsItemSchema).nullable().optional(),
  genericProblems: z.array(sourcedTextSchema).nullable().optional(),
  timeline: z.array(timelineItemSchema).nullable().optional(),
  companyDescription: optionalText,
  websiteUrl: optionalText,
  estimatedHeadcount: optionalText,
  publicTendersParticipates: z.boolean().nullable().optional(),
  publicTenderSources: z.array(z.string()).nullable().optional(),
  contactPerson: researchPersonSchema.nullable().optional(),
  decisionMaker: researchPersonSchema.nullable().optional(),
  annualRevenue: optionalText,
  profit: optionalText,
  nip: optionalText,
  krs: optionalText,
  relatedCompanies: optionalText,
  note: optionalText,
}).strict()

export const researchRunUpdateSchema = researchBriefSchema.extend({
  companyId: z.string().uuid(),
}).strict()

export const researchRunFailSchema = z.object({
  error: z.string().min(1),
})

export type ResearchRunCreateInput = z.infer<typeof researchRunCreateSchema>
export type ResearchBriefInput = z.infer<typeof researchBriefSchema>
export type ResearchRunUpdateInput = z.infer<typeof researchRunUpdateSchema>
export type ResearchPersonInput = z.infer<typeof researchPersonSchema>
