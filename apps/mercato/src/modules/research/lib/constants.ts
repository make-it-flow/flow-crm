export const RESEARCH_ENTITY_ID = 'research:research_run'
export const COMPANY_PROFILE_ENTITY_ID = 'customers:customer_company_profile'
export const LIVE_RUN_STATUSES = ['pending', 'running'] as const
export const RESEARCH_POLL_MS = 1000
export const MOCK_RESEARCH_DELAY_MS = 2500
export const STALE_LIVE_RUN_MS = 60_000
export const STALE_LIVE_RUN_ERROR = 'Research nie wrócił'

// A real cloud agent works for minutes, so the mock-sized 60s window would kill every live run
// before it can report back. The deadline is persisted per run; the extension is granted once,
// and only when the provider confirms the agent is still working.
export const LIVE_RUN_DEADLINE_MS = 15 * 60_000
export const LIVE_RUN_EXTENSION_MS = 15 * 60_000
export const LIVE_RUN_DEADLINE_ERROR = 'Research przekroczył czas i został przerwany'
export const LIVE_RUN_AGENT_LOST_ERROR = 'Agent researchu zakończył pracę bez odesłania wyniku'

export const FLOW_PIPELINE_NAME = 'Flow'

export const FLOW_SALES_STAGES = [
  'Pierwszy kontakt',
  'Umówione spotkanie',
  'Discovery',
  'Dowód wartości',
  'Oferta',
  'Negocjacje i plan',
] as const

export const FIRMOGRAPHY_CF_KEYS = {
  nip: 'nip',
  krs: 'krs',
  profit: 'profit',
  nda: 'nda',
  ndaDate: 'nda_date',
  ndaDriveUrl: 'nda_drive_url',
  relatedCompanies: 'related_companies',
} as const
