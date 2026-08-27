"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { cn } from '@open-mercato/shared/lib/utils'
import { FLOW_SALES_STAGES } from '../lib/constants'

export function SalesStageStepper({ currentIndex }: { currentIndex: number | null }) {
  const t = useT()
  const labels = React.useMemo(
    () => FLOW_SALES_STAGES.map((label, index) => t(`research.profile.stepper.stage${index}`, label)),
    [t],
  )

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t('research.profile.stepper.title', 'Etap sprzedaży')}</h2>
        {currentIndex === null ? (
          <p className="text-xs text-muted-foreground">{t('research.profile.stepper.empty')}</p>
        ) : null}
      </div>
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-6">
        {labels.map((label, index) => {
          const active = currentIndex !== null && index === currentIndex
          const done = currentIndex !== null && index < currentIndex
          return (
            <li
              key={label}
              className={cn(
                'rounded-md border px-2 py-2 text-center',
                active && 'border-primary bg-primary/10 text-foreground',
                done && 'border-primary/40 bg-muted/40',
                currentIndex === null && 'opacity-60',
              )}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{index}</div>
              <div className="text-xs font-medium leading-snug">{label}</div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
