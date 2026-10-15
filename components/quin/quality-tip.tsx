'use client'

import { useEffect, useState } from 'react'
import { Close, Info } from './icons'
import { useChatSettings } from '@/lib/use-quin-state'

/*
  One-time tip under the player. Browser extensions that control YouTube
  quality (Enhancer for YouTube and similar) also act inside embedded players
  and override the 1080p request, so the video gets stuck at 360p/480p.
  Dismissing it is remembered.
*/
export function QualityTip() {
  const { settings, updateSettings } = useChatSettings()
  // Only decide after mount, so people who dismissed it never see a flash
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || settings.hideQualityTip) return null

  const dismiss = () => updateSettings({ hideQualityTip: true })

  return (
    <div
      role="note"
      className="fade-in mx-3 mt-3 flex items-start gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-[13px] sm:mx-5"
    >
      <Info className="mt-px size-[18px] shrink-0 text-primary" />
      <p className="min-w-0 flex-1 leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Stuck at low quality?</span>{' '}
        Extensions like <span className="text-foreground">Enhancer for YouTube</span>{' '}
        lock the resolution in embedded players. Turn it off for this site or set its
        default quality to 1080p, then reload.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="press -my-0.5 hidden h-7 shrink-0 items-center rounded-md bg-raised px-2.5 text-[13px] font-medium hover:bg-line sm:flex"
      >
        Got it
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="press -m-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-raised hover:text-foreground sm:hidden"
      >
        <Close className="size-4" />
      </button>
    </div>
  )
}
