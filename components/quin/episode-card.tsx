'use client'

import Link from 'next/link'
import { Play, Calendar, Tv, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
  formatRelativeTime,
} from '@/lib/quin-utils'
import type { QuinGameEpisode } from '@/lib/quin-types'
import { cn } from '@/lib/utils'

export function EpisodeCard({
  episode,
  onSelectPreview,
  isSelected = false,
  progressSeconds = 0,
}: {
  episode: QuinGameEpisode
  onSelectPreview?: (episode: QuinGameEpisode) => void
  isSelected?: boolean
  progressSeconds?: number
}) {
  const href = `/games/${episode.vod_id}?game_id=${episode.id}${
    progressSeconds > 15 ? `&t=${Math.floor(progressSeconds)}` : ''
  }`

  const progressPct =
    progressSeconds > 10 && episode.duration > 0
      ? Math.min(100, Math.round((progressSeconds / episode.duration) * 100))
      : 0

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg',
        isSelected
          ? 'border-primary ring-1 ring-primary/40'
          : 'border-border/80'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-secondary">
        <Link href={href} className="block size-full">
          {episode.thumbnail_url ? (
            <img
              src={episode.thumbnail_url}
              alt={episode.title}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center font-mono text-xs text-muted-foreground">
              VOD #{episode.vod_id}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 transition-opacity group-hover:opacity-95" />
        </Link>

        {/* Top Left VOD Badge */}
        <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5">
          <span className="rounded bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground backdrop-blur-sm border border-border/60">
            VOD #{episode.vod_id}
          </span>
          {isSelected && (
            <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary-foreground">
              NOW STAGE
            </span>
          )}
        </div>

        {/* Bottom Right Duration */}
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/95 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground border border-border/50">
          {formatDuration(episode.duration)}
        </span>

        {/* Instant Stage Preview Button */}
        {onSelectPreview && !isSelected && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onSelectPreview(episode)
            }}
            className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md border border-primary/40 bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground opacity-0 backdrop-blur-md transition-all group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
            title="Load into Homepage Stage Player"
          >
            <Tv className="size-3" />
            <span>Stage Preview</span>
          </button>
        )}

        {/* Center Play Overlay */}
        <Link
          href={href}
          aria-label={`Watch ${episode.title} with Chat Replay`}
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg">
            <Play className="size-4 fill-current ml-0.5" />
          </span>
        </Link>

        {/* Progress Bar */}
        {progressPct > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-secondary">
            <div
              className="h-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Meta Footer */}
      <div className="flex items-start gap-2.5 p-3">
        <Link
          href={`/games?game_id=${episode.game_id}`}
          className="shrink-0 overflow-hidden rounded border border-border/80 bg-secondary transition-transform hover:scale-105"
          title={`Filter by ${episode.game_name}`}
        >
          <img
            src={formatBoxArtUrl(episode.chapter_image, 72, 96)}
            alt={episode.game_name}
            className="h-11 w-8 object-cover"
            loading="lazy"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={href}
            className="block truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary"
            title={episode.title}
          >
            {episode.title}
          </Link>
          <Link
            href={`/games?game_id=${episode.game_id}`}
            className="block truncate text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {episode.game_name}
          </Link>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <span>{formatDateShort(episode.created_at)}</span>
            <span className="text-primary/90">
              {formatRelativeTime(episode.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
