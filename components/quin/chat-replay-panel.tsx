'use client'

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from 'react'
import {
  Settings2,
  PauseCircle,
  PlayCircle,
  ArrowDownToLine,
  PanelLeftClose,
  PanelRightClose,
  RotateCcw,
  Flame,
  Clock,
  Filter,
  Plus,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  formatDuration,
  getEmoteSrcSet,
  getEmoteUrl,
  normalizeUserColor,
} from '@/lib/quin-utils'
import { useChatSettings } from '@/lib/use-quin-state'
import type {
  QuinBadgeSet,
  QuinBadgeVersion,
  QuinChatComment,
  QuinEmoteItem,
} from '@/lib/quin-types'
import { cn } from '@/lib/utils'

const MAX_VISIBLE_MESSAGES = 180

interface ChatRowProps {
  comment: QuinChatComment
  episodeStartOffset: number
  showTimestamp: boolean
  fontFamily: string
  fontSize: number
  emoteLookup: Map<string, QuinEmoteItem>
  badgeLookup: Map<string, Map<string, QuinBadgeVersion>>
  onSeekToVodOffset?: (vodSeconds: number) => void
}

const ChatMessageRow = memo(function ChatMessageRow({
  comment,
  episodeStartOffset,
  showTimestamp,
  fontFamily,
  fontSize,
  emoteLookup,
  badgeLookup,
  onSeekToVodOffset,
}: ChatRowProps) {
  const userColor = useMemo(
    () => normalizeUserColor(comment.user_color),
    [comment.user_color]
  )

  const relativeEpisodeSeconds = Math.max(
    0,
    comment.content_offset_seconds - episodeStartOffset
  )

  const renderedBadges = useMemo(() => {
    if (!comment.user_badges || comment.user_badges.length === 0) return null
    const items: React.ReactNode[] = []
    for (let i = 0; i < comment.user_badges.length; i++) {
      const b = comment.user_badges[i]
      const setId = b._id || b.setID
      if (!setId) continue
      const versionMap = badgeLookup.get(setId)
      const versionObj = versionMap?.get(b.version)
      if (!versionObj) continue

      const badgeLabel =
        setId === 'subscriber'
          ? b.version === '0' || b.version === '1'
            ? 'Subscriber'
            : `${b.version}-Month Subscriber`
          : `${setId.replace(/-/g, ' ')}`

      items.push(
        <Tooltip key={`${comment.id}-b-${setId}-${i}`}>
          <TooltipTrigger
            render={
              <span className="mr-1 inline-flex align-middle cursor-default" />
            }
          >
            <img
              src={versionObj.image_url_1x}
              srcSet={`${versionObj.image_url_1x} 1x, ${versionObj.image_url_2x} 2x, ${versionObj.image_url_4x} 4x`}
              alt={badgeLabel}
              className="inline-block size-4 align-middle select-none"
              loading="lazy"
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="flex flex-col items-center gap-1 p-2">
            <img
              src={versionObj.image_url_4x}
              alt={badgeLabel}
              className="size-9 object-contain"
            />
            <span className="text-[11px] font-semibold capitalize">
              {badgeLabel}
            </span>
          </TooltipContent>
        </Tooltip>
      )
    }
    return items
  }, [comment.user_badges, comment.id, badgeLookup])

  const renderedFragments = useMemo(() => {
    if (!comment.message || comment.message.length === 0) return null
    const nodes: React.ReactNode[] = []

    for (let s = 0; s < comment.message.length; s++) {
      const frag = comment.message[s]
      if (frag.emote || frag.emoticon) {
        const emoteId = frag.emote
          ? frag.emote.emoteID
          : frag.emoticon!.emoticon_id
        const code = frag.text
        nodes.push(
          <Tooltip key={`${comment.id}-tw-${s}`}>
            <TooltipTrigger
              render={
                <span className="mx-0.5 inline-flex align-middle cursor-default" />
              }
            >
              <img
                src={getEmoteUrl(emoteId, 'Twitch', 1)}
                srcSet={getEmoteSrcSet(emoteId, 'Twitch')}
                alt={code}
                className="inline-block h-6 w-auto align-middle select-none"
                loading="lazy"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="flex flex-col items-center gap-1 p-2.5">
              <img
                src={getEmoteUrl(emoteId, 'Twitch', 4)}
                alt={code}
                className="h-12 w-auto object-contain"
              />
              <span className="font-mono text-xs font-bold">{code}</span>
              <span className="text-[10px] text-muted-foreground">
                Twitch Emote
              </span>
            </TooltipContent>
          </Tooltip>,
          ' '
        )
      } else if (frag.text) {
        const words = frag.text.split(' ')
        for (let w = 0; w < words.length; w++) {
          const token = words[w]
          if (!token) {
            nodes.push(' ')
            continue
          }
          const matchedEmote = emoteLookup.get(token)
          if (matchedEmote) {
            nodes.push(
              <Tooltip key={`${comment.id}-em-${s}-${w}`}>
                <TooltipTrigger
                  render={
                    <span className="mx-0.5 inline-flex align-middle cursor-default" />
                  }
                >
                  <img
                    src={getEmoteUrl(
                      matchedEmote.id,
                      matchedEmote.provider,
                      1
                    )}
                    srcSet={getEmoteSrcSet(
                      matchedEmote.id,
                      matchedEmote.provider
                    )}
                    alt={matchedEmote.code}
                    className="inline-block h-6 max-h-7 w-auto align-middle select-none"
                    loading="lazy"
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="flex flex-col items-center gap-1 p-2.5"
                >
                  <img
                    src={getEmoteUrl(
                      matchedEmote.id,
                      matchedEmote.provider,
                      2
                    )}
                    alt={matchedEmote.code}
                    className="h-12 w-auto object-contain"
                  />
                  <span className="font-mono text-xs font-bold">
                    {matchedEmote.code}
                  </span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    {matchedEmote.provider} Emote
                  </span>
                </TooltipContent>
              </Tooltip>,
              ' '
            )
          } else {
            nodes.push(
              <span key={`${comment.id}-tx-${s}-${w}`}>{token} </span>
            )
          }
        }
      }
    }
    return nodes
  }, [comment.message, comment.id, emoteLookup])

  return (
    <div
      className="chat-row-perf group flex w-full items-baseline gap-1.5 rounded px-2.5 py-1 transition-colors hover:bg-secondary/60"
      style={{
        fontFamily,
        fontSize: `${fontSize}px`,
      }}
    >
      {showTimestamp && (
        <button
          type="button"
          onClick={() => onSeekToVodOffset?.(comment.content_offset_seconds)}
          className="shrink-0 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary cursor-pointer"
          title="Click to jump video to this chat message"
        >
          {formatDuration(relativeEpisodeSeconds)}
        </button>
      )}
      <div className="min-w-0 flex-1 leading-relaxed break-words">
        {renderedBadges}
        <span
          className="font-bold tracking-tight"
          style={{ color: userColor }}
        >
          {comment.display_name}
        </span>
        <span className="mr-1.5 text-muted-foreground">:</span>
        <span className="text-foreground/95">{renderedFragments}</span>
      </div>
    </div>
  )
})

