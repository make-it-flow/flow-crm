"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { Label } from '@open-mercato/ui/primitives/label'
import { DictionarySelectField } from '@open-mercato/core/modules/customers/components/formConfig'

type ClassificationValues = {
  status: string
  lifecycleStage: string
  source: string
}

function dictionaryLabels(
  t: (key: string, fallback?: string) => string,
  kind: 'status' | 'lifecycleStage' | 'source',
) {
  const map = {
    status: {
      placeholder: 'customers.people.form.status.placeholder',
      addLabel: 'customers.people.form.dictionary.addStatus',
      prompt: 'customers.people.form.dictionary.promptStatus',
      dialog: 'customers.people.form.dictionary.dialogTitleStatus',
    },
    lifecycleStage: {
      placeholder: 'customers.people.form.lifecycleStage.placeholder',
      addLabel: 'customers.people.form.dictionary.addLifecycleStage',
      prompt: 'customers.people.form.dictionary.promptLifecycleStage',
      dialog: 'customers.people.form.dictionary.dialogTitleLifecycleStage',
    },
    source: {
      placeholder: 'customers.people.form.source.placeholder',
      addLabel: 'customers.people.form.dictionary.addSource',
      prompt: 'customers.people.form.dictionary.promptSource',
      dialog: 'customers.people.form.dictionary.dialogTitleSource',
    },
  } as const
  const keys = map[kind]
  return {
    placeholder: t(keys.placeholder),
    addLabel: t(keys.addLabel),
    addPrompt: t(keys.prompt),
    dialogTitle: t(keys.dialog),
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
  }
}

export function ClassificationSection({
  values,
  onChange,
}: {
  values: ClassificationValues
  onChange: (patch: Partial<ClassificationValues>) => void
}) {
  const t = useT()
  return (
    <details className="rounded-lg border bg-card p-4" open>
      <summary className="cursor-pointer text-sm font-semibold">
        {t('research.profile.classification.title')}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          {t('research.profile.classification.count')}
        </span>
      </summary>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label>{t('customers.people.form.status', 'Status')}</Label>
          <DictionarySelectField
            kind="statuses"
            value={values.status || undefined}
            onChange={(next) => onChange({ status: next ?? '' })}
            labels={dictionaryLabels(t, 'status')}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('customers.people.form.lifecycleStage', 'Lifecycle stage')}</Label>
          <DictionarySelectField
            kind="lifecycle-stages"
            value={values.lifecycleStage || undefined}
            onChange={(next) => onChange({ lifecycleStage: next ?? '' })}
            labels={dictionaryLabels(t, 'lifecycleStage')}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('customers.people.form.source', 'Source')}</Label>
          <DictionarySelectField
            kind="sources"
            value={values.source || undefined}
            onChange={(next) => onChange({ source: next ?? '' })}
            labels={dictionaryLabels(t, 'source')}
          />
        </div>
      </div>
    </details>
  )
}
