"use client"

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { createTranslatorWithFallback } from '@open-mercato/shared/lib/i18n/translate'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { Page, PageBody } from '@open-mercato/ui/backend/Page'
import { flash } from '@open-mercato/ui/backend/FlashMessages'
import { useConfirmDialog } from '@open-mercato/ui/backend/confirm-dialog'
import { useGuardedMutation } from '@open-mercato/ui/backend/injection/useGuardedMutation'
import { apiCallOrThrow, readApiResultOrThrow, withScopedApiRequestHeaders } from '@open-mercato/ui/backend/utils/apiCall'
import { buildOptimisticLockHeader } from '@open-mercato/ui/backend/utils/optimisticLock'
import { deleteCrud, updateCrud } from '@open-mercato/ui/backend/utils/crud'
import { surfaceRecordConflict } from '@open-mercato/ui/backend/conflicts'
import {
  ErrorMessage,
  LoadingMessage,
  NotesSection,
  RecordNotFoundState,
} from '@open-mercato/ui/backend/detail'
import { Button } from '@open-mercato/ui/primitives/button'
import { CompanyDetailHeader } from '@open-mercato/core/modules/customers/components/detail/CompanyDetailHeader'
import { CompanyKpiBar } from '@open-mercato/core/modules/customers/components/detail/CompanyKpiBar'
import { CompanyPeopleSection, type CompanyPersonSummary } from '@open-mercato/core/modules/customers/components/detail/CompanyPeopleSection'
import { createCustomerNotesAdapter } from '@open-mercato/core/modules/customers/components/detail/notesAdapter'
import type { TagSummary } from '@open-mercato/core/modules/customers/components/detail/types'
import type { TagsSectionController } from '@open-mercato/ui/backend/detail'
import {
  buildCompanyEditPayload,
  type CompanyEditFormValues,
  type CompanyOverview,
} from '@open-mercato/core/modules/customers/components/formConfig'
import { coerceDisplayName } from '@open-mercato/core/modules/customers/lib/displayName'
import { isOpenDealStatus } from '@open-mercato/core/modules/customers/lib/dealStatus'
import { ICON_SUGGESTIONS, renderDictionaryColor, renderDictionaryIcon } from '@open-mercato/core/modules/dictionaries/components/dictionaryAppearance'
import { readMarkdownPreferenceCookie, writeMarkdownPreferenceCookie } from '@open-mercato/core/modules/customers/lib/markdownPreference'
import { ClassificationSection } from './ClassificationSection'
import { ContactCards } from './ContactCards'
import { FirmographyGrid, type FirmographyValues } from './FirmographyGrid'
import { ResearchLeftColumn, ResearchRightColumn } from './ResearchColumns'
import { SalesStageStepper } from './SalesStageStepper'
import { briefFromRun, briefToPayload, type ResearchBriefForm } from '../lib/briefForm'
import { FIRMOGRAPHY_CF_KEYS, FLOW_SALES_STAGES, RESEARCH_POLL_MS } from '../lib/constants'
import { readFirmographyCustomFields, toCrmAnnualRevenue, toCrmWebsiteUrl, toDateInputValue } from '../lib/customFields'
import type { ResearchRunDto } from '../lib/serializeRun'
import { isFreshLiveRun, isLiveRunStatus } from '../lib/staleRun'

const logger = createLogger('research').child({ component: 'FlowCompanyProfile' })

type CompanyAddress = {
  id: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  country?: string | null
  isPrimary?: boolean | null
}

type CompanyProfileData = CompanyOverview & {
  addresses?: CompanyAddress[]
  company: CompanyOverview['company'] & { updatedAt?: string | null }
}

type PipelineStageRow = {
  id: string
  pipelineId: string
  label: string
  order: number
}

function formatAddress(address: CompanyAddress | null | undefined): string {
  if (!address) return ''
  return [
    address.addressLine1,
    address.addressLine2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.region,
    address.country,
  ].filter((part) => typeof part === 'string' && part.trim().length > 0).join(', ')
}