interface ChatReplayPanelProps {
  vodId: number | string
  episodeStartOffset: number
  currentVodOffset: number
  isPlaying: boolean
  emotes: QuinEmoteItem[]
  badges: {
    channel: QuinBadgeSet[]
    global: QuinBadgeSet[]
  }
  initialComments?: QuinChatComment[]
  initialCursor?: string | null
  isPortrait?: boolean
  onSeekToVodOffset?: (vodSeconds: number) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function ChatReplayPanel({
  vodId,
  episodeStartOffset,
  currentVodOffset,
  isPlaying,
  emotes,
  badges,
  initialComments = [],
  initialCursor = null,
  isPortrait = false,
  onSeekToVodOffset,
  collapsed = false,
  onToggleCollapse,
}: ChatReplayPanelProps) {
  const { settings, updateSettings, resetSettings } = useChatSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newFilterWord, setNewFilterWord] = useState('')

  const [visibleMessages, setVisibleMessages] = useState<QuinChatComment[]>(
    () => initialComments.slice(0, 28)
  )
  const [isLoadingBatch, setIsLoadingBatch] = useState(
    () => initialComments.length === 0
  )
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [simulatedPlay, setSimulatedPlay] = useState(true)
  const [simOffset, setSimOffset] = useState(currentVodOffset)

