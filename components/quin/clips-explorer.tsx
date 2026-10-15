'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { External, SpinnerDots } from './icons'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { CLIP_RANGES, type ClipRange, type TwitchClip } from '@/lib/clip-types'
import { formatDuration, formatRelativeTime } from '@/lib/quin-utils'
import { cn, fadeIn } from '@/lib/utils'

type Page = { clips: TwitchClip[]; cursor: string | null; configured: boolean }

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K views`
  return `${n} view${n === 1 ? '' : 's'}`
}

export function ClipsExplorer({ range, initial }: { range: ClipRange; initial: Page }) {
  const [clips, setClips] = useState(initial.clips)
  const [cursor, setCursor] = useState(initial.cursor)
  const [loadingMore, setLoadingMore] = useState(false)
  const [open, setOpen] = useState<TwitchClip | null>(null)

  const loadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/quin/clips?range=${range}&after=${encodeURIComponent(cursor)}`)
      const page = (await res.json()) as Page
      setClips((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        return prev.concat(page.clips.filter((c) => !seen.has(c.id)))
      })
      setCursor(page.cursor)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="page-in mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pb-12 pt-6 sm:px-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[34px] font-semibold leading-none tracking-wide">
              Clips
            </h1>
            <p className="mt-1.5 text-muted-foreground">Most viewed clips from Twitch</p>
          </div>
          <a
            href={`https://www.twitch.tv/quin69/clips?range=${range === '24h' ? '24hr' : range}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-primary"
          >
            See on Twitch <External className="size-3.5" />
          </a>
        </div>

        <div role="tablist" aria-label="Time range" className="mt-5 flex gap-5 overflow-x-auto border-b border-border no-scrollbar">
          {CLIP_RANGES.map((r) => (
            <Link
              key={r.key}
              href={r.key === '7d' ? '/clips' : `/clips?range=${r.key}`}
              role="tab"
              aria-selected={range === r.key}
              scroll={false}
              className={cn(
                '-mb-px shrink-0 border-b-2 pb-2.5 text-[14px] font-medium transition-colors',
                range === r.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>

        <div className="mt-6">
          {!initial.configured ? (
            <div className="mx-auto max-w-md py-16 text-center">
              <p className="text-[16px]">Clips need a Twitch app key.</p>
              <p className="mt-2 text-muted-foreground">
                Add <code className="rounded bg-surface px-1">TWITCH_CLIENT_ID</code> and{' '}
                <code className="rounded bg-surface px-1">TWITCH_CLIENT_SECRET</code> to{' '}
                <code className="rounded bg-surface px-1">.env.local</code> (free at
                dev.twitch.tv/console), then restart the server.
              </p>
            </div>
          ) : clips.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">No clips in this time range.</p>
          ) : (
            <div className="stagger grid grid-cols-1 gap-x-4 gap-y-7 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {clips.map((clip, i) => (
                <ClipCard key={clip.id} clip={clip} index={i} onOpen={() => setOpen(clip)} />
              ))}
            </div>
          )}
        </div>

        {cursor && clips.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="press flex h-10 items-center gap-2 rounded-md bg-surface px-5 font-medium hover:bg-raised disabled:opacity-60"
            >
              {loadingMore && <SpinnerDots className="size-5 text-primary" />}
              {loadingMore ? 'Loading' : 'Load more clips'}
            </button>
          </div>
        )}
      </main>

      <SiteFooter />

      {open && <ClipDialog clip={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function ClipCard({
  clip,
  index,
  onOpen,
}: {
  clip: TwitchClip
  index: number
  onOpen: () => void
}) {
  return (
    <article className="group min-w-0" style={{ '--i': index } as React.CSSProperties}>
      <button type="button" onClick={onOpen} className="lift block w-full rounded-md text-left">
        <span className="lift-inner relative block aspect-video overflow-hidden rounded-md bg-surface">
          <img
            src={clip.thumbnail_url}
            alt=""
            loading={index < 8 ? 'eager' : 'lazy'}
            data-fade={index < 8 ? undefined : ''}
            ref={index < 8 ? undefined : fadeIn}
            decoding="async"
            className="size-full object-cover"
          />
          <span className="tnum absolute left-1.5 top-1.5 rounded-sm bg-black/80 px-1 py-px text-[12px] font-medium text-white">
            {formatDuration(clip.duration)}
          </span>
          <span className="tnum absolute bottom-1.5 right-1.5 rounded-sm bg-black/80 px-1 py-px text-[12px] font-medium text-white">
            {formatViews(clip.view_count)}
          </span>
        </span>
      </button>
      <button type="button" onClick={onOpen} className="mt-2.5 block w-full text-left">
        <span className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">
          {clip.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground" suppressHydrationWarning>
          Clipped by {clip.creator_name} · {formatRelativeTime(clip.created_at)}
        </span>
      </button>
    </article>
  )
}

/** The Twitch player only loads when a clip is opened. */
function ClipDialog({ clip, onClose }: { clip: TwitchClip; onClose: () => void }) {
  const [host, setHost] = useState<string | null>(null)
  useEffect(() => setHost(window.location.hostname), [])

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="gap-0 overflow-hidden rounded-lg bg-surface p-0 ring-border sm:max-w-4xl">
        <div className="aspect-video w-full bg-black">
          {host && (
            <iframe
              src={`https://clips.twitch.tv/embed?clip=${clip.id}&parent=${host}&autoplay=true`}
              className="fade-in size-full"
              allowFullScreen
              allow="autoplay; fullscreen"
              title={clip.title}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <DialogTitle className="font-display text-[22px] font-semibold tracking-wide">
              {clip.title}
            </DialogTitle>
            <p className="tnum text-[13px] text-muted-foreground">
              {formatViews(clip.view_count)} · clipped by {clip.creator_name}
            </p>
          </div>
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="press flex h-9 items-center gap-1.5 rounded-md bg-raised px-3 text-[13px] hover:bg-line"
          >
            Open on Twitch <External className="size-4" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
