import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/decorators/legacy'

export type ResearchRunStatus = 'pending' | 'running' | 'done' | 'failed'

export type ResearchPersonSnapshot = {
  name?: string | null
  title?: string | null
  email?: string | null
  phone?: string | null
  note?: string | null
}

@Entity({ tableName: 'research_runs' })
@Index({
  name: 'research_runs_scope_company_updated_idx',
  properties: ['tenantId', 'organizationId', 'companyId', 'updatedAt'],
})
@Index({
  name: 'research_runs_scope_company_status_idx',
  properties: ['tenantId', 'organizationId', 'companyId', 'status'],
})
export class ResearchRun {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string

  @Property({ name: 'organization_id', type: 'uuid' })
  organizationId!: string

  @Property({ name: 'company_id', type: 'uuid' })
  companyId!: string

  @Property({ name: 'company_name', type: 'text', nullable: true })
  companyName?: string | null

  @Property({ name: 'website_url', type: 'text', nullable: true })
  websiteUrl?: string | null

  @Property({ name: 'industry', type: 'text', nullable: true })
  industry?: string | null

  @Property({ type: 'text', default: 'pending' })
  status: ResearchRunStatus = 'pending'

  @Property({ name: 'main_insight', type: 'text', nullable: true })
  mainInsight?: string | null

  @Property({ name: 'main_insight_source', type: 'text', nullable: true })
  mainInsightSource?: string | null

  @Property({ name: 'action_items', type: 'text', nullable: true })
  actionItems?: string | null

  @Property({ name: 'specific_problems', type: 'json', nullable: true })
  specificProblems?: { text: string; source?: string | null }[] | null

  @Property({ name: 'top_news', type: 'json', nullable: true })
  topNews?: { title: string; url?: string | null; source?: string | null }[] | null

  @Property({ name: 'generic_problems', type: 'json', nullable: true })
  genericProblems?: { text: string; source?: string | null }[] | null

  @Property({ type: 'json', nullable: true })
  timeline?: { event: string; source?: string | null }[] | null

  @Property({ name: 'company_description', type: 'text', nullable: true })
  companyDescription?: string | null

  @Property({ name: 'estimated_headcount', type: 'text', nullable: true })
  estimatedHeadcount?: string | null

  @Property({ name: 'public_tenders_participates', type: 'boolean', nullable: true })
  publicTendersParticipates?: boolean | null

  @Property({ name: 'public_tender_sources', type: 'json', nullable: true })
  publicTenderSources?: string[] | null

  @Property({ name: 'contact_person', type: 'json', nullable: true })
  contactPerson?: ResearchPersonSnapshot | null

  @Property({ name: 'decision_maker', type: 'json', nullable: true })
  decisionMaker?: ResearchPersonSnapshot | null

  @Property({ name: 'annual_revenue', type: 'text', nullable: true })
  annualRevenue?: string | null

  @Property({ name: 'profit', type: 'text', nullable: true })
  profit?: string | null

  @Property({ name: 'nip', type: 'text', nullable: true })
  nip?: string | null

  @Property({ name: 'krs', type: 'text', nullable: true })
  krs?: string | null

  @Property({ name: 'related_companies', type: 'text', nullable: true })
  relatedCompanies?: string | null

  @Property({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null

  // Written before the provider is called, so a lost response never leaves an untracked agent.
  @Property({ name: 'cursor_model', type: 'text', nullable: true })
  cursorModel?: string | null

  @Property({ name: 'provider_agent_id', type: 'text', nullable: true })
  providerAgentId?: string | null

  @Property({ name: 'provider_run_id', type: 'text', nullable: true })
  providerRunId?: string | null

  @Property({ name: 'deadline_at', type: Date, nullable: true })
  deadlineAt?: Date | null

  // Non-null means the single allowed extension has been spent.
  @Property({ name: 'deadline_extended_at', type: Date, nullable: true })
  deadlineExtendedAt?: Date | null

  @Property({ name: 'started_at', type: Date, nullable: true })
  startedAt?: Date | null

  @Property({ name: 'finished_at', type: Date, nullable: true })
  finishedAt?: Date | null

  @Property({ name: 'created_at', type: Date, onCreate: () => new Date() })
  createdAt: Date = new Date()

  @Property({ name: 'updated_at', type: Date, onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt?: Date | null
}