  const bufferRef = useRef<QuinChatComment[]>(initialComments)
  const cursorRef = useRef<string | null>(initialCursor)
  const bufferIndexRef = useRef<number>(
    Math.min(28, initialComments.length)
  )
  const isFetchingCursorRef = useRef<boolean>(false)
  const isFetchingOffsetRef = useRef<boolean>(false)
  const lastFetchedOffsetRef = useRef<number>(
    initialComments.length > 0 ? currentVodOffset : -9999
  )

  useEffect(() => {
    if (initialComments.length > 0 && visibleMessages.length === 0) {
      bufferRef.current = initialComments
      cursorRef.current = initialCursor
      bufferIndexRef.current = Math.min(28, initialComments.length)
      lastFetchedOffsetRef.current = currentVodOffset
      setVisibleMessages(initialComments.slice(0, 28))
      setIsLoadingBatch(false)
    }
  }, [initialComments, initialCursor, visibleMessages.length, currentVodOffset])
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isProgrammaticScrollRef = useRef<boolean>(false)

  // Build O(1) Emote Map
  const emoteLookup = useMemo(() => {
    const map = new Map<string, QuinEmoteItem>()
    for (const item of emotes) {
      map.set(item.code, item)
    }
    return map
  }, [emotes])

  // Build O(1) Badge Map
  const badgeLookup = useMemo(() => {
    const map = new Map<string, Map<string, QuinBadgeVersion>>()
    for (const set of badges.global || []) {
      const vMap = new Map<string, QuinBadgeVersion>()
      for (const v of set.versions || []) vMap.set(v.id, v)
      map.set(set.set_id, vMap)
    }
    for (const set of badges.channel || []) {
      const vMap = map.get(set.set_id) || new Map<string, QuinBadgeVersion>()
      for (const v of set.versions || []) vMap.set(v.id, v)
      map.set(set.set_id, vMap)
    }
    return map
  }, [badges])

