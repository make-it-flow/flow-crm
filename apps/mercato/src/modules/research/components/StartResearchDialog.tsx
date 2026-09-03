"use client"

import * as React from 'react'
import { useT } from '@open-mercato/shared/lib/i18n/context'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { Button } from '@open-mercato/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@open-mercato/ui/primitives/dialog'
import { Label } from '@open-mercato/ui/primitives/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-mercato/ui/primitives/select'
import { Spinner } from '@open-mercato/ui/primitives/spinner'
import { useDialogKeyHandler } from '@open-mercato/ui/hooks/useDialogKeyHandler'

const LAST_MODEL_KEY = 'research.lastCursorModel'

type CursorModelOption = {
  id: string
  displayName: string
  description: string | null
}

type ModelsResponse = {
  live?: boolean
  configured?: boolean
  items?: CursorModelOption[]
}

function readLastModel(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_MODEL_KEY)
    return value?.trim() ? value : null
  } catch {
    return null
  }
}

function writeLastModel(model: string) {
  try {
    window.localStorage.setItem(LAST_MODEL_KEY, model)
  } catch {
    return
  }
}

export function StartResearchDialog({
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (model: string | null) => Promise<void>
  isSubmitting: boolean
}) {
  const t = useT()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [live, setLive] = React.useState(false)
  const [configured, setConfigured] = React.useState(false)
  const [items, setItems] = React.useState<CursorModelOption[]>([])
  const [model, setModel] = React.useState<string>('')

  const loadModels = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await apiCall<ModelsResponse>('/api/research/models')
    if (!result.ok) {
      setLive(true)
      setConfigured(false)
      setItems([])
      setModel('')
      setError(t('research.profile.runModelLoadError'))
      setIsLoading(false)
      return
    }
    const payload = result.result ?? {}
    const nextItems = payload.items ?? []
    const nextLive = payload.live === true
    const last = readLastModel()
    const preferred = last && nextItems.some((item) => item.id === last)
      ? last
      : (nextItems[0]?.id ?? '')
    setLive(nextLive)
    setConfigured(payload.configured === true)
    setItems(nextItems)
    setModel(preferred)
    if (nextLive && payload.configured !== true) {
      setError(t('research.profile.runModelUnconfigured'))
    } else if (nextLive && nextItems.length === 0) {
      setError(t('research.profile.runModelEmpty'))
    }
    setIsLoading(false)
  }, [t])

  React.useEffect(() => {
    if (!open) return
    void loadModels()
  }, [loadModels, open])

  const selectedDescription = items.find((item) => item.id === model)?.description ?? null
  const canSubmit = !isLoading && !isSubmitting && (
    live ? Boolean(model) && configured && items.length > 0 && !error : true
  )

  const handleConfirm = React.useCallback(async () => {
    if (!canSubmit) return
    const selected = model.trim() || null
    if (selected) writeLastModel(selected)
    await onConfirm(selected)
  }, [canSubmit, live, model, onConfirm])

  const handleCancel = React.useCallback(() => {
    if (isSubmitting) return
    onOpenChange(false)
  }, [isSubmitting, onOpenChange])

  const onKeyDown = useDialogKeyHandler({
    onConfirm: () => { void handleConfirm() },
    onCancel: handleCancel,
    disabled: !canSubmit,
  })

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleCancel() }}>
      <DialogContent onKeyDown={onKeyDown}>
        <DialogHeader>
          <DialogTitle>{t('research.profile.runDialogTitle')}</DialogTitle>
          <DialogDescription>{t('research.profile.runDialogDescription')}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            {t('research.profile.runModelLoading')}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="research-cursor-model">{t('research.profile.runModelLabel')}</Label>
            <Select value={model} onValueChange={setModel} disabled={items.length === 0 || isSubmitting}>
              <SelectTrigger id="research-cursor-model">
                <SelectValue placeholder={t('research.profile.runModelPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error ? (
              <p className="text-sm text-status-error-text">{error}</p>
            ) : selectedDescription ? (
              <p className="text-sm text-muted-foreground">{selectedDescription}</p>
            ) : live ? (
              <p className="text-sm text-muted-foreground">{t('research.profile.runModelHint')}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('research.profile.runModelMockHint')}</p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {t('research.profile.runDialogCancel')}
          </Button>
          <Button type="button" onClick={() => { void handleConfirm() }} disabled={!canSubmit}>
            {isSubmitting ? t('research.profile.runDialogStarting') : t('research.profile.runDialogConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
