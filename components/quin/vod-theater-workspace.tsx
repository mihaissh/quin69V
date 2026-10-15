'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  Check,
  External,
  LinkIcon as Link2,
  Theater as Maximize2,
  TheaterExit as Minimize2,
} from './icons'
import { SiteHeader } from './site-header'
import { ChatReplayPanel } from './chat-replay-panel'
import { YouTubePlayer, YT_STATE } from './youtube-player'
import { Morph, episodeMorphName } from './transitions'
import { Thumb } from './thumb'
import { VodRelated, useSeriesNeighbours, streamHref } from './vod-related'
import {
  episodeHref,
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
  formatHumanDuration,
  formatTimestampParam,
  parseTimestampParam,
} from '@/lib/quin-utils'
import { getSavedProgress, useChatSettings, useWatchProgress } from '@/lib/use-quin-state'
import type { QuinGameEpisode, QuinVodBundleResponse } from '@/lib/quin-types'
import { cn } from '@/lib/utils'

export function VodTheaterWorkspace({ bundle }: { bundle: QuinVodBundleResponse }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { vod } = bundle
  // Emotes + badges arrive right after the page shows; chat renders text meanwhile
  const { data: assets } = useSWR<Pick<QuinVodBundleResponse, 'emotes' | 'badges'>>(
    `/api/quin/vods/${vod.id}/assets`,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, revalidateIfStale: false }
  )
  const emotes = assets?.emotes ?? bundle.emotes
  const badges = assets?.badges ?? bundle.badges
  const { settings } = useChatSettings()
  const { saveProgress } = useWatchProgress()

  const games = useMemo(() => vod.games ?? [], [vod.games])
  const requestedGameId = searchParams.get('game_id')
  const requestedT = searchParams.get('t')

  const initialPartIndex = useMemo(() => {
    if (!requestedGameId) return 0
    const idx = games.findIndex(
      (g) => String(g.id) === requestedGameId || String(g.game_id) === requestedGameId
    )
    return idx === -1 ? 0 : idx
  }, [games, requestedGameId])

  const [partIndex, setPartIndex] = useState(initialPartIndex)
  useEffect(() => setPartIndex(initialPartIndex), [initialPartIndex])
  const episode = games[partIndex] ?? null
  const episodeRef = useRef(episode)
  episodeRef.current = episode

  // Start position from the URL (?t= accepts episode time or full-stream time)
  const urlSeek = useMemo(() => {
    if (!episode) return 0
    const t = parseTimestampParam(requestedT)
    if (t === null) return 0
    if (t >= episode.start && t <= episode.end && t > episode.duration) return t - episode.start
    return Math.max(0, t)
  }, [episode, requestedT])

  const [startAt, setStartAt] = useState(urlSeek)
  const [videoTime, setVideoTime] = useState(urlSeek)
  const [isPlaying, setIsPlaying] = useState(false)
  const [theater, setTheater] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const [mobileTab, setMobileTab] = useState<'chat' | 'more'>('chat')
  const [showUpNext, setShowUpNext] = useState(false)

  const playerRef = useRef<any>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const neighbours = useSeriesNeighbours(vod, episode)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsPortrait(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Resume where the visitor left off unless the URL asks for a time
  useEffect(() => {
    if (!episode) return
    const saved = getSavedProgress(episode.id)
    const t = urlSeek > 0 ? urlSeek : saved > 10 && saved < episode.duration - 30 ? saved : 0
    setStartAt(t)
    setVideoTime(t)
    setShowUpNext(false)
  }, [episode?.id, urlSeek]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once a second: update the clock shown in the UI and save progress
  useEffect(() => {
    if (!episode) return
    const id = setInterval(() => {
      const p = playerRef.current
      const t = p?.getCurrentTime?.()
      if (typeof t !== 'number' || Number.isNaN(t)) return
      const s = Math.floor(t)
      setVideoTime(s)
      if (p.getPlayerState?.() === YT_STATE.PLAYING) {
        saveProgress({
          episodeId: episode.id,
          vodId: vod.id,
          title: episode.title,
          gameName: episode.game_name,
          thumbnailUrl: episode.thumbnail_url,
          chapterImage: episode.chapter_image,
          timestamp: s,
          duration: episode.duration,
          updatedAt: Date.now(),
        })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [episode?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chat reads the exact playhead from the player on every tick
  const getPlayhead = useCallback(() => {
    const t = playerRef.current?.getCurrentTime?.()
    if (typeof t !== 'number' || Number.isNaN(t)) return null
    return (episodeRef.current?.start ?? 0) + t
  }, [])

  const onPlayer = useCallback((p: any | null) => {
    playerRef.current = p
    if (!p) setIsPlaying(false)
  }, [])

  const next = neighbours.next
  const onPlayerState = useCallback(
    (state: number) => {
      setIsPlaying(state === YT_STATE.PLAYING)
      if (state === YT_STATE.PLAYING) setShowUpNext(false)
      if (state === YT_STATE.ENDED && next) setShowUpNext(true)
    },
    [next]
  )

  // Keyboard: K play/pause · J/L ∓10s · F fullscreen · T theater · C chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const p = playerRef.current
      switch (e.key.toLowerCase()) {
        case 'k':
          if (!p) return
          if (p.getPlayerState?.() === YT_STATE.PLAYING) p.pauseVideo()
          else p.playVideo()
          break
        case 'j':
          p?.seekTo?.(Math.max(0, (p.getCurrentTime?.() ?? 0) - 10), true)
          break
        case 'l':
          p?.seekTo?.((p.getCurrentTime?.() ?? 0) + 10, true)
          break
        case 'f':
          if (document.fullscreenElement) document.exitFullscreen()
          else stageRef.current?.requestFullscreen?.()
          break
        case 't':
          setTheater((v) => !v)
          break
        case 'c':
          setChatCollapsed((v) => !v)
          break
        case 'escape':
          setTheater(false)
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const seekToVodOffset = useCallback((vodSeconds: number) => {
    const ep = episodeRef.current
    if (!ep) return
    const t = Math.max(0, vodSeconds - ep.start)
    setVideoTime(t)
    if (playerRef.current?.seekTo) playerRef.current.seekTo(t, true)
    else setStartAt(t)
  }, [])

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/games/${vod.id}?game_id=${episode?.id ?? ''}&t=${formatTimestampParam(videoTime)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }, [vod.id, episode?.id, videoTime])

  const selectPart = (i: number, g: QuinGameEpisode) => {
    setPartIndex(i)
    const sp = new URLSearchParams(window.location.search)
    sp.set('game_id', String(g.id))
    sp.delete('t')
    window.history.replaceState(null, '', `?${sp.toString()}`)
  }

  const goNext = useCallback(() => {
    if (next) router.push(episodeHref(next))
  }, [next, router])

  const currentVodOffset = (episode?.start ?? 0) + videoTime
  const older = vod.next?.[0] ?? null
  const chapterNow = vod.chapters?.find(
    (c) => currentVodOffset >= c.start && currentVodOffset < c.end
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {!theater && <SiteHeader />}

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col',
          settings.chatOnLeft ? 'lg:flex-row-reverse' : 'lg:flex-row'
        )}
      >
        {/* Video, details and (desktop) more episodes */}
        <div className="thin-scroll flex min-w-0 shrink-0 flex-col lg:min-h-0 lg:flex-1 lg:shrink lg:overflow-y-auto">
          <Morph name={episodeMorphName(episode?.id ?? -vod.id)}>
          <div
            ref={stageRef}
            className={cn(
              'relative w-full shrink-0 bg-black',
              theater && !isPortrait
                ? 'h-full'
                : 'aspect-video lg:max-h-[calc(100dvh-56px-96px)]'
            )}
          >
            {episode ? (
              <YouTubePlayer
                videoId={episode.video_id}
                start={startAt}
                poster={episode.thumbnail_url}
                boxArt={episode.chapter_image}
                title={episode.title}
                onPlayer={onPlayer}
                onStateChange={onPlayerState}
                quality={settings.videoQuality}
              />
            ) : (
              <div className="fade-in absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="font-display text-[24px] font-semibold tracking-wide">
                  {vod.is_live ? 'This stream is still live' : 'Not uploaded yet'}
                </p>
                <p className="max-w-md text-muted-foreground">
                  {vod.is_live
                    ? 'The YouTube upload and chat replay appear here after the stream ends.'
                    : 'This stream has no YouTube upload yet. Check back later.'}
                </p>
                <div className="mt-1 flex gap-2">
                  {vod.is_live && (
                    <a
                      href="https://twitch.tv/quin69"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press flex h-9 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:brightness-110"
                    >
                      Watch live on Twitch
                      <External className="ml-1.5 size-4" />
                    </a>
                  )}
                  {older && (
                    <Link
                      href={streamHref(older)}
                      className="press flex h-9 items-center rounded-md bg-raised px-4 hover:bg-line"
                    >
                      Previous stream
                    </Link>
                  )}
                </div>
              </div>
            )}

            {showUpNext && next && (
              <UpNext ep={next} onCancel={() => setShowUpNext(false)} onGo={goNext} />
            )}

            {theater && !isPortrait && (
              <button
                type="button"
                onClick={() => setTheater(false)}
                className="press fade-in absolute left-3 top-3 z-10 flex h-8 items-center gap-1.5 rounded-md bg-black/70 px-2.5 text-[13px] text-white opacity-60 hover:opacity-100"
              >
                <Minimize2 className="size-3.5" />
                Exit theater
              </button>
            )}
          </div>
          </Morph>

          {!theater && (
            <div className="fade-in px-3 pb-3 pt-3 sm:px-5 lg:pb-4">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {episode && (
                    <Link
                      href={`/games?game_id=${episode.game_id}`}
                      title={`All ${episode.game_name} episodes`}
                      className="hidden shrink-0 transition-transform hover:-translate-y-0.5 sm:block"
                    >
                      <img
                        src={formatBoxArtUrl(episode.chapter_image, 84, 112)}
                        alt={episode.game_name}
                        className="h-14 w-[42px] rounded-sm bg-raised object-cover"
                      />
                    </Link>
                  )}
                  <div className="min-w-0">
                    <h1 className="font-display text-[24px] font-semibold leading-tight tracking-wide sm:text-[28px]">
                      {episode ? episode.title : vod.title}
                    </h1>
                    <p className="mt-0.5 text-muted-foreground">
                      {episode && (
                        <>
                          <Link
                            href={`/games?game_id=${episode.game_id}`}
                            className="text-foreground transition-colors hover:text-primary"
                          >
                            {episode.game_name}
                          </Link>
                          <span className="text-faint"> · </span>
                        </>
                      )}
                      {formatDateShort(episode?.created_at || vod.created_at)}
                      {vod.is_live && (
                        <>
                          <span className="text-faint"> · </span>
                          <span className="font-semibold text-live">Live</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {episode && (
                    <button
                      type="button"
                      onClick={copyLink}
                      className="press tnum flex h-9 items-center gap-1.5 rounded-md bg-raised px-3 text-[13px] hover:bg-line"
                    >
                      {copied ? (
                        <Check className="fade-in size-4 text-primary" />
                      ) : (
                        <Link2 className="size-4" />
                      )}
                      {copied ? 'Link copied' : `Share at ${formatDuration(videoTime)}`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTheater(true)}
                    title="Theater mode (T)"
                    aria-label="Theater mode"
                    className="press hidden size-9 items-center justify-center rounded-md bg-raised hover:bg-line lg:flex"
                  >
                    <Maximize2 className="size-4" />
                  </button>
                </div>
              </div>

              {games.length > 1 && (
                <div className="mt-4">
                  <p className="mb-2 text-[13px] text-muted-foreground">
                    {games.length} parts in this stream
                  </p>
                  <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
                    {games.map((g, i) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => selectPart(i, g)}
                        className={cn(
                          'press flex shrink-0 items-center gap-2.5 rounded-md p-1.5 pr-3 text-left',
                          i === partIndex ? 'bg-raised ring-1 ring-primary' : 'bg-surface hover:bg-raised'
                        )}
                      >
                        <img
                          src={formatBoxArtUrl(g.chapter_image, 52, 70)}
                          alt=""
                          className="h-[35px] w-[26px] rounded-sm object-cover"
                        />
                        <span>
                          <span className="block max-w-[220px] truncate text-[13px] font-medium">
                            {g.title}
                          </span>
                          <span className="tnum block text-[12px] text-muted-foreground">
                            {formatDuration(g.duration)}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile: switch between chat and more episodes */}
              <div role="tablist" className="mt-3 flex border-b border-border lg:hidden">
                {(
                  [
                    ['chat', 'Chat replay'],
                    ['more', 'More episodes'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === key}
                    onClick={() => setMobileTab(key)}
                    className={cn(
                      '-mb-px flex-1 border-b-2 pb-2 text-[14px] font-medium transition-colors',
                      mobileTab === key
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-5 hidden border-t border-border pt-4 text-[13px] lg:block">
                <p className="text-muted-foreground">Stream</p>
                <p className="mt-0.5 truncate" title={vod.title}>
                  {vod.title}
                </p>
                {vod.chapters?.length > 0 && (
                  <p className="mt-1 text-muted-foreground">
                    {vod.chapters.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && <span className="text-faint"> → </span>}
                        <span className={cn('transition-colors', c === chapterNow && 'text-foreground')}>
                          {c.name}
                        </span>{' '}
                        <span className="tnum text-faint">{formatHumanDuration(c.duration)}</span>
                      </span>
                    ))}
                  </p>
                )}
                <p className="mt-3 text-faint">
                  Keys: <Kbd>K</Kbd> play/pause · <Kbd>J</Kbd>/<Kbd>L</Kbd> 10s · <Kbd>F</Kbd>{' '}
                  fullscreen · <Kbd>T</Kbd> theater · <Kbd>C</Kbd> chat · click a chat time to jump
                </p>
              </div>
            </div>
          )}

          {!theater && !isPortrait && (
            <div className="hidden px-5 pb-12 pt-6 lg:block">
              <VodRelated vod={vod} episode={episode} neighbours={neighbours} />
            </div>
          )}
        </div>

        {isPortrait && mobileTab === 'more' && (
          <div className="fade-in min-h-0 flex-1 overflow-y-auto px-3 pb-10 pt-4">
            <VodRelated vod={vod} episode={episode} neighbours={neighbours} />
          </div>
        )}

        <ChatReplayPanel
          className={isPortrait && mobileTab === 'more' ? 'hidden' : undefined}
          vodId={vod.id}
          episodeStartOffset={episode?.start ?? 0}
          currentVodOffset={currentVodOffset}
          getPlayhead={getPlayhead}
          isPlaying={isPlaying}
          emotes={emotes}
          badges={badges}
          initialComments={bundle.initialComments ?? []}
          initialCursor={bundle.initialCursor ?? null}
          isPortrait={isPortrait}
          onSeekToVodOffset={seekToVodOffset}
          collapsed={chatCollapsed}
          onToggleCollapse={() => setChatCollapsed((v) => !v)}
        />
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border px-1 text-[11px] text-muted-foreground">
      {children}
    </kbd>
  )
}

/** End-of-video card with an 8s countdown to the next episode. */
function UpNext({
  ep,
  onCancel,
  onGo,
}: {
  ep: QuinGameEpisode
  onCancel: () => void
  onGo: () => void
}) {
  const [left, setLeft] = useState(8)
  useEffect(() => {
    if (left <= 0) {
      onGo()
      return
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000)
    return () => clearTimeout(t)
  }, [left, onGo])

  return (
    <div className="fade-in absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
      <div className="page-in w-full max-w-sm text-center">
        <p className="text-[13px] text-muted-foreground">Next episode in {left}s</p>
        <button type="button" onClick={onGo} className="group mt-3 block w-full text-left">
          <span className="relative block aspect-video overflow-hidden rounded-md bg-surface">
            <Thumb srcs={[ep.thumbnail_url]} boxArt={ep.chapter_image} priority />
            <span className="upnext-bar absolute inset-x-0 bottom-0 h-1 origin-left bg-primary" />
          </span>
          <span className="mt-2 block font-display text-[22px] font-semibold tracking-wide transition-colors group-hover:text-primary">
            {ep.title}
          </span>
        </button>
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="press h-9 rounded-md bg-raised px-4 hover:bg-line"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGo}
            className="press h-9 rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:brightness-110"
          >
            Play now
          </button>
        </div>
      </div>
    </div>
  )
}