  // Filter word regex
  const filterRegex = useMemo(() => {
    if (!settings.filterWords.length) return null
    const escaped = settings.filterWords.map((w) =>
      w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i')
  }, [settings.filterWords])

  // Effective VOD offset (syncs with video player or simulated replay clock when video is idle)
  useEffect(() => {
    setSimOffset(currentVodOffset)
  }, [currentVodOffset])

  useEffect(() => {
    if (isPlaying || !simulatedPlay) return
    const timer = setInterval(() => {
      setSimOffset((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [isPlaying, simulatedPlay])

  const effectiveVodOffset =
    (isPlaying ? currentVodOffset : simOffset) + settings.userChatDelay

  // Fetch initial chat batch at offset
  const fetchAtOffset = useCallback(
    async (targetSeconds: number) => {
      if (isFetchingOffsetRef.current) return
      isFetchingOffsetRef.current = true
      const cleanSec = Math.max(0, Math.floor(targetSeconds))
      lastFetchedOffsetRef.current = cleanSec
      setIsLoadingBatch(true)
      try {
        const res = await fetch(
          `/api/quin/vods/${vodId}/comments?content_offset_seconds=${cleanSec}`
        )
        const json = await res.json()
        if (json?.success && json.data?.comments) {
          const comments: QuinChatComment[] = json.data.comments
          bufferRef.current = comments
          cursorRef.current = json.data.cursor || null

          // Immediately show first slice of messages up to cleanSec + 8s so chat is populated immediately
          const initialSlice = comments.filter(
            (c) => c.content_offset_seconds <= cleanSec + 8
          )
          const seeded =
            initialSlice.length > 0 ? initialSlice : comments.slice(0, 24)
          bufferIndexRef.current = seeded.length
          setVisibleMessages(seeded.slice(-MAX_VISIBLE_MESSAGES))
        }
      } catch {
        // Ignore transient network errors
      } finally {
        isFetchingOffsetRef.current = false
        setIsLoadingBatch(false)
      }
    },
    [vodId]
  )

  // Prefetch next cursor page when buffer nears completion
  const fetchNextCursorBatch = useCallback(async () => {
    if (isFetchingCursorRef.current || !cursorRef.current) return
    isFetchingCursorRef.current = true
    try {
      const res = await fetch(
        `/api/quin/vods/${vodId}/comments?cursor=${encodeURIComponent(cursorRef.current)}`
      )
      const json = await res.json()
      if (json?.success && json.data?.comments?.length) {
        bufferRef.current = [
          ...bufferRef.current.slice(bufferIndexRef.current),
          ...json.data.comments,
        ]
        bufferIndexRef.current = 0
        cursorRef.current = json.data.cursor || null
      }
    } catch {
      // Ignore
    } finally {
      isFetchingCursorRef.current = false
    }
  }, [vodId])

  // Re-anchor when VOD or offset jumps significantly (> 45s)
  useEffect(() => {
    const diff = Math.abs(effectiveVodOffset - lastFetchedOffsetRef.current)
    if (diff > 45 || bufferRef.current.length === 0) {
      fetchAtOffset(effectiveVodOffset)
    }
  }, [vodId, effectiveVodOffset, fetchAtOffset])

  // Stream messages from buffer into visible window every 600ms
  useEffect(() => {
    const tick = () => {
      const buf = bufferRef.current
      if (!buf.length) return
      let idx = bufferIndexRef.current
      const incoming: QuinChatComment[] = []

      while (
        idx < buf.length &&
        buf[idx].content_offset_seconds <= effectiveVodOffset
      ) {
        const msg = buf[idx]
        const rawText = msg.message?.map((m) => m.text).join(' ') || ''
        if (!filterRegex || !filterRegex.test(rawText)) {
          incoming.push(msg)
        }
        idx++
      }

      if (incoming.length > 0) {
        bufferIndexRef.current = idx
        lastFetchedOffsetRef.current = effectiveVodOffset
        setVisibleMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const deduped = incoming.filter((m) => !existingIds.has(m.id))
          if (deduped.length === 0) return prev
          const merged = [...prev, ...deduped]
          return merged.length > MAX_VISIBLE_MESSAGES
            ? merged.slice(merged.length - MAX_VISIBLE_MESSAGES)
            : merged
        })
      }

      if (buf.length - idx < 25 && cursorRef.current) {
        fetchNextCursorBatch()
      }
    }

    const interval = setInterval(tick, 600)
    return () => clearInterval(interval)
  }, [effectiveVodOffset, filterRegex, fetchNextCursorBatch])

  // Auto-scroll to bottom when not paused by user
  const scrollToBottom = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    isProgrammaticScrollRef.current = true
    el.scrollTop = el.scrollHeight
    setIsUserScrolledUp(false)
    requestAnimationFrame(() => {
      isProgrammaticScrollRef.current = false
    })
  }, [])

  useEffect(() => {
    if (!isUserScrolledUp) {
      scrollToBottom()
    }
  }, [visibleMessages, isUserScrolledUp, scrollToBottom])

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
    setIsUserScrolledUp(distanceFromBottom > 65)
  }, [])

  // Compute Top Trending Emote in visible window for Hype Telemetry
  const topTrendingEmote = useMemo(() => {
    const counts = new Map<string, number>()
    for (const msg of visibleMessages.slice(-50)) {
      for (const frag of msg.message || []) {
        const words = (frag.text || '').split(' ')
        for (const w of words) {
          if (emoteLookup.has(w)) {
            counts.set(w, (counts.get(w) || 0) + 1)
          }
        }
      }
    }
    let bestCode = ''
    let bestCount = 0
    counts.forEach((cnt, code) => {
      if (cnt > bestCount) {
        bestCount = cnt
        bestCode = code
      }
    })
    return bestCount >= 2
      ? { emote: emoteLookup.get(bestCode)!, count: bestCount }
      : null
  }, [visibleMessages, emoteLookup])

