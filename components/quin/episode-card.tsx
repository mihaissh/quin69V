import Link from 'next/link'
import {
  episodeHref,
  formatBoxArtUrl,
  formatDuration,
  formatRelativeTime,
} from '@/lib/quin-utils'
import type { QuinGameEpisode } from '@/lib/quin-types'
import { Thumb } from './thumb'
import { Morph, episodeMorphName } from './transitions'

export function EpisodeCard({
  episode,
  progressSeconds = 0,
  priority = false,
  index = 0,
  morph = true,
}: {
  episode: QuinGameEpisode
  progressSeconds?: number
  priority?: boolean
  index?: number
  /** Off where the same episode could appear twice on a page */
  morph?: boolean
}) {
  const href = episodeHref(episode, progressSeconds)
  const progressPct =
    progressSeconds > 10 && episode.duration > 0
      ? Math.min(100, (progressSeconds / episode.duration) * 100)
      : 0

  return (
    <article className="group min-w-0" style={{ '--i': index } as React.CSSProperties}>
      <Link href={href} className="lift block rounded-md">
        <MaybeMorph on={morph} name={episodeMorphName(episode.id)}>
        <span className="lift-inner relative block aspect-video overflow-hidden rounded-md bg-surface">
        <Thumb srcs={[episode.thumbnail_url]} boxArt={episode.chapter_image} priority={priority} />
        <span className="tnum absolute bottom-1.5 right-1.5 rounded-sm bg-black/80 px-1 py-px text-[12px] font-medium text-white">
          {formatDuration(episode.duration)}
        </span>
        {progressPct > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
            <span
              className="block h-full bg-primary"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        )}
        </span>
        </MaybeMorph>
      </Link>

      <div className="mt-2.5 flex gap-2.5">
        <Link
          href={`/games?game_id=${episode.game_id}`}
          title={`All ${episode.game_name} episodes`}
          className="shrink-0"
        >
          <img
            src={formatBoxArtUrl(episode.chapter_image, 60, 80)}
            alt={episode.game_name}
            loading="lazy"
            decoding="async"
            className="h-10 w-[30px] rounded-sm bg-surface object-cover"
          />
        </Link>
        <div className="min-w-0">
          <Link
            href={href}
            className="line-clamp-2 font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
            title={episode.title}
          >
            {episode.title}
          </Link>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            <Link
              href={`/games?game_id=${episode.game_id}`}
              className="hover:text-foreground"
            >
              {episode.game_name}
            </Link>
            <span className="text-faint"> · </span>
            <time dateTime={episode.created_at} suppressHydrationWarning>
              {formatRelativeTime(episode.created_at)}
            </time>
          </p>
        </div>
      </div>
    </article>
  )
}

export function EpisodeGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton aspect-video rounded-md" />
          <div className="skeleton mt-2.5 h-4 w-3/4 rounded-sm" />
          <div className="skeleton mt-1.5 h-3 w-1/2 rounded-sm" />
        </div>
      ))}
    </>
  )
}

function MaybeMorph({ on, name, children }: { on: boolean; name: string; children: React.ReactNode }) {
  return on ? <Morph name={name}>{children}</Morph> : <>{children}</>
}