function pickPrimaryAddress(addresses: CompanyAddress[] | undefined): CompanyAddress | null {
  if (!addresses?.length) return null
  return addresses.find((item) => item.isPrimary) ?? addresses[0] ?? null
}

function resolveStepperIndex(
  dealStage: { pipelineStage?: string | null; pipelineStageId?: string | null } | null,
  stages: PipelineStageRow[],
): number | null {
  if (!dealStage) return null
  const byId = dealStage.pipelineStageId
    ? stages.find((stage) => stage.id === dealStage.pipelineStageId)
    : undefined
  const label = (byId?.label ?? dealStage.pipelineStage ?? '').trim().toLowerCase()
  if (label) {
    const flowIndex = FLOW_SALES_STAGES.findIndex((item) => item.toLowerCase() === label)
    if (flowIndex >= 0) return flowIndex
  }
  if (byId && byId.order >= 0 && byId.order <= 5) return byId.order
  return null
}

export function FlowCompanyProfile({ companyId }: { companyId?: string }) {
  const t = useT()
  const router = useRouter()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const detailTranslator = React.useMemo(() => createTranslatorWithFallback(t), [t])
  const notesAdapter = React.useMemo(
    () => createCustomerNotesAdapter(detailTranslator),
    [detailTranslator],
  )

  const [data, setData] = React.useState<CompanyProfileData | null>(null)
  const [run, setRun] = React.useState<ResearchRunDto | null>(null)
  const [stages, setStages] = React.useState<PipelineStageRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isNotFound, setIsNotFound] = React.useState(false)
  const [isDirty, setIsDirty] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isRunning, setIsRunning] = React.useState(false)
  const [people, setPeople] = React.useState<CompanyPersonSummary[]>([])
  const [firmography, setFirmography] = React.useState<FirmographyValues>({
    industry: '',
    address: '',
    annualRevenue: '',
    profit: '',
    nip: '',
    krs: '',
    nda: false,
    ndaDate: '',
    ndaDriveUrl: '',
  })
  const [classification, setClassification] = React.useState({ status: '', lifecycleStage: '', source: '' })
  const [description, setDescription] = React.useState('')
  const [websiteUrl, setWebsiteUrl] = React.useState('')
  const [sizeBucket, setSizeBucket] = React.useState('')
  const [relatedCompanies, setRelatedCompanies] = React.useState('')
  const [brief, setBrief] = React.useState<ResearchBriefForm>(() => briefFromRun(null))
  const tagsSectionControllerRef = React.useRef<TagsSectionController | null>(null)
  const initialLoadDoneRef = React.useRef(false)
  const descriptionTouchedRef = React.useRef(false)
  const isDirtyRef = React.useRef(false)
  const lastRunStatusRef = React.useRef<string | null>(null)

  const { runMutation } = useGuardedMutation({
    contextId: companyId ? `research-company:${companyId}` : 'research-company:pending',
    blockedMessage: t('ui.forms.flash.saveBlocked', 'Save blocked by validation'),
  })

  const applyFirmographyFromRun = React.useCallback((item: ResearchRunDto) => {
    setFirmography((prev) => ({
      ...prev,
      annualRevenue: item.annualRevenue ?? prev.annualRevenue,
      profit: item.profit ?? prev.profit,
      nip: item.nip ?? prev.nip,
      krs: item.krs ?? prev.krs,
    }))
    if (item.companyDescription) {
      descriptionTouchedRef.current = false
      setDescription(item.companyDescription)
    }
    if (item.websiteUrl) setWebsiteUrl(item.websiteUrl)
    if (item.estimatedHeadcount) setSizeBucket(item.estimatedHeadcount)
    if (item.relatedCompanies) setRelatedCompanies(item.relatedCompanies)
  }, [])

  const hydrateFromCompany = React.useCallback((payload: CompanyProfileData, nextRun: ResearchRunDto | null) => {
    const cf = readFirmographyCustomFields(payload.customFields)
    const primary = pickPrimaryAddress(payload.addresses)
    const fromRun = nextRun?.status === 'done' ? nextRun : null
    setFirmography({
      industry: payload.profile?.industry ?? '',
      address: formatAddress(primary),
      annualRevenue: fromRun?.annualRevenue || payload.profile?.annualRevenue || '',
      profit: fromRun?.profit || cf.profit,
      nip: fromRun?.nip || cf.nip,
      krs: fromRun?.krs || cf.krs,
      nda: cf.nda,
      ndaDate: cf.ndaDate,
      ndaDriveUrl: cf.ndaDriveUrl,
    })
    setClassification({
      status: payload.company.status ?? '',
      lifecycleStage: payload.company.lifecycleStage ?? '',
      source: payload.company.source ?? '',
    })
    const researchDescription = fromRun?.companyDescription?.trim() ?? ''
    setDescription(
      descriptionTouchedRef.current
        ? (prev) => prev
        : (researchDescription || payload.company.description || ''),
    )
    setWebsiteUrl(fromRun?.websiteUrl || payload.profile?.websiteUrl || '')
    setSizeBucket(fromRun?.estimatedHeadcount || payload.profile?.sizeBucket || '')
    setRelatedCompanies(fromRun?.relatedCompanies || cf.relatedCompanies)
    setPeople(payload.people ?? [])
    if (fromRun) {
      setBrief(briefFromRun(fromRun))
    } else if (!nextRun || !isLiveRunStatus(nextRun.status)) {
      setBrief(briefFromRun(null))
    }
    isDirtyRef.current = false
    setIsDirty(false)
  }, [])

  const loadRun = React.useCallback(async (id: string) => {
    const payload = await readApiResultOrThrow<{ item: ResearchRunDto | null }>(
      `/api/research/runs?companyId=${encodeURIComponent(id)}`,
      undefined,
      { errorMessage: t('research.profile.loadError') },
    )
    const item = payload.item ?? null
    const previousStatus = lastRunStatusRef.current
    lastRunStatusRef.current = item?.status ?? null
    setRun(item)
    if (item?.status === 'done') {
      setBrief(briefFromRun(item))
      applyFirmographyFromRun(item)
      if (previousStatus && isLiveRunStatus(previousStatus)) {
        isDirtyRef.current = false
        setIsDirty(false)
      }
    }
    if (item?.status === 'failed' && previousStatus && isLiveRunStatus(previousStatus)) {
      flash(item.errorMessage?.trim() || t('research.profile.runFailed'), 'error')
    }
    return item
  }, [applyFirmographyFromRun, t])

  const loadData = React.useCallback(async () => {
    if (!companyId) {
      setIsNotFound(true)
      setIsLoading(false)
      return
    }
    if (!initialLoadDoneRef.current) setIsLoading(true)
    setError(null)
    setIsNotFound(false)
    try {
      const [payload, nextRun] = await Promise.all([
        readApiResultOrThrow<CompanyProfileData>(
          `/api/customers/companies/${encodeURIComponent(companyId)}?include=addresses,people,deals,interactions`,
          undefined,
          { errorMessage: t('research.profile.loadError') },
        ),
        loadRun(companyId),
      ])
      setData(payload)
      hydrateFromCompany(payload, nextRun)
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        setIsNotFound(true)
      } else {
        setError(err instanceof Error ? err.message : t('research.profile.loadError'))
      }
    } finally {
      setIsLoading(false)
      initialLoadDoneRef.current = true
    }
  }, [companyId, hydrateFromCompany, loadRun, t])

  React.useEffect(() => {
    loadData().catch((err) => logger.warn('loadData failed', { err }))
  }, [loadData])

  React.useEffect(() => {
    if (!run || !isLiveRunStatus(run.status) || !companyId) return
    const timer = window.setInterval(() => {
      loadRun(companyId).catch((err) => logger.warn('poll research failed', { err }))
    }, RESEARCH_POLL_MS)
    return () => window.clearInterval(timer)
  }, [companyId, loadRun, run])

  React.useEffect(() => {
    if (!run || run.status !== 'done' || descriptionTouchedRef.current) return
    if (run.companyDescription) setDescription(run.companyDescription)
  }, [run])

  const newestOpenDeal = React.useMemo(() => {
    const open = (data?.deals ?? []).filter((deal) => isOpenDealStatus(deal.status))
    return open.sort((left, right) => {
      const leftTime = new Date(left.updatedAt ?? left.createdAt ?? 0).getTime()
      const rightTime = new Date(right.updatedAt ?? right.createdAt ?? 0).getTime()
      return rightTime - leftTime
    })[0] ?? null
  }, [data?.deals])

  React.useEffect(() => {
    const pipelineId = newestOpenDeal?.pipelineId
    if (!pipelineId) {
      setStages([])
      return
    }
    readApiResultOrThrow<{ items: PipelineStageRow[] }>(
      `/api/customers/pipeline-stages?pipelineId=${encodeURIComponent(pipelineId)}`,
    )
      .then((payload) => setStages(payload.items ?? []))
      .catch(() => setStages([]))
  }, [newestOpenDeal?.pipelineId])

  const stepperIndex = React.useMemo(
    () => resolveStepperIndex(newestOpenDeal, stages),
    [newestOpenDeal, stages],
  )

  const markDirty = React.useCallback(() => {
    isDirtyRef.current = true
    setIsDirty(true)
  }, [])

  const handleBriefChange = React.useCallback((patch: Partial<ResearchBriefForm>) => {
    setBrief((prev) => ({ ...prev, ...patch }))
    markDirty()
  }, [markDirty])

  const handleTagsChange = React.useCallback((nextTags: TagSummary[]) => {
    setData((prev) => (prev ? { ...prev, tags: nextTags } : prev))
  }, [])

  const handleDelete = React.useCallback(async () => {
    const id = data?.company?.id ?? ''
    if (!id) return
    const approved = await confirm({
      title: t('customers.companies.detail.deleteConfirmTitle', 'Delete company?'),
      description: t('customers.companies.detail.deleteConfirmDescription', 'This action cannot be undone.'),
      confirmText: t('customers.companies.detail.actions.delete', 'Delete company'),
      cancelText: t('customers.companies.detail.actions.cancel', 'Cancel'),
      variant: 'destructive',
    })
    if (!approved) return
    try {
      await runMutation(
        () => withScopedApiRequestHeaders(
          buildOptimisticLockHeader(data?.company?.updatedAt),
          () => deleteCrud('customers/companies', { id }),
        ),
        { id, operation: 'deleteCompany' },
      )
    } catch (err) {
      if (!surfaceRecordConflict(err, t)) {
        flash(err instanceof Error ? err.message : t('customers.companies.detail.deleteError', 'Failed to delete company.'), 'error')
      }
      return
    }
    flash(t('customers.companies.list.deleteSuccess', 'Company deleted.'), 'success')
    router.push('/backend/customers/companies')
  }, [confirm, data?.company, router, runMutation, t])

  const saveAddress = React.useCallback(async (id: string, nextAddress: string) => {
    const current = pickPrimaryAddress(data?.addresses)
    const currentText = formatAddress(current)
    if (nextAddress.trim() === currentText.trim()) return
    if (!nextAddress.trim()) return
    if (current?.id) {
      await apiCallOrThrow('/api/customers/addresses', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: current.id, entityId: id, addressLine1: nextAddress.trim() }),
      })
      return
    }
    await apiCallOrThrow('/api/customers/addresses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ entityId: id, addressLine1: nextAddress.trim(), isPrimary: true }),
    })
  }, [data?.addresses])

  const handleSave = React.useCallback(async () => {
    if (!data?.company.id) return
    setIsSaving(true)
    try {
      const values: CompanyEditFormValues = {
        id: data.company.id,
        displayName: coerceDisplayName(data.company.displayName),
        primaryEmail: data.company.primaryEmail ?? '',
        primaryPhone: data.company.primaryPhone ?? '',
        status: classification.status,
        lifecycleStage: classification.lifecycleStage,
        source: classification.source,
        industry: firmography.industry,
        websiteUrl: toCrmWebsiteUrl(websiteUrl),
        sizeBucket,
        annualRevenue: toCrmAnnualRevenue(firmography.annualRevenue),
        description,
        [`cf_${FIRMOGRAPHY_CF_KEYS.nip}`]: firmography.nip,
        [`cf_${FIRMOGRAPHY_CF_KEYS.krs}`]: firmography.krs,
        [`cf_${FIRMOGRAPHY_CF_KEYS.profit}`]: firmography.profit,
        [`cf_${FIRMOGRAPHY_CF_KEYS.nda}`]: firmography.nda,
        [`cf_${FIRMOGRAPHY_CF_KEYS.ndaDate}`]: toDateInputValue(firmography.ndaDate) || null,
        [`cf_${FIRMOGRAPHY_CF_KEYS.ndaDriveUrl}`]: firmography.ndaDriveUrl.trim() || null,
        [`cf_${FIRMOGRAPHY_CF_KEYS.relatedCompanies}`]: relatedCompanies,
      }
      const payload = buildCompanyEditPayload(values)
      await updateCrud('customers/companies', payload)
      await saveAddress(data.company.id, firmography.address)
      const runIsLive = isFreshLiveRun(run)
      if (!runIsLive) {
        await updateCrud('research/runs', {
          companyId: data.company.id,
          ...briefToPayload(brief),
          companyDescription: description,
          websiteUrl,
          annualRevenue: firmography.annualRevenue,
          profit: firmography.profit,
          nip: firmography.nip,
          krs: firmography.krs,
          relatedCompanies,
        })
      }
      flash(t('research.profile.saveSuccess'), 'success')
      await loadData()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      flash(
        message && message !== 'ANNUAL_REVENUE_INVALID' && message !== 'DISPLAY_NAME_REQUIRED'
          ? message
          : t('research.profile.saveError'),
        'error',
      )
    } finally {
      setIsSaving(false)
    }
  }, [brief, classification, data, description, firmography, loadData, relatedCompanies, run, saveAddress, sizeBucket, t, websiteUrl])

  const handleRunResearch = React.useCallback(async () => {
    if (!companyId) return
    setIsRunning(true)
    try {
      const response = await fetch('/api/research/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (response.status === 409) {
        flash(t('research.profile.runBusy'), 'error')
        await loadRun(companyId)
        return
      }
      if (!response.ok) {
        throw new Error(t('research.profile.runError'))
      }
      flash(t('research.profile.runStarted'), 'success')
      const payload = await response.json().catch(() => null) as { item?: ResearchRunDto | null } | null
      const item = payload?.item ?? await loadRun(companyId)
      if (item) {
        lastRunStatusRef.current = item.status
        setRun(item)
      }
      if (item?.status === 'done') {
        setBrief(briefFromRun(item))
        applyFirmographyFromRun(item)
        isDirtyRef.current = false
        setIsDirty(false)
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : t('research.profile.runError'), 'error')
    } finally {
      setIsRunning(false)
    }
  }, [applyFirmographyFromRun, companyId, loadRun, t])

  if (isLoading) {
    return (
      <Page>
        <PageBody>
          <LoadingMessage label={t('customers.companies.detail.loading', 'Loading company')} />
        </PageBody>
      </Page>
    )
  }

  if (isNotFound) {
    return (
      <Page>
        <PageBody>
          <RecordNotFoundState
            label={t('customers.companies.detail.error.notFound', 'Company not found.')}
            backHref="/backend/customers/companies"
            backLabel={t('customers.companies.detail.actions.backToList', 'Back to companies')}
          />
        </PageBody>
      </Page>
    )
  }

  if (error || !data?.company?.id) {
    return (
      <Page>
        <PageBody>
          <ErrorMessage
            label={error ?? t('research.profile.loadError')}
            action={(
              <Button asChild variant="outline">
                <Link href="/backend/customers/companies">
                  {t('customers.companies.detail.actions.backToList', 'Back to companies')}
                </Link>
              </Button>
            )}
          />
        </PageBody>
      </Page>
    )
  }

  const id = data.company.id
  const displayName = coerceDisplayName(data.company.displayName)
  const runLive = isFreshLiveRun(run)

  return (
    <Page>
      <PageBody>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/backend/customers/companies-v2/${id}`}>{t('research.profile.classicView')}</Link>
            </Button>
            <Button type="button" size="sm" onClick={() => { void handleRunResearch() }} disabled={isRunning || runLive}>
              {runLive ? t('research.profile.runQueued') : t('research.profile.runResearch')}
            </Button>
          </div>

          <CompanyDetailHeader
            data={data}
            onTagsChange={handleTagsChange}
            tagsSectionControllerRef={tagsSectionControllerRef}
            onSave={() => { void handleSave() }}
            onDelete={handleDelete}
            isDirty={isDirty}
            isSaving={isSaving}
            onDataReload={() => { loadData().catch((err) => logger.warn('reload failed', { err })) }}
          />

          <CompanyKpiBar data={data} />

          <FirmographyGrid
            values={firmography}
            onChange={(patch) => {
              setFirmography((prev) => ({ ...prev, ...patch }))
              markDirty()
            }}
          />

          <SalesStageStepper currentIndex={stepperIndex} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-3">
              <ResearchLeftColumn
                brief={brief}
                onChange={handleBriefChange}
                notes={(
                  <NotesSection
                    key={`${id}:${run?.id ?? 'none'}:${run?.finishedAt ?? 'open'}`}
                    entityId={id}
                    emptyLabel={t('customers.companies.detail.empty.comments', 'No notes yet.')}
                    viewerUserId={data.viewer?.userId ?? null}
                    viewerName={data.viewer?.name ?? null}
                    viewerEmail={data.viewer?.email ?? null}
                    addActionLabel={t('customers.companies.detail.notes.addLabel', 'Add note')}
                    emptyState={{
                      title: t('customers.companies.detail.emptyState.notes.title', 'Keep everyone in the loop'),
                      actionLabel: t('customers.companies.detail.emptyState.notes.action', 'Create a note'),
                    }}
                    translator={detailTranslator}
                    dataAdapter={notesAdapter}
                    renderIcon={renderDictionaryIcon}
                    renderColor={renderDictionaryColor}
                    iconSuggestions={ICON_SUGGESTIONS}
                    readMarkdownPreference={readMarkdownPreferenceCookie}
                    writeMarkdownPreference={writeMarkdownPreferenceCookie}
                  />
                )}
              />
              <ClassificationSection
                values={classification}
                onChange={(patch) => {
                  setClassification((prev) => ({ ...prev, ...patch }))
                  markDirty()
                }}
              />
            </div>
            <ResearchRightColumn
              description={description}
              websiteUrl={websiteUrl}
              sizeBucket={sizeBucket}
              estimatedHeadcount={run?.estimatedHeadcount ?? null}
              relatedCompanies={relatedCompanies}
              runTenders={run ? { participates: run.publicTendersParticipates, sources: run.publicTenderSources } : null}
              people={(
                <ContactCards
                  contact={brief.contactPerson}
                  decisionMaker={brief.decisionMaker}
                  onChange={handleBriefChange}
                  people={(
                    <CompanyPeopleSection
                      companyId={id}
                      companyName={displayName}
                      initialPeople={people}
                      showRoles={false}
                      addActionLabel={t('customers.companies.detail.people.add', 'Add person')}
                      emptyLabel={t('customers.companies.detail.people.empty', 'No people linked to this company yet.')}
                      emptyState={{
                        title: t('customers.companies.detail.emptyState.people.title', 'Build the account team'),
                        actionLabel: t('customers.companies.detail.emptyState.people.action', 'Create person'),
                      }}
                      translator={detailTranslator}
                      onPeopleChange={setPeople}
                    />
                  )}
                />
              )}
              onChange={(patch) => {
                if (patch.description !== undefined) {
                  descriptionTouchedRef.current = true
                  setDescription(patch.description)
                }
                if (patch.websiteUrl !== undefined) setWebsiteUrl(patch.websiteUrl)
                if (patch.sizeBucket !== undefined) setSizeBucket(patch.sizeBucket)
                if (patch.relatedCompanies !== undefined) setRelatedCompanies(patch.relatedCompanies)
                markDirty()
              }}
            />
          </div>
        </div>
        {ConfirmDialogElement}
      </PageBody>
    </Page>
  )
}