  if (collapsed && !isPortrait) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center justify-between border-l border-border bg-card py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapse}
          title="Expand Synchronized Chat Replay"
          aria-label="Expand Synchronized Chat Replay"
        >
          {settings.chatOnLeft ? <PanelRightClose /> : <PanelLeftClose />}
        </Button>
        <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Chat Replay ({visibleMessages.length})
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSettingsOpen(true)}
          title="Chat Settings"
          aria-label="Chat Settings"
        >
          <Settings2 />
        </Button>
      </div>
    )
  }

  return (
    <aside
      aria-label="Synchronized Twitch Chat Replay"
      className={cn(
        'relative flex min-h-0 flex-col bg-card/95 border-border',
        isPortrait
          ? 'w-full flex-1 border-t'
          : settings.chatOnLeft
            ? 'shrink-0 self-stretch border-r'
            : 'shrink-0 self-stretch border-l'
      )}
      style={{
        width: isPortrait ? '100%' : `${settings.chatWidth}px`,
      }}
    >
      {/* Chat Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-2.5">
        <div className="flex items-center gap-1.5">
          {!isPortrait && onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggleCollapse}
              title="Collapse Chat Panel"
              aria-label="Collapse Chat Panel"
            >
              {settings.chatOnLeft ? <PanelLeftClose /> : <PanelRightClose />}
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold tracking-tight text-foreground">
              CHAT REPLAY
            </span>
          </div>
          <Badge
            variant="secondary"
            className="font-mono text-[10px] px-1.5 py-0"
            title="Current synchronized VOD offset"
          >
            {formatDuration(Math.max(0, effectiveVodOffset - episodeStartOffset))}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {!isPlaying && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setSimulatedPlay((v) => !v)}
              className={cn(
                'font-mono text-[10px] h-6 px-1.5',
                simulatedPlay ? 'text-emerald-400' : 'text-muted-foreground'
              )}
              title="Toggle live chat flow while video is paused"
            >
              {simulatedPlay ? (
                <>
                  <PauseCircle data-icon="inline-start" />
                  FLOWING
                </>
              ) : (
                <>
                  <PlayCircle data-icon="inline-start" />
                  PAUSED
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setSettingsOpen(true)}
            title="Chat Replay Settings"
            aria-label="Chat Replay Settings"
          >
            <SlidersHorizontal />
          </Button>
        </div>
      </div>

      {/* Hype / Top Emote Telemetry Strip */}
      {topTrendingEmote && (
        <div className="flex h-7 shrink-0 items-center justify-between border-b border-border/60 bg-secondary/40 px-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Flame className="size-3 text-primary" />
            <span>Chat Combo:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <img
              src={getEmoteUrl(
                topTrendingEmote.emote.id,
                topTrendingEmote.emote.provider,
                1
              )}
              alt={topTrendingEmote.emote.code}
              className="h-4 w-auto"
            />
            <span className="font-mono font-semibold text-foreground">
              {topTrendingEmote.emote.code}
            </span>
            <Badge variant="secondary" className="font-mono text-[10px] px-1 py-0">
              {topTrendingEmote.count}x
            </Badge>
          </div>
        </div>
      )}

      {/* Messages Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="chat-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto py-1.5"
        style={{ overflowAnchor: 'none' }}
      >
        <div className="mt-auto flex flex-col">
          {isLoadingBatch && visibleMessages.length === 0 ? (
            <div className="flex flex-col gap-2.5 p-3">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="h-3.5 w-10 rounded bg-secondary animate-pulse" />
                  <div className="h-3.5 w-20 rounded bg-secondary animate-pulse" />
                  <div className="h-3.5 flex-1 rounded bg-secondary/60 animate-pulse" />
                </div>
              ))}
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
              <Clock className="size-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Waiting for chat messages at this timestamp...
              </p>
              <Button
                variant="outline"
                size="xs"
                onClick={() => fetchAtOffset(effectiveVodOffset + 30)}
              >
                Skip +30s in Chat
              </Button>
            </div>
          ) : (
            visibleMessages.map((comment) => (
              <ChatMessageRow
                key={comment.id}
                comment={comment}
                episodeStartOffset={episodeStartOffset}
                showTimestamp={settings.showTimestamp}
                fontFamily={settings.fontFamily}
                fontSize={settings.messageFontSize}
                emoteLookup={emoteLookup}
                badgeLookup={badgeLookup}
                onSeekToVodOffset={onSeekToVodOffset}
              />
            ))
          )}
        </div>
      </div>

      {/* Paused Scroll Pill */}
      {isUserScrolledUp && (
        <div className="pointer-events-none absolute bottom-10 inset-x-0 flex justify-center px-3">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/95 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-md transition-transform hover:scale-105"
          >
            <ArrowDownToLine className="size-3.5 text-primary" />
            <span>Chat Paused — Jump to Live Sync</span>
          </button>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-secondary/30 px-2.5 text-[11px] text-muted-foreground">
        <span className="font-mono">
          {emotes.length.toLocaleString()} Emotes Loaded
        </span>
        <div className="flex items-center gap-2">
          {settings.userChatDelay !== 0 && (
            <span className="font-mono text-primary">
              Delay: {settings.userChatDelay > 0 ? '+' : ''}
              {settings.userChatDelay}s
            </span>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="hover:text-foreground transition-colors"
          >
            Configure
          </button>
        </div>
      </div>

      {/* Chat Replay Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold">
                Chat Replay Preferences
              </DialogTitle>
              <Button
                variant="ghost"
                size="xs"
                onClick={resetSettings}
                title="Reset all chat preferences to defaults"
              >
                <RotateCcw data-icon="inline-start" />
                Reset
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2 text-xs">
            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  updateSettings({ showTimestamp: !settings.showTimestamp })
                }
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2.5 text-left transition-colors',
                  settings.showTimestamp
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/40 text-muted-foreground'
                )}
              >
                <span className="font-medium">Timestamps</span>
                <Badge
                  variant={settings.showTimestamp ? 'default' : 'secondary'}
                  className="font-mono text-[10px]"
                >
                  {settings.showTimestamp ? 'ON' : 'OFF'}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() =>
                  updateSettings({ chatOnLeft: !settings.chatOnLeft })
                }
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2.5 text-left transition-colors',
                  settings.chatOnLeft
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border bg-secondary/40 text-muted-foreground'
                )}
              >
                <span className="font-medium">Dock Side</span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {settings.chatOnLeft ? 'LEFT' : 'RIGHT'}
                </Badge>
              </button>
            </div>

            {/* Font Size */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  Message Font Size
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {settings.messageFontSize}px
                </span>
              </div>
              <input
                type="range"
                min={11}
                max={20}
                step={1}
                value={settings.messageFontSize}
                onChange={(e) =>
                  updateSettings({ messageFontSize: Number(e.target.value) })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
              />
            </div>

            {/* Chat Width */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  Panel Width (Desktop)
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {settings.chatWidth}px
                </span>
              </div>
              <input
                type="range"
                min={260}
                max={540}
                step={10}
                value={settings.chatWidth}
                onChange={(e) =>
                  updateSettings({ chatWidth: Number(e.target.value) })
                }
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
              />
            </div>

            {/* Sync Offset / Delay */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">
                  Chat Sync Offset (Seconds)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      updateSettings({
                        userChatDelay: settings.userChatDelay - 2,
                      })
                    }
                  >
                    -2s
                  </Button>
                  <span className="w-12 text-center font-mono font-semibold">
                    {settings.userChatDelay > 0
                      ? `+${settings.userChatDelay}s`
                      : `${settings.userChatDelay}s`}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() =>
                      updateSettings({
                        userChatDelay: settings.userChatDelay + 2,
                      })
                    }
                  >
                    +2s
                  </Button>
                </div>
              </div>
            </div>

            {/* Word Filter */}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Filter className="size-3.5 text-primary" />
                Muted Words / Spam Filter
              </span>
              <div className="flex gap-2">
                <Input
                  value={newFilterWord}
                  onChange={(e) => setNewFilterWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return
                    if (e.key === 'Enter' && newFilterWord.trim()) {
                      const word = newFilterWord.trim()
                      if (!settings.filterWords.includes(word)) {
                        updateSettings({
                          filterWords: [...settings.filterWords, word],
                        })
                      }
                      setNewFilterWord('')
                    }
                  }}
                  placeholder="Add word or emote to hide..."
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    const word = newFilterWord.trim()
                    if (word && !settings.filterWords.includes(word)) {
                      updateSettings({
                        filterWords: [...settings.filterWords, word],
                      })
                      setNewFilterWord('')
                    }
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Add
                </Button>
              </div>
              {settings.filterWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {settings.filterWords.map((w) => (
                    <Badge
                      key={w}
                      variant="secondary"
                      className="flex items-center gap-1 font-mono text-[11px]"
                    >
                      {w}
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings({
                            filterWords: settings.filterWords.filter(
                              (item) => item !== w
                            ),
                          })
                        }
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
