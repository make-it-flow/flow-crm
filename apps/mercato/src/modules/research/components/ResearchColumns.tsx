"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import type { ResearchBriefForm, SourcedTextForm } from '../lib/briefForm'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function SourceField({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const t = useT()
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {t('research.profile.source')}
      </Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function SourcedTextField({
  id,
  value,
  onChange,
}: {
  id: string
  value: SourcedTextForm
  onChange: (value: SourcedTextForm) => void
}) {
  return (
    <div className="space-y-1.5">
      <Textarea
        id={id}
        value={value.text}
        rows={5}
        onChange={(event) => onChange({ ...value, text: event.target.value })}
      />
      <SourceField
        id={`${id}-source`}
        value={value.source}
        onChange={(source) => onChange({ ...value, source })}
      />
    </div>
  )
}

export function ResearchLeftColumn({
  brief,
  notes,
  onChange,
}: {
  brief: ResearchBriefForm
  notes: React.ReactNode
  onChange: (patch: Partial<ResearchBriefForm>) => void
}) {
  const t = useT()
  return (
    <div className="space-y-3">
      <Block title={t('research.profile.insight.title')}>
        <div className="space-y-2">
          <Textarea
            id="mainInsight"
            value={brief.mainInsight}
            rows={4}
            onChange={(event) => onChange({ mainInsight: event.target.value })}
          />
          <SourceField
            id="mainInsightSource"
            value={brief.mainInsightSource}
            onChange={(mainInsightSource) => onChange({ mainInsightSource })}
          />
        </div>
      </Block>

      <Block title={t('research.profile.actions.title')}>
        <Textarea
          id="actionItems"
          value={brief.actionItems}
          rows={5}
          onChange={(event) => onChange({ actionItems: event.target.value })}
        />
      </Block>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">{t('research.profile.notes.title')}</h3>
        {notes}
      </section>

      <Block title={t('research.profile.problems.title')}>
        <SourcedTextField
          id="specific-problems"
          value={brief.specificProblems}
          onChange={(specificProblems) => onChange({ specificProblems })}
        />
      </Block>

      <Block title={t('research.profile.news.title')}>
        <SourcedTextField
          id="top-news"
          value={brief.topNews}
          onChange={(topNews) => onChange({ topNews })}
        />
      </Block>

      <Block title={t('research.profile.generic.title')}>
        <SourcedTextField
          id="generic-problems"
          value={brief.genericProblems}
          onChange={(genericProblems) => onChange({ genericProblems })}
        />
      </Block>

      <Block title={t('research.profile.timeline.title')}>
        <SourcedTextField
          id="timeline"
          value={brief.timeline}
          onChange={(timeline) => onChange({ timeline })}
        />
      </Block>
    </div>
  )
}

export function ResearchRightColumn({
  description,
  websiteUrl,
  sizeBucket,
  estimatedHeadcount,
  relatedCompanies,
  runTenders,
  people,
  onChange,
}: {
  description: string
  websiteUrl: string
  sizeBucket: string
  estimatedHeadcount: string | null
  relatedCompanies: string
  runTenders: { participates: boolean | null; sources: string[] | null } | null
  people: React.ReactNode
  onChange: (patch: { description?: string; websiteUrl?: string; sizeBucket?: string; relatedCompanies?: string }) => void
}) {
  const t = useT()
  const tenderLabel = runTenders
    ? (runTenders.participates
      ? t('research.profile.right.tendersYes')
      : t('research.profile.right.tendersNo'))
    : t('research.profile.right.tendersUnknown')

  return (
    <div className="space-y-3">
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="companyDescription">{t('research.profile.right.description')}</Label>
          <Textarea
            id="companyDescription"
            value={description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={5}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">{t('research.profile.right.website')}</Label>
          <Input id="websiteUrl" value={websiteUrl} onChange={(event) => onChange({ websiteUrl: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sizeBucket">{t('research.profile.right.size')}</Label>
          <Input id="sizeBucket" value={sizeBucket} onChange={(event) => onChange({ sizeBucket: event.target.value })} />
          {estimatedHeadcount && estimatedHeadcount !== sizeBucket ? (
            <p className="text-xs text-muted-foreground">
              {t('research.profile.right.sizeHint', undefined, { value: estimatedHeadcount })}
            </p>
          ) : null}
        </div>
      </section>

      {people}

      <section className="rounded-lg border bg-card p-4 space-y-1.5">
        <Label htmlFor="relatedCompanies">{t('research.profile.right.related')}</Label>
        <Textarea
          id="relatedCompanies"
          value={relatedCompanies}
          onChange={(event) => onChange({ relatedCompanies: event.target.value })}
          rows={4}
        />
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">{t('research.profile.right.tenders')}</h3>
        <p className="text-sm">{tenderLabel}</p>
        {runTenders?.sources?.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
            {runTenders.sources.map((source) => (
              <li key={source}>
                {source.startsWith('http') ? (
                  <a href={source} target="_blank" rel="noreferrer" className="underline underline-offset-2">{source}</a>
                ) : source}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}
