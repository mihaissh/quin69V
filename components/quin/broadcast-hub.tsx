'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  Play,
  Radio,
  Film,
  Library,
  Flame,
  Clock,
  ArrowRight,
  Layers,
  Maximize2,
  Tv,
  Sparkles,
  History,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { ChatReplayPanel } from './chat-replay-panel'
import { EpisodeCard } from './episode-card'
import {
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
  formatHumanDuration,
  formatRelativeTime,
} from '@/lib/quin-utils'
import { useWatchProgress } from '@/lib/use-quin-state'
import type {
  QuinGameEpisode,
  QuinOverviewData,
  QuinVodBundleResponse,
} from '@/lib/quin-types'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function BroadcastHub({
  initialOverview,
  initialVodBundle,
}: {
  initialOverview: QuinOverviewData
  initialVodBundle: QuinVodBundleResponse | null
}) {
  const searchParams = useSearchParams()
  const { history, getEpisodeProgress, removeProgress } = useWatchProgress()

  const { data: overview } = useSWR<QuinOverviewData>(
    '/api/quin/overview',
    fetcher,
    {
      fallbackData: initialOverview,
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  const recentEpisodes =
    overview?.recentEpisodes ?? initialOverview.recentEpisodes
  const topGames = overview?.topGames ?? initialOverview.topGames
  const recentVods = overview?.recentVods ?? initialOverview.recentVods
  const liveVod = overview?.liveVod ?? initialOverview.liveVod
  const stats = overview?.stats ?? initialOverview.stats

  const [selectedStageEpisode, setSelectedStageEpisode] =
    useState<QuinGameEpisode | null>(recentEpisodes[0] ?? null)

  const [stageMode, setStageMode] = useState<'vod' | 'live'>(
    searchParams.get('live') === '1' ? 'live' : 'vod'
  )

  const activeStageVodId =
    selectedStageEpisode?.vod_id ?? initialVodBundle?.vod.id ?? 780

  const { data: stageBundle } = useSWR<QuinVodBundleResponse>(
    `/api/quin/vods/${activeStageVodId}`,
    fetcher,
    {
      fallbackData:
        activeStageVodId === initialVodBundle?.vod.id
          ? initialVodBundle
          : undefined,
      revalidateOnFocus: false,
    }
  )

  const maxGameCount = useMemo(() => {
    return Math.max(
      1,
      ...topGames.map((g) => parseInt(String(g.count), 10) || 1)
    )
  }, [topGames])

  const twitchParentHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-8 px-3 py-5 sm:px-6">
        {/* Live Broadcast Alert Banner when Quin69 is Live on Twitch */}
        {liveVod && (
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500/20 px-3 font-mono text-xs font-bold text-emerald-300 shrink-0">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                </span>
                LIVE ON TWITCH
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {liveVod.title}
                </p>
                <p className="font-mono text-xs text-emerald-300/90">
                  Streamed for {formatHumanDuration(liveVod.duration)} &bull;
                  VOD #{liveVod.id} Recording in Progress
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setStageMode(stageMode === 'live' ? 'vod' : 'live')}
                className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold"
              >
                <Tv data-icon="inline-start" />
                {stageMode === 'live'
                  ? 'Switch Stage to VOD Replay'
                  : 'Watch Live Stream Here'}
              </Button>
              <a
                href="https://twitch.tv/quin69"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  Open Twitch
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* SIGNATURE FEATURE: Instant Interactive Stage (Video + 60fps Synchronized Chat Replay) */}
        <section
          aria-label="Featured Broadcast Stage"
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Stage Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 px-4 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Badge className="bg-primary/20 text-primary border-primary/40 font-mono text-[10px]">
                {stageMode === 'live' ? 'LIVE STREAM STAGE' : 'INSTANT REPLAY STAGE'}
              </Badge>
              <h1 className="truncate text-sm font-bold text-foreground sm:text-base">
                {stageMode === 'live'
                  ? liveVod?.title || 'Quin69 Live Broadcast'
                  : selectedStageEpisode
                    ? `${selectedStageEpisode.title} — ${selectedStageEpisode.game_name}`
                    : 'Featured Broadcast Replay'}
              </h1>
              {selectedStageEpisode && stageMode === 'vod' && (
                <span className="hidden md:inline-block font-mono text-xs text-muted-foreground">
                  ({formatDateShort(selectedStageEpisode.created_at)} &bull;{' '}
                  {formatDuration(selectedStageEpisode.duration)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => setStageMode('vod')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    stageMode === 'vod'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Episode + Chat Replay
                </button>
                <button
                  type="button"
                  onClick={() => setStageMode('live')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    stageMode === 'live'
                      ? 'bg-emerald-500 text-black font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Live Twitch
                </button>
              </div>

              {selectedStageEpisode && (
                <Link
                  href={`/games/${selectedStageEpisode.vod_id}?game_id=${selectedStageEpisode.id}`}
                >
                  <Button size="xs" variant="default">
                    <Maximize2 data-icon="inline-start" />
                    Full Theater
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stage Split Viewport: Video Player + Synchronized Chat Replay */}
          <div className="flex flex-col lg:flex-row lg:h-[540px] w-full overflow-hidden">
            {/* Video Player Area */}
            <div className="relative flex-1 bg-black aspect-video lg:aspect-auto min-w-0">
              {stageMode === 'live' ? (
                <iframe
                  src={`https://player.twitch.tv/?channel=quin69&parent=${twitchParentHost}&autoplay=true`}
                  className="size-full border-0"
                  allowFullScreen
                  title="Quin69 Live Twitch Broadcast"
                />
              ) : selectedStageEpisode ? (
                <iframe
                  key={selectedStageEpisode.video_id}
                  src={`https://www.youtube.com/embed/${selectedStageEpisode.video_id}?rel=0&modestbranding=1&playsinline=1`}
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedStageEpisode.title}
                />
              ) : null}
            </div>

            {/* Synchronized Chat Replay Side Panel */}
            <div className="h-[360px] lg:h-full flex shrink-0">
              <ChatReplayPanel
                vodId={activeStageVodId}
                episodeStartOffset={selectedStageEpisode?.start ?? 0}
                currentVodOffset={selectedStageEpisode?.start ?? 7090}
                isPlaying={false}
                emotes={stageBundle?.emotes ?? []}
                badges={
                  stageBundle?.badges ?? { channel: [], global: [] }
                }
                initialComments={stageBundle?.initialComments ?? []}
                initialCursor={stageBundle?.initialCursor ?? null}
                isPortrait={false}
              />
            </div>
          </div>

          {/* Quick-Switch Episode Selector Strip underneath Stage */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-border bg-secondary/20 px-4 py-2.5 chat-scrollbar">
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pr-1">
              <Sparkles className="size-3.5 text-primary" />
              Quick Stage Switch:
            </span>
            {recentEpisodes.slice(0, 6).map((ep) => {
              const active =
                stageMode === 'vod' && selectedStageEpisode?.id === ep.id
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => {
                    setStageMode('vod')
                    setSelectedStageEpisode(ep)
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all',
                    active
                      ? 'border-primary bg-primary/15 text-foreground shadow-sm'
                      : 'border-border/70 bg-card/80 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  <img
                    src={formatBoxArtUrl(ep.chapter_image, 48, 64)}
                    alt={ep.game_name}
                    className="h-6 w-4.5 rounded-xs object-cover"
                  />
                  <span className="text-xs font-semibold truncate max-w-[140px]">
                    {ep.title}
                  </span>
                  <span className="font-mono text-[10px] opacity-75">
                    {formatDuration(ep.duration)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Continue Watching Strip (if user has session watch progress) */}
        {history.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h2 className="text-base font-bold tracking-tight">
                  Continue Watching
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              {history.map((item) => (
                <div
                  key={item.episodeId}
                  className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-primary/40"
                >
                  <Link
                    href={`/games/${item.vodId}?game_id=${item.episodeId}&t=${item.timestamp}`}
                    className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary"
                  >
                    {item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="size-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.min(100, Math.round((item.timestamp / Math.max(1, item.duration)) * 100))}%`,
                        }}
                      />
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/games/${item.vodId}?game_id=${item.episodeId}&t=${item.timestamp}`}
                      className="block truncate text-xs font-bold text-foreground hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {item.gameName}
                    </p>
                    <p className="font-mono text-[10px] text-primary">
                      Resume at {formatDuration(item.timestamp)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProgress(item.episodeId)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Remove from history"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Episodes Grid */}
        <section aria-labelledby="recent-episodes-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Film className="size-4 text-primary" />
                <h2
                  id="recent-episodes-heading"
                  className="text-lg font-bold tracking-tight sm:text-xl"
                >
                  Recent Game Episodes
                </h2>
                <Badge variant="secondary" className="font-mono text-xs">
                  {stats.totalEpisodes} Total
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Every episode includes synchronized Twitch chat replay, 7TV/BTTV/FFZ emotes, and chapter timestamps.
              </p>
            </div>
            <Link href="/games">
              <Button variant="outline" size="sm">
                Browse All {stats.totalEpisodes} Episodes
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recentEpisodes.slice(0, 8).map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                isSelected={
                  stageMode === 'vod' && selectedStageEpisode?.id === ep.id
                }
                onSelectPreview={(chosen) => {
                  setStageMode('vod')
                  setSelectedStageEpisode(chosen)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                progressSeconds={getEpisodeProgress(ep.id)}
              />
            ))}
          </div>
        </section>

        {/* Two-Column Lower Deck: Most Played Games Library + Full Stream Chapter Logs */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Most Played Games (7 cols) */}
          <section
            aria-labelledby="most-played-heading"
            className="flex flex-col gap-4 lg:col-span-7"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Library className="size-4 text-primary" />
                  <h2
                    id="most-played-heading"
                    className="text-lg font-bold tracking-tight"
                  >
                    Most Played Games Library
                  </h2>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {stats.totalGames} Games
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Filter archives by Quin69&apos;s top categories and hardcore runs.
                </p>
              </div>
              <Link href="/library">
                <Button variant="outline" size="xs">
                  Full Library
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {topGames.slice(0, 6).map((game, idx) => {
                const countNum = parseInt(String(game.count), 10) || 0
                const pct = Math.max(
                  8,
                  Math.round((countNum / maxGameCount) * 100)
                )
                return (
                  <Link
                    key={game.game_id}
                    href={`/games?game_id=${game.game_id}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
                      <img
                        src={formatBoxArtUrl(game.chapter_image, 400, 530)}
                        alt={game.game_name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                      <div className="absolute top-2 left-2">
                        <span className="rounded bg-background/90 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-border/60">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 inset-x-2.5 flex flex-col gap-1">
                        <h3 className="truncate text-sm font-bold text-foreground">
                          {game.game_name}
                        </h3>
                        <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                          <span className="font-semibold text-primary">
                            {game.count} EPs
                          </span>
                          <span>{formatRelativeTime(game.last_played)}</span>
                        </div>
                        <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-secondary/80">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Recent Full Broadcast VODs & Chapter Breakdown (5 cols) */}
          <section
            aria-labelledby="recent-streams-heading"
            className="flex flex-col gap-4 lg:col-span-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  <h2
                    id="recent-streams-heading"
                    className="text-lg font-bold tracking-tight"
                  >
                    Recent Broadcast Logs &amp; Chapters
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Full Twitch broadcast timelines with segment breakdowns.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {recentVods.slice(0, 5).map((vod) => {
                const targetHref = vod.games?.[0]
                  ? `/games/${vod.id}?game_id=${vod.games[0].id}`
                  : `/games/${vod.id}`
                return (
                  <Link
                    key={vod.id}
                    href={targetHref}
                    className="group flex flex-col gap-2 rounded-xl border border-border/80 bg-card p-3 transition-colors hover:border-primary/40 hover:bg-secondary/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant={vod.is_live ? 'default' : 'secondary'}
                          className={cn(
                            'font-mono text-[10px] shrink-0',
                            vod.is_live &&
                              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          )}
                        >
                          {vod.is_live ? 'LIVE NOW' : `VOD #${vod.id}`}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatDateShort(vod.created_at)}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-foreground shrink-0">
                        {formatDuration(vod.duration)}
                      </span>
                    </div>

                    <p className="line-clamp-1 text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      {vod.title}
                    </p>

                    {vod.chapters && vod.chapters.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {vod.chapters.map((ch) => (
                          <span
                            key={ch.id}
                            className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            <img
                              src={formatBoxArtUrl(ch.image, 28, 38)}
                              alt={ch.name}
                              className="h-3.5 w-2.5 rounded-xs object-cover"
                            />
                            <span className="font-medium text-foreground/90">
                              {ch.name}
                            </span>
                            <span className="font-mono text-[10px]">
                              {formatHumanDuration(ch.duration)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
