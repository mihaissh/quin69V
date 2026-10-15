'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { EpisodeCard, EpisodeGridSkeleton } from './episode-card'
import { useOverview } from './site-header'
import { ArrowLeft, ArrowRight } from './icons'
import { Thumb } from './thumb'
import {
  episodeHref,
  formatBoxArtUrl,
  formatDuration,
  formatRelativeTime,
} from '@/lib/quin-utils'
import { useWatchProgress } from '@/lib/use-quin-state'
import type { QuinGameEpisode, QuinVodDetail } from '@/lib/quin-types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type ListRes = { data: QuinGameEpisode[] }

/** Previous / next episode of the same game, around the one being watched. */
export function useSeriesNeighbours(vod: QuinVodDetail, episode: QuinGameEpisode | null) {
  const gid = episode?.game_id
  const base = gid
    ? `/api/quin/games?game_id=${encodeURIComponent(gid)}&page=1&sort=created_at`
    : null
  const at = encodeURIComponent(vod.created_at)

  const { data: olderRes, isLoading: loadingOlder } = useSWR<ListRes>(
    base ? `${base}&order=desc&limit=9&to=${at}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )
  const { data: newerRes } = useSWR<ListRes>(
    base ? `${base}&order=asc&limit=4&from=${at}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  return useMemo(() => {
    if (!episode) return { prev: null, next: null, older: [], loading: false }
    const withVod = (g: QuinGameEpisode): QuinGameEpisode => ({
      ...g,
      vod_id: vod.id,
      created_at: g.created_at ?? vod.created_at,
    })
    // Same game earlier/later in this very stream (multi-part streams)
    const sameStream = (vod.games ?? []).filter((g) => g.game_id === episode.game_id)
    const earlierHere = sameStream.filter((g) => g.start < episode.start).at(-1)
    const laterHere = sameStream.find((g) => g.start > episode.start)

    const older = (olderRes?.data ?? []).filter((g) => g.id !== episode.id)
    const newer = (newerRes?.data ?? []).filter(
      (g) => g.id !== episode.id && !(g.vod_id === vod.id && g.start <= episode.start)
    )

    const prev = earlierHere ? withVod(earlierHere) : (older[0] ?? null)
    const next = laterHere ? withVod(laterHere) : (newer[0] ?? null)
    return {
      prev,
      next,
      older: older.filter((g) => g.id !== prev?.id).slice(0, 8),
      loading: loadingOlder,
    }
  }, [episode, vod, olderRes, newerRes, loadingOlder])
}

export function VodRelated({
  vod,
  episode,
  neighbours,
}: {
  vod: QuinVodDetail
  episode: QuinGameEpisode | null
  neighbours: ReturnType<typeof useSeriesNeighbours>
}) {
  const { getEpisodeProgress } = useWatchProgress()
  const { data: overview } = useOverview()
  const { prev, next, older, loading } = neighbours

  const latest = (overview?.recentEpisodes ?? [])
    .filter((e) => e.id !== episode?.id && e.id !== next?.id && e.id !== prev?.id)
    .slice(0, 8)

  return (
    <div className="flex flex-col gap-10">
      {(prev || next) && (
        <section aria-label="Previous and next episode" className="grid gap-3 sm:grid-cols-2">
          {prev ? (
            <NeighbourCard label="Previous episode" ep={prev} progress={getEpisodeProgress(prev.id)} />
          ) : (
            <span className="max-sm:hidden" />
          )}
          {next ? (
            <NeighbourCard label="Next episode" ep={next} progress={getEpisodeProgress(next.id)} align="end" />
          ) : (
            <p className="flex items-center justify-center rounded-lg border border-dashed border-border p-4 text-[13px] text-muted-foreground">
              You&apos;re caught up — this is the latest {episode?.game_name} episode.
            </p>
          )}
        </section>
      )}

      {episode && (loading || older.length > 0) && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-[22px] font-semibold leading-none tracking-wide">
              More {episode.game_name}
            </h2>
            <Link
              href={`/games?game_id=${episode.game_id}`}
              className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-primary"
            >
              All episodes <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="stagger grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 2xl:grid-cols-4">
            {loading && older.length === 0 ? (
              <EpisodeGridSkeleton count={4} />
            ) : (
              older.map((ep, i) => (
                <EpisodeCard key={ep.id} episode={ep} index={i} morph={false} progressSeconds={getEpisodeProgress(ep.id)} />
              ))
            )}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-[22px] font-semibold leading-none tracking-wide">
              Latest episodes
            </h2>
            <Link
              href="/games"
              className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-primary"
            >
              See all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="stagger grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 2xl:grid-cols-4">
            {latest.map((ep, i) => (
              <EpisodeCard key={ep.id} episode={ep} index={i} morph={false} progressSeconds={getEpisodeProgress(ep.id)} />
            ))}
          </div>
        </section>
      )}

      {(vod.prev?.[0] || vod.next?.[0]) && (
        <nav aria-label="Other streams" className="flex flex-wrap gap-2 border-t border-border pt-4 text-[13px]">
          {vod.prev?.[0] && (
            <Link
              href={streamHref(vod.prev[0])}
              title={vod.prev[0].title}
              className="press flex h-9 items-center rounded-md bg-surface px-3 hover:bg-raised"
            >
              <ArrowLeft className="mr-1.5 size-4" /> Newer stream
            </Link>
          )}
          {vod.next?.[0] && (
            <Link
              href={streamHref(vod.next[0])}
              title={vod.next[0].title}
              className="press flex h-9 items-center rounded-md bg-surface px-3 hover:bg-raised"
            >
              Older stream <ArrowRight className="ml-1.5 size-4" />
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

export function streamHref(v: { id: number; games?: { id?: number }[] }) {
  return v.games?.[0]?.id ? `/games/${v.id}?game_id=${v.games[0].id}` : `/games/${v.id}`
}

function NeighbourCard({
  label,
  ep,
  progress,
  align = 'start',
}: {
  label: string
  ep: QuinGameEpisode
  progress: number
  align?: 'start' | 'end'
}) {
  const pct =
    progress > 10 && ep.duration > 0 ? Math.min(100, (progress / ep.duration) * 100) : 0
  return (
    <Link
      href={episodeHref(ep, progress)}
      className={
        'group fade-in flex items-center gap-4 rounded-lg bg-surface p-2.5 transition-colors hover:bg-raised ' +
        (align === 'end' ? 'sm:flex-row-reverse sm:text-right' : '')
      }
    >
      <span className="lift block w-36 shrink-0 rounded-md sm:w-44">
        <span className="lift-inner relative block aspect-video overflow-hidden rounded-md bg-raised">
          <Thumb srcs={[ep.thumbnail_url]} boxArt={ep.chapter_image} />
          <span className="tnum absolute bottom-1 right-1 rounded-sm bg-black/80 px-1 text-[11px] font-medium text-white">
            {formatDuration(ep.duration)}
          </span>
          {pct > 0 && (
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
              <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
            </span>
          )}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium uppercase tracking-[0.06em] text-primary">
          {label}
        </span>
        <span className="mt-0.5 block truncate font-display text-[20px] font-semibold leading-tight tracking-wide transition-colors group-hover:text-primary">
          {ep.title}
        </span>
        <span
          className={
            'mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground ' +
            (align === 'end' ? 'sm:justify-end' : '')
          }
        >
          <img
            src={formatBoxArtUrl(ep.chapter_image, 30, 40)}
            alt=""
            className="h-5 w-[15px] rounded-[2px] object-cover"
          />
          <span suppressHydrationWarning>{formatRelativeTime(ep.created_at)}</span>
        </span>
      </span>
    </Link>
  )
}
