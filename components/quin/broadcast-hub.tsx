'use client'

import Link from 'next/link'
import { Close as X, External, Play } from './icons'
import { SiteHeader, useOverview } from './site-header'
import { SiteFooter } from './site-footer'
import { EpisodeCard } from './episode-card'
import { Section } from './section'
import {
  episodeHref,
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
  formatHumanDuration,
  formatRelativeTime,
} from '@/lib/quin-utils'
import { useWatchProgress } from '@/lib/use-quin-state'
import { Morph, episodeMorphName } from './transitions'
import { Thumb, ytMaxres } from './thumb'
import type { QuinOverviewData } from '@/lib/quin-types'

export function HomeView({
  initialOverview,
}: {
  initialOverview: QuinOverviewData
}) {
  const { data } = useOverview(initialOverview)
  const overview = data ?? initialOverview
  const { recentEpisodes, topGames, recentVods, liveVod } = overview
  const { history, getEpisodeProgress, removeProgress } = useWatchProgress()

  const [latest, ...rest] = recentEpisodes
  // 6 in the side list lines up with the bottom of the big player
  const upNext = rest.slice(0, 6)
  const more = rest.slice(6, 14)

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="page-in mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-10 px-3 pb-12 pt-5 sm:px-5">
        {liveVod && <LiveBanner title={liveVod.title} duration={liveVod.duration} />}

        {latest && (
          <section
            aria-label="Latest episode"
            className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]"
          >
            <div className="min-w-0">
              <Link
                href={episodeHref(latest, getEpisodeProgress(latest.id))}
                className="group lift block rounded-lg"
              >
                <Morph name={episodeMorphName(latest.id)}>
                <span className="lift-inner relative block aspect-video overflow-hidden rounded-lg bg-surface">
                <Thumb
                  srcs={[ytMaxres(latest.video_id), latest.thumbnail_url]}
                  boxArt={latest.chapter_image}
                  priority
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-black/60 text-white transition-[transform,background-color] duration-200 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Play className="ml-0.5 size-7" />
                  </span>
                </span>
                <span className="tnum absolute bottom-2 right-2 rounded-sm bg-black/80 px-1.5 py-0.5 text-[13px] font-medium text-white">
                  {formatDuration(latest.duration)}
                </span>
                </span>
                </Morph>
              </Link>
              <div className="mt-3 flex items-start gap-3">
                <Link href={`/games?game_id=${latest.game_id}`} className="shrink-0">
                  <img
                    src={formatBoxArtUrl(latest.chapter_image, 84, 112)}
                    alt={latest.game_name}
                    className="h-14 w-[42px] rounded-sm bg-surface object-cover"
                  />
                </Link>
                <div className="min-w-0">
                  <p className="text-[13px] text-primary">Latest episode</p>
                  <h1 className="font-display text-[28px] font-semibold leading-tight tracking-wide sm:text-[32px]">
                    <Link href={episodeHref(latest)}>{latest.title}</Link>
                  </h1>
                  <p className="text-muted-foreground">
                    <Link
                      href={`/games?game_id=${latest.game_id}`}
                      className="hover:text-foreground"
                    >
                      {latest.game_name}
                    </Link>
                    {' · '}
                    {formatDateShort(latest.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {upNext.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-[22px] font-semibold leading-none tracking-wide">
                  Before that
                </h2>
                <ul className="stagger flex flex-col gap-3">
                  {upNext.map((ep, i) => (
                    <li key={ep.id} style={{ '--i': i + 2 } as React.CSSProperties}>
                      <CompactEpisode
                        ep={ep}
                        progress={getEpisodeProgress(ep.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {history.length > 0 && (
          <Section title="Continue watching">
            <div className="no-scrollbar -mx-3 flex snap-x gap-4 overflow-x-auto px-3 sm:mx-0 sm:px-0">
              {history.map((item) => (
                <div
                  key={item.episodeId}
                  className="group relative w-[240px] shrink-0 snap-start"
                >
                  <Link
                    href={`/games/${item.vodId}?game_id=${item.episodeId}&t=${item.timestamp}`}
                    className="relative block aspect-video overflow-hidden rounded-md bg-surface"
                  >
                    <Thumb srcs={[item.thumbnailUrl]} boxArt={item.chapterImage} />
                    <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
                      <span
                        className="block h-full bg-primary"
                        style={{
                          width: `${Math.min(100, (item.timestamp / Math.max(1, item.duration)) * 100)}%`,
                        }}
                      />
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeProgress(item.episodeId)}
                    aria-label={`Remove ${item.title} from continue watching`}
                    className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X className="size-4" />
                  </button>
                  <p className="mt-2 truncate font-semibold">{item.title}</p>
                  <p className="tnum text-[13px] text-muted-foreground">
                    {item.gameName} · {formatDuration(item.timestamp)} of{' '}
                    {formatDuration(item.duration)}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {more.length > 0 && (
          <Section title="Recent episodes" href="/games">
            <div className="stagger grid grid-cols-1 gap-x-4 gap-y-7 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {more.map((ep, i) => (
                <EpisodeCard
                  key={ep.id}
                  index={i}
                  episode={ep}
                  progressSeconds={getEpisodeProgress(ep.id)}
                />
              ))}
            </div>
          </Section>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          {topGames.length > 0 && (
            <Section title="Most played" href="/library">
              <ol className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                {topGames.slice(0, 6).map((g) => (
                  <li key={g.game_id}>
                    <Link href={`/games?game_id=${g.game_id}`} className="group block">
                      <span className="lift block rounded-md">
                        <img
                          src={formatBoxArtUrl(g.chapter_image, 188, 250)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="lift-inner aspect-[3/4] w-full rounded-md bg-surface object-cover"
                        />
                      </span>
                      <p className="mt-2 truncate text-[13px] font-medium transition-colors group-hover:text-primary">
                        {g.game_name}
                      </p>
                      <p className="tnum text-[12px] text-muted-foreground">
                        {g.count} episodes
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {recentVods.length > 0 && (
            <Section title="Recent streams">
              <ul className="divide-y divide-border border-y border-border">
                {recentVods.slice(0, 6).map((vod) => {
                  const href = vod.games?.[0]?.id
                    ? `/games/${vod.id}?game_id=${vod.games[0].id}`
                    : `/games/${vod.id}`
                  const games = Array.from(
                    new Set((vod.chapters ?? []).map((c) => c.name))
                  )
                  return (
                    <li key={vod.id}>
                      <Link
                        href={href}
                        className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-baseline gap-3 py-2.5 transition-colors hover:bg-surface sm:px-2"
                      >
                        <span className="tnum text-[13px] text-muted-foreground">
                          {vod.is_live ? (
                            <span className="font-semibold text-live">Live</span>
                          ) : (
                            formatDateShort(vod.created_at).replace(/, \d{4}$/, '')
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{vod.title}</span>
                          {games.length > 0 && (
                            <span className="block truncate text-[13px] text-muted-foreground">
                              {games.join(', ')}
                            </span>
                          )}
                        </span>
                        <span className="tnum text-[13px] text-muted-foreground">
                          {formatHumanDuration(vod.duration)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function CompactEpisode({
  ep,
  progress,
}: {
  ep: QuinOverviewData['recentEpisodes'][number]
  progress: number
}) {
  const pct =
    progress > 10 && ep.duration > 0
      ? Math.min(100, (progress / ep.duration) * 100)
      : 0
  return (
    <Link href={episodeHref(ep, progress)} className="group flex gap-3">
      <span className="lift block w-40 shrink-0 rounded-md">
      <Morph name={episodeMorphName(ep.id)}>
      <span className="lift-inner relative block aspect-video overflow-hidden rounded-md bg-surface">
        <Thumb srcs={[ep.thumbnail_url]} boxArt={ep.chapter_image} priority />
        <span className="tnum absolute bottom-1 right-1 rounded-sm bg-black/80 px-1 text-[11px] font-medium text-white">
          {formatDuration(ep.duration)}
        </span>
        {pct > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
            <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      </Morph>
      </span>
      <span className="min-w-0 py-0.5">
        <span className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-primary">
          {ep.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
          {ep.game_name}
        </span>
        <span
          className="block text-[13px] text-muted-foreground"
          suppressHydrationWarning
        >
          {formatRelativeTime(ep.created_at)}
        </span>
      </span>
    </Link>
  )
}

function LiveBanner({ title, duration }: { title: string; duration: number }) {
  return (
    <a
      href="https://twitch.tv/quin69"
      target="_blank"
      rel="noopener noreferrer"
      className="fade-in group flex flex-col gap-3 rounded-lg bg-surface p-4 transition-colors hover:bg-raised sm:flex-row sm:items-center"
    >
      <span className="flex items-center gap-2 text-[13px] font-semibold text-live">
        <span className="live-dot size-2 rounded-full bg-live" />
        Live now
      </span>
      <span className="min-w-0 flex-1 truncate">
        {title}
        <span className="text-muted-foreground" suppressHydrationWarning>
          {' '}
          · {formatHumanDuration(duration)} in
        </span>
      </span>
      <span className="press flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 font-semibold text-primary-foreground group-hover:brightness-110">
        Watch on Twitch
        <External className="size-4" />
      </span>
    </a>
  )
}
