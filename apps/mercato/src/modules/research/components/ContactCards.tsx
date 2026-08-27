"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { Textarea } from '@open-mercato/ui/primitives/textarea'
import type { ResearchPersonForm } from '../lib/briefForm'

function PersonCard({
  idPrefix,
  title,
  person,
  onChange,
}: {
  idPrefix: string
  title: string
  person: ResearchPersonForm
  onChange: (person: ResearchPersonForm) => void
}) {
  const t = useT()
  const patch = (key: keyof ResearchPersonForm, value: string) => onChange({ ...person, [key]: value })
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-name`} className="text-xs text-muted-foreground">
            {t('research.profile.person.name')}
          </Label>
          <Input id={`${idPrefix}-name`} value={person.name} onChange={(event) => patch('name', event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-title`} className="text-xs text-muted-foreground">
            {t('research.profile.person.title')}
          </Label>
          <Input id={`${idPrefix}-title`} value={person.title} onChange={(event) => patch('title', event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-email`} className="text-xs text-muted-foreground">
            {t('research.profile.person.email')}
          </Label>
          <Input id={`${idPrefix}-email`} value={person.email} onChange={(event) => patch('email', event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-phone`} className="text-xs text-muted-foreground">
            {t('research.profile.person.phone')}
          </Label>
          <Input id={`${idPrefix}-phone`} value={person.phone} onChange={(event) => patch('phone', event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-note`} className="text-xs text-muted-foreground">
            {t('research.profile.person.note')}
          </Label>
          <Textarea
            id={`${idPrefix}-note`}
            value={person.note}
            placeholder={t('research.profile.person.notePlaceholder')}
            rows={3}
            onChange={(event) => patch('note', event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export function ContactCards({
  contact,
  decisionMaker,
  people,
  onChange,
}: {
  contact: ResearchPersonForm
  decisionMaker: ResearchPersonForm
  people?: React.ReactNode
  onChange: (patch: { contactPerson?: ResearchPersonForm; decisionMaker?: ResearchPersonForm }) => void
}) {
  const t = useT()
  return (
    <div className="grid grid-cols-1 gap-3">
      <PersonCard
        idPrefix="contact"
        title={t('research.profile.right.contact')}
        person={contact}
        onChange={(contactPerson) => onChange({ contactPerson })}
      />
      <PersonCard
        idPrefix="decision-maker"
        title={t('research.profile.right.decisionMaker')}
        person={decisionMaker}
        onChange={(next) => onChange({ decisionMaker: next })}
      />
      {people}
    </div>
  )
}
