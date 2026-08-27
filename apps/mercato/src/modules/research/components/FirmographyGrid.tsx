"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Input } from '@open-mercato/ui/primitives/input'
import { Label } from '@open-mercato/ui/primitives/label'
import { CheckboxField } from '@open-mercato/ui/primitives/checkbox-field'
import { DictionarySelectField } from '@open-mercato/core/modules/customers/components/formConfig'
import type { CustomerDictionaryKind } from '@open-mercato/core/modules/customers/lib/dictionaries'

export type FirmographyValues = {
  industry: string
  address: string
  annualRevenue: string
  profit: string
  nip: string
  krs: string
  nda: boolean
  ndaDate: string
  ndaDriveUrl: string
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function FirmographyGrid({
  values,
  onChange,
}: {
  values: FirmographyValues
  onChange: (patch: Partial<FirmographyValues>) => void
}) {
  const t = useT()
  const industryLabels = React.useMemo(() => ({
    placeholder: t('customers.companies.form.industry.placeholder', 'Select industry'),
    addLabel: t('customers.companies.form.dictionary.addIndustry', 'Add industry'),
    addPrompt: t('customers.companies.form.dictionary.promptIndustry', 'Enter a new industry.'),
    dialogTitle: t('customers.companies.form.dictionary.dialogTitleIndustry', 'Add industry'),
    valueLabel: t('customers.people.form.dictionary.valueLabel', 'Value'),
    valuePlaceholder: t('customers.people.form.dictionary.valuePlaceholder', 'Value'),
    labelLabel: t('customers.config.dictionaries.dialog.labelLabel', 'Label'),
    labelPlaceholder: t('customers.people.form.dictionary.labelPlaceholder', 'Display name shown in UI'),
    emptyError: t('customers.people.form.dictionary.errorRequired'),
    cancelLabel: t('customers.people.form.dictionary.cancel'),
    saveLabel: t('customers.people.form.dictionary.save'),
    errorLoad: t('customers.people.form.dictionary.errorLoad'),
    errorSave: t('customers.people.form.dictionary.error'),
    loadingLabel: t('customers.people.form.dictionary.loading'),
    manageTitle: t('customers.people.form.dictionary.manage'),
  }), [t])

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{t('research.profile.firmography.title')}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Field id="industry" label={t('research.profile.firmography.industry')}>
          <DictionarySelectField
            kind={'industries' as CustomerDictionaryKind}
            value={values.industry || undefined}
            onChange={(next) => onChange({ industry: next ?? '' })}
            labels={industryLabels}
          />
        </Field>
        <Field id="address" label={t('research.profile.firmography.address')}>
          <Input id="address" value={values.address} onChange={(event) => onChange({ address: event.target.value })} />
        </Field>
        <Field id="annualRevenue" label={t('research.profile.firmography.revenue')}>
          <Input id="annualRevenue" value={values.annualRevenue} onChange={(event) => onChange({ annualRevenue: event.target.value })} />
        </Field>
        <Field id="profit" label={t('research.profile.firmography.profit')}>
          <Input id="profit" value={values.profit} onChange={(event) => onChange({ profit: event.target.value })} />
        </Field>
        <Field id="nip" label={t('research.profile.firmography.nip')}>
          <Input id="nip" value={values.nip} onChange={(event) => onChange({ nip: event.target.value })} />
        </Field>
        <Field id="krs" label={t('research.profile.firmography.krs')}>
          <Input id="krs" value={values.krs} onChange={(event) => onChange({ krs: event.target.value })} />
        </Field>
      </div>
      <div className="mt-4 space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold">{t('research.profile.nda.title')}</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <CheckboxField
            label={t('research.profile.nda.signed')}
            checked={values.nda}
            onCheckedChange={(checked) => onChange({ nda: checked === true })}
          />
          <Field id="ndaDate" label={t('research.profile.nda.date')}>
            <Input id="ndaDate" type="date" value={values.ndaDate} onChange={(event) => onChange({ ndaDate: event.target.value })} />
          </Field>
          <Field id="ndaDriveUrl" label={t('research.profile.nda.drive')}>
            <Input id="ndaDriveUrl" value={values.ndaDriveUrl} onChange={(event) => onChange({ ndaDriveUrl: event.target.value })} />
          </Field>
        </div>
      </div>
    </section>
  )
}
