'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Maximize2,
  Minimize2,
  Share2,
  Check,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Layers,
  Calendar,
  Clock,
  Radio,
  ExternalLink,
  Tv,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from './site-header'
import { ChatReplayPanel } from './chat-replay-panel'
import {
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
  formatTimestampParam,
  parseTimestampParam,
} from '@/lib/quin-utils'
import { useChatSettings, useWatchProgress } from '@/lib/use-quin-state'
import type { QuinVodBundleResponse } from '@/lib/quin-types'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

export function VodTheaterWorkspace({
  bundle,
}: {
  bundle: QuinVodBundleResponse
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { vod, emotes, badges } = bundle
  const { settings } = useChatSettings()
  const { saveProgress, getEpisodeProgress } = useWatchProgress()

  const games = useMemo(() => vod.games ?? [], [vod.games])

  // Determine initial episode part from ?game_id=...
  const requestedGameId = searchParams.get('game_id')
  const requestedTimeParam = searchParams.get('t')

  const initialPartIndex = useMemo(() => {
    if (!games.length) return 0
    if (requestedGameId) {
      const idx = games.findIndex(
        (g) =>
          String(g.id) === requestedGameId ||
          String(g.game_id) === requestedGameId
      )
      if (idx !== -1) return idx
    }
    return 0
  }, [games, requestedGameId])

  const [activePartIndex, setActivePartIndex] = useState(initialPartIndex)
  const activeEpisode = games[activePartIndex] ?? null

  useEffect(() => {
    setActivePartIndex(initialPartIndex)
  }, [initialPartIndex])

  // Calculate initial seek seconds inside the YouTube video
  const initialVideoSeek = useMemo(() => {
    if (!activeEpisode) return 0
    const parsedT = parseTimestampParam(requestedTimeParam)
    if (parsedT !== null) {
      // If t is larger than episode.start, it might be a full-VOD offset
      if (parsedT >= activeEpisode.start && parsedT <= activeEpisode.end) {
        return Math.max(0, parsedT - activeEpisode.start)
      }
      return Math.max(0, parsedT)
    }
    const saved = getEpisodeProgress(activeEpisode.id)
    return saved > 10 ? saved : 0
  }, [activeEpisode, requestedTimeParam, getEpisodeProgress])

  const [videoTime, setVideoTime] = useState(initialVideoSeek)
  const [isPlaying, setIsPlaying] = useState(false)
  const [theaterMode, setTheaterMode] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [watchLiveTwitch, setWatchLiveTwitch] = useState(
    Boolean(vod.is_live && games.length === 0)
  )
  const [isPortrait, setIsPortrait] = useState(false)

  const ytPlayerRef = useRef<any>(null)
  const playerContainerId = `quin-yt-player-${vod.id}`

  useEffect(() => {
    const checkViewport = () => {
      setIsPortrait(window.innerWidth < 960)
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // Mount & synchronize YouTube IFrame API player
  useEffect(() => {
    if (!activeEpisode?.video_id || watchLiveTwitch) return

    let isMounted = true
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const createPlayer = () => {
      if (!isMounted || !window.YT?.Player) return
      try {
        if (ytPlayerRef.current?.destroy) {
          ytPlayerRef.current.destroy()
        }
      } catch {
        // Ignore cleanup error
      }

      ytPlayerRef.current = new window.YT.Player(playerContainerId, {
        events: {
          onReady: (event: any) => {
            if (!isMounted) return
            if (initialVideoSeek > 0) {
              event.target.seekTo(initialVideoSeek, true)
            }
          },
          onStateChange: (event: any) => {
            if (!isMounted) return
            const state = event.data
            setIsPlaying(state === 1)
            const current = event.target?.getCurrentTime?.()
            if (typeof current === 'number') {
              setVideoTime(Math.floor(current))
            }
          },
        },
      })

      pollTimer = setInterval(() => {
        const player = ytPlayerRef.current
        if (player && typeof player.getCurrentTime === 'function') {
          const current = player.getCurrentTime()
          if (typeof current === 'number' && !Number.isNaN(current)) {
            const floored = Math.floor(current)
            setVideoTime(floored)
            if (player.getPlayerState?.() === 1 && activeEpisode) {
              saveProgress({
                episodeId: activeEpisode.id,
                vodId: vod.id,
                title: activeEpisode.title,
                gameName: activeEpisode.game_name,
                thumbnailUrl: activeEpisode.thumbnail_url,
                chapterImage: activeEpisode.chapter_image,
                timestamp: floored,
                duration: activeEpisode.duration,
                updatedAt: Date.now(),
              })
            }
          }
        }
      }, 1000)
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
    } else {
      const existingScript = document.getElementById('youtube-iframe-js')
      if (!existingScript) {
        const tag = document.createElement('script')
        tag.id = 'youtube-iframe-js'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
      const prevCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.()
        createPlayer()
      }
    }

    return () => {
      isMounted = false
      if (pollTimer) clearInterval(pollTimer)
      try {
        ytPlayerRef.current?.destroy?.()
      } catch {
        // Ignore
      }
    }
  }, [activeEpisode?.video_id, activeEpisode?.id, watchLiveTwitch])

  // Keyboard shortcuts (T = Theater mode, C = Chat collapse, J/L = -10s/+10s)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setTheaterMode((v) => !v)
      } else if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setChatCollapsed((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const seekVideoRelative = useCallback(
    (deltaSeconds: number) => {
      const next = Math.max(
        0,
        Math.min(activeEpisode?.duration ?? 36000, videoTime + deltaSeconds)
      )
      setVideoTime(next)
      if (ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(next, true)
      }
    },
    [videoTime, activeEpisode?.duration]
  )

  const handleSeekToVodOffset = useCallback(
    (vodSeconds: number) => {
      if (!activeEpisode) return
      const targetVideoTime = Math.max(0, vodSeconds - activeEpisode.start)
      setVideoTime(targetVideoTime)
      if (ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(targetVideoTime, true)
      }
      toast.success(
        `Jumped to ${formatDuration(targetVideoTime)} in ${activeEpisode.title}`
      )
    },
    [activeEpisode]
  )

  const handleCopyTimestampLink = useCallback(async () => {
    const tParam = formatTimestampParam(videoTime)
    const url = `${window.location.origin}/games/${vod.id}?game_id=${activeEpisode?.id ?? ''}&t=${tParam}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLink(true)
      toast.success(`Timestamp link copied (${tParam})`)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast.error('Could not copy link')
    }
  }, [vod.id, activeEpisode?.id, videoTime])

  const currentVodOffset = (activeEpisode?.start ?? 0) + videoTime
  const prevVod = vod.prev?.[0] ?? null
  const nextVod = vod.next?.[0] ?? null
  const twitchParentHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background">
      {!theaterMode && (
        <SiteHeader
          compact
          rightSlot={
            <div className="hidden sm:flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setTheaterMode(true)}
                title="Theater Mode (Shortcut: T)"
              >
                <Maximize2 data-icon="inline-start" />
                Theater
              </Button>
            </div>
          }
        />
      )}

      <div
        className={cn(
          'flex min-h-0 flex-1 w-full overflow-hidden',
          isPortrait
            ? 'flex-col'
            : settings.chatOnLeft
              ? 'flex-row-reverse'
              : 'flex-row'
        )}
      >
        {/* Main Video & Control Column */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-black">
          {/* Video Stage */}
          <div
            className={cn(
              'relative w-full bg-black overflow-hidden',
              isPortrait ? 'aspect-video shrink-0' : 'min-h-0 flex-1'
            )}
          >
            {watchLiveTwitch ? (
              <iframe
                src={`https://player.twitch.tv/?channel=quin69&parent=${twitchParentHost}&autoplay=true`}
                className="size-full border-0"
                allowFullScreen
                title="Quin69 Live Twitch Stream"
              />
            ) : activeEpisode ? (
              <div className="size-full relative">
                <iframe
                  id={playerContainerId}
                  key={activeEpisode.video_id}
                  src={`https://www.youtube.com/embed/${activeEpisode.video_id}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1${initialVideoSeek > 0 ? `&start=${Math.floor(initialVideoSeek)}` : ''}`}
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={activeEpisode.title}
                />
              </div>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
                <Radio className="size-10 text-primary animate-pulse" />
                <h2 className="text-base font-bold text-foreground">
                  {vod.is_live
                    ? 'Quin69 is Currently Streaming This VOD Live!'
                    : 'No YouTube Episode Segment Uploaded Yet'}
                </h2>
                <p className="max-w-md text-xs text-muted-foreground">
                  {vod.title}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" onClick={() => setWatchLiveTwitch(true)}>
                    <Tv data-icon="inline-start" />
                    Watch Live Twitch Player
                  </Button>
                  {nextVod && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/games/${nextVod.id}`)}
                    >
                      Watch Previous Completed VOD #{nextVod.id}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Floating Exit Theater Button when in Theater Mode */}
            {theaterMode && (
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setTheaterMode(false)}
                  className="bg-background/85 backdrop-blur-md border border-border"
                >
                  <Minimize2 data-icon="inline-start" />
                  Exit Theater (T)
                </Button>
              </div>
            )}
          </div>

          {/* Interactive Scrubber & Chapter Timeline Strip */}
          {activeEpisode && !watchLiveTwitch && (
            <div className="flex flex-col border-t border-border/80 bg-card/95 px-3 py-2 gap-1.5">
              {/* Scrubber Bar */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold text-primary w-14">
                  {formatDuration(videoTime)}
                </span>
                <div className="relative flex-1 flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, activeEpisode.duration)}
                    value={videoTime}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setVideoTime(val)
                      if (ytPlayerRef.current?.seekTo) {
                        ytPlayerRef.current.seekTo(val, true)
                      }
                    }}
                    aria-label="Seek episode timeline and chat replay"
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                  />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground w-14 text-right">
                  {formatDuration(activeEpisode.duration)}
                </span>
              </div>

              {/* Stream Chapters Breakdown */}
              {vod.chapters && vod.chapters.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-0.5">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground shrink-0 flex items-center gap-1">
                    <Layers className="size-3 text-primary" />
                    Stream Chapters:
                  </span>
                  {vod.chapters.map((ch) => {
                    const isCurrentChapter =
                      currentVodOffset >= ch.start && currentVodOffset <= ch.end
                    return (
                      <div
                        key={ch.id}
                        className={cn(
                          'flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-colors shrink-0',
                          isCurrentChapter
                            ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                            : 'bg-secondary/50 text-muted-foreground'
                        )}
                      >
                        <img
                          src={formatBoxArtUrl(ch.image, 32, 44)}
                          alt={ch.name}
                          className="h-3.5 w-2.5 rounded-xs object-cover"
                        />
                        <span>{ch.name}</span>
                        <span className="font-mono text-[10px] opacity-75">
                          ({formatDuration(ch.duration)})
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Broadcast Telemetry & Control Deck */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-3 py-2.5 sm:px-4">
            {/* Left: Active Game Boxart + Episode Title + Stream Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {activeEpisode && (
                <Link
                  href={`/games?game_id=${activeEpisode.game_id}`}
                  className="hidden sm:block shrink-0 overflow-hidden rounded-md border border-border hover:border-primary/50 transition-colors"
                  title={`View all ${activeEpisode.game_name} episodes`}
                >
                  <img
                    src={formatBoxArtUrl(activeEpisode.chapter_image, 80, 108)}
                    alt={activeEpisode.game_name}
                    className="h-11 w-8 object-cover"
                  />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-sm font-bold text-foreground sm:text-base">
                    {activeEpisode ? activeEpisode.title : vod.title}
                  </h1>
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px] shrink-0"
                  >
                    VOD #{vod.id}
                  </Badge>
                  {vod.is_live && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-[10px]">
                      LIVE STREAM
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {activeEpisode && (
                    <Link
                      href={`/games?game_id=${activeEpisode.game_id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {activeEpisode.game_name}
                    </Link>
                  )}
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Calendar className="size-3" />
                    {formatDateShort(
                      activeEpisode?.created_at || vod.created_at
                    )}
                  </span>
                  <span className="hidden md:inline truncate max-w-md text-[11px] opacity-80">
                    {vod.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Multi-Part Selector + Seek Controls + Share + Prev/Next VOD */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {games.length > 1 && (
                <select
                  value={activePartIndex}
                  onChange={(e) => {
                    const idx = Number(e.target.value)
                    setActivePartIndex(idx)
                    setVideoTime(0)
                  }}
                  aria-label="Select episode part in this VOD"
                  className="h-8 rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  {games.map((g, idx) => (
                    <option key={g.id} value={idx}>
                      Part {idx + 1}: {g.title} ({formatDuration(g.duration)})
                    </option>
                  ))}
                </select>
              )}

              {!watchLiveTwitch && activeEpisode && (
                <div className="hidden lg:flex items-center gap-1 mr-1">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => seekVideoRelative(-30)}
                    title="Rewind 30 seconds"
                  >
                    <Rewind data-icon="inline-start" />
                    30s
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => seekVideoRelative(30)}
                    title="Fast-forward 30 seconds"
                  >
                    30s
                    <FastForward data-icon="inline-end" />
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="xs"
                onClick={() => setWatchLiveTwitch((v) => !v)}
                className={cn(
                  watchLiveTwitch &&
                    'border-primary/50 bg-primary/15 text-primary'
                )}
              >
                <Tv data-icon="inline-start" />
                {watchLiveTwitch ? 'Episode VOD' : 'Live Player'}
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={handleCopyTimestampLink}
                title="Copy shareable link at current timestamp"
              >
                {copiedLink ? (
                  <Check data-icon="inline-start" className="text-emerald-400" />
                ) : (
                  <Share2 data-icon="inline-start" />
                )}
                {copiedLink ? 'Copied' : 'Share Time'}
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={() => setTheaterMode((v) => !v)}
                className="hidden sm:inline-flex"
                title="Toggle Theater Mode (T)"
              >
                {theaterMode ? <Minimize2 /> : <Maximize2 />}
              </Button>

              {/* Prev / Next VOD Navigation */}
              <div className="flex items-center gap-1 border-l border-border pl-1.5">
                {prevVod && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => router.push(`/games/${prevVod.id}`)}
                    title={`Newer VOD: ${prevVod.title}`}
                  >
                    <SkipBack data-icon="inline-start" />
                    Newer
                  </Button>
                )}
                {nextVod && (
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => router.push(`/games/${nextVod.id}`)}
                    title={`Older VOD: ${nextVod.title}`}
                  >
                    Older
                    <SkipForward data-icon="inline-end" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Synchronized 60fps Chat Replay Column */}
        <ChatReplayPanel
          vodId={vod.id}
          episodeStartOffset={activeEpisode?.start ?? 0}
          currentVodOffset={currentVodOffset}
          isPlaying={isPlaying}
          emotes={emotes}
          badges={badges}
          initialComments={bundle.initialComments ?? []}
          initialCursor={bundle.initialCursor ?? null}
          isPortrait={isPortrait}
          onSeekToVodOffset={handleSeekToVodOffset}
          collapsed={chatCollapsed}
          onToggleCollapse={() => setChatCollapsed((v) => !v)}
        />
      </div>
    </div>
  )
}
