'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ChatHide as PanelRightClose,
  ChatShow as PanelRightOpen,
  Close as X,
  Settings as Settings2,
  SpinnerDots,
} from './icons'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  formatDuration,
  getEmoteSrcSet,
  getEmoteUrl,
  normalizeUserColor,
} from '@/lib/quin-utils'
import { DEFAULT_CHAT_SETTINGS, useChatSettings } from '@/lib/use-quin-state'
import type {
  QuinBadgeSet,
  QuinBadgeVersion,
  QuinChatComment,
  QuinEmoteItem,
} from '@/lib/quin-types'
import { cn } from '@/lib/utils'

const MAX_VISIBLE_MESSAGES = 150
const TICK_MS = 200

/* ------------------------------------------------------------------ */
/* One chat line. Plain <img title> for emotes and badges: no tooltip  */
/* components per emote, which keeps fast chat cheap to render.        */
/* ------------------------------------------------------------------ */

interface ChatRowProps {
  comment: QuinChatComment
  episodeStartOffset: number
  showTimestamp: boolean
  emoteLookup: Map<string, QuinEmoteItem>
  badgeLookup: Map<string, Map<string, QuinBadgeVersion>>
  onSeekToVodOffset?: (vodSeconds: number) => void
}

const ChatMessageRow = memo(function ChatMessageRow({
  comment,
  episodeStartOffset,
  showTimestamp,
  emoteLookup,
  badgeLookup,
  onSeekToVodOffset,
}: ChatRowProps) {
  const color = normalizeUserColor(comment.user_color)
  const rel = Math.max(0, comment.content_offset_seconds - episodeStartOffset)

  const badges: React.ReactNode[] = []
  for (let i = 0; i < (comment.user_badges?.length ?? 0); i++) {
    const b = comment.user_badges[i]
    const setId = b._id || b.setID
    const v = setId ? badgeLookup.get(setId)?.get(b.version) : undefined
    if (!v) continue
    const label =
      setId === 'subscriber'
        ? Number(b.version) > 1
          ? `Subscriber (${b.version} months)`
          : 'Subscriber'
        : v.title || setId!.replace(/-/g, ' ')
    badges.push(
      <img
        key={`b${i}`}
        src={v.image_url_1x}
        srcSet={`${v.image_url_1x} 1x, ${v.image_url_2x} 2x, ${v.image_url_4x} 4x`}
        alt={label}
        title={label}
        width={18}
        height={18}
        className="mr-1 inline-block size-[18px] -translate-y-px align-middle"
        loading="lazy"
      />
    )
  }

  const parts: React.ReactNode[] = []
  const msg = comment.message ?? []
  for (let s = 0; s < msg.length; s++) {
    const frag = msg[s]
    if (frag.emote || frag.emoticon) {
      const id = frag.emote ? frag.emote.emoteID : frag.emoticon!.emoticon_id
      parts.push(
        <img
          key={`t${s}`}
          src={getEmoteUrl(id, 'Twitch', 1)}
          srcSet={getEmoteSrcSet(id, 'Twitch')}
          alt={frag.text}
          title={frag.text}
          className="mx-px inline-block h-7 w-auto align-middle"
          loading="lazy"
        />,
        ' '
      )
      continue
    }
    if (!frag.text) continue
    const words = frag.text.split(' ')
    let buffer = ''
    for (let w = 0; w < words.length; w++) {
      const token = words[w]
      const emote = token ? emoteLookup.get(token) : undefined
      if (emote) {
        if (buffer) {
          parts.push(buffer)
          buffer = ''
        }
        parts.push(
          <img
            key={`e${s}-${w}`}
            src={getEmoteUrl(emote.id, emote.provider, 1)}
            srcSet={getEmoteSrcSet(emote.id, emote.provider)}
            alt={emote.code}
            title={`${emote.code} · ${emote.provider}`}
            className="mx-px inline-block h-7 w-auto align-middle"
            loading="lazy"
          />,
          ' '
        )
      } else {
        buffer += token + ' '
      }
    }
    if (buffer) parts.push(buffer)
  }

  return (
    <div className="chat-row chat-in break-words px-3 py-[3px] leading-[1.6] hover:bg-white/[0.03]">
      {showTimestamp && (
        <button
          type="button"
          onClick={() => onSeekToVodOffset?.(comment.content_offset_seconds)}
          title="Jump video here"
          className="tnum mr-1.5 align-baseline text-[0.85em] text-faint hover:text-primary"
        >
          {formatDuration(rel)}
        </button>
      )}
      {badges}
      <span className="font-bold" style={{ color }}>
        {comment.display_name}
      </span>
      <span className="text-muted-foreground">: </span>
      <span>{parts}</span>
    </div>
  )
})

/* ------------------------------------------------------------------ */

interface ChatReplayPanelProps {
  vodId: number | string
  episodeStartOffset: number
  /** Fallback stream offset (seconds) used before the player exists. */
  currentVodOffset: number
  /** Reads the live playhead straight from the player, in stream seconds. */
  getPlayhead?: () => number | null
  isPlaying: boolean
  emotes: QuinEmoteItem[]
  badges: { channel: QuinBadgeSet[]; global: QuinBadgeSet[] }
  initialComments?: QuinChatComment[]
  initialCursor?: string | null
  isPortrait?: boolean
  onSeekToVodOffset?: (vodSeconds: number) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  className?: string
}

/** First index whose offset is > t (binary search, buffer is sorted). */
function upperBound(buf: QuinChatComment[], t: number) {
  let lo = 0
  let hi = buf.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (buf[mid].content_offset_seconds <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** Drops repeated message ids (the archive's pages can overlap). */
function uniqueById(list: QuinChatComment[], seen = new Set<string>()) {
  const out: QuinChatComment[] = []
  for (const m of list) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out
}

const KEEP_HISTORY = 400 // already-shown messages kept in memory for instant small rewinds

export function ChatReplayPanel({
  vodId,
  episodeStartOffset,
  currentVodOffset,
  getPlayhead,
  isPlaying,
  emotes,
  badges,
  initialComments = [],
  initialCursor = null,
  isPortrait = false,
  onSeekToVodOffset,
  collapsed = false,
  onToggleCollapse,
  className,
}: ChatReplayPanelProps) {
  const { settings, updateSettings, resetSettings } = useChatSettings()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [visible, setVisible] = useState<QuinChatComment[]>([])
  const [loading, setLoading] = useState(true)
  const [scrolledUp, setScrolledUp] = useState(false)

  const [initialUnique] = useState(() => uniqueById(initialComments))
  const bufferRef = useRef<QuinChatComment[]>(initialUnique)
  const bufferIndexRef = useRef(0)
  const cursorRef = useRef<string | null>(initialCursor)
  const fetchingCursorRef = useRef(false)
  const genRef = useRef(0) // bumps on every seek; stale responses are dropped
  const lastNowRef = useRef<number | null>(null)
  const lastWallRef = useRef(0)
  const anchoringRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const programmaticScrollRef = useRef(false)

  // Everything the ticker reads lives in refs, so the interval never restarts.
  const getPlayheadRef = useRef(getPlayhead)
  getPlayheadRef.current = getPlayhead
  const fallbackRef = useRef(currentVodOffset)
  fallbackRef.current = currentVodOffset
  const delayRef = useRef(settings.userChatDelay)
  delayRef.current = settings.userChatDelay

  const emoteLookup = useMemo(() => {
    const map = new Map<string, QuinEmoteItem>()
    for (const e of emotes) map.set(e.code, e)
    return map
  }, [emotes])

  const badgeLookup = useMemo(() => {
    const map = new Map<string, Map<string, QuinBadgeVersion>>()
    for (const set of [...(badges.global || []), ...(badges.channel || [])]) {
      const v = map.get(set.set_id) || new Map<string, QuinBadgeVersion>()
      for (const ver of set.versions || []) v.set(ver.id, ver)
      map.set(set.set_id, v)
    }
    return map
  }, [badges])

  const filterRegex = useMemo(() => {
    if (!settings.filterWords.length) return null
    const escaped = settings.filterWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i')
  }, [settings.filterWords])
  const filterRef = useRef(filterRegex)
  filterRef.current = filterRegex

  const passes = (m: QuinChatComment) => {
    const re = filterRef.current
    return !re || !re.test(m.message?.map((f) => f.text).join(' ') || '')
  }

  const fetchAtOffset = useCallback(
    async (target: number, gen: number) => {
      const sec = Math.max(0, Math.floor(target))
      anchoringRef.current = true
      setLoading(true)
      try {
        const res = await fetch(`/api/quin/vods/${vodId}/comments?content_offset_seconds=${sec}`)
        const json = await res.json()
        if (gen !== genRef.current) return // user seeked again meanwhile
        const comments: QuinChatComment[] = json?.data?.comments ?? []
        bufferRef.current = uniqueById(comments)
        cursorRef.current = json?.data?.cursor || null
        bufferIndexRef.current = 0
        setVisible([])
      } catch {
        // network blip: allow the next tick to try again
        if (gen === genRef.current) lastNowRef.current = null
      } finally {
        if (gen === genRef.current) {
          anchoringRef.current = false
          setLoading(false)
        }
      }
    },
    [vodId]
  )

  const fetchNextPage = useCallback(async () => {
    if (fetchingCursorRef.current || !cursorRef.current) return
    fetchingCursorRef.current = true
    const gen = genRef.current
    try {
      const res = await fetch(
        `/api/quin/vods/${vodId}/comments?cursor=${encodeURIComponent(cursorRef.current)}`
      )
      const json = await res.json()
      if (gen !== genRef.current) return
      if (json?.success && json.data?.comments?.length) {
        const idx = bufferIndexRef.current
        const keepFrom = Math.max(0, idx - KEEP_HISTORY)
        const kept = bufferRef.current.slice(keepFrom)
        const seen = new Set(kept.map((m) => m.id))
        bufferRef.current = kept.concat(uniqueById(json.data.comments as QuinChatComment[], seen))
        bufferIndexRef.current = idx - keepFrom
      }
      cursorRef.current = json?.data?.cursor || null
    } catch {
      // ignore; retried on a later tick
    } finally {
      fetchingCursorRef.current = false
    }
  }, [vodId])

  /** Jump chat to a new playhead: reuse the buffer when it covers the time, else refetch. */
  const reanchor = useCallback(
    (now: number) => {
      const gen = ++genRef.current
      const buf = bufferRef.current
      const covered =
        buf.length > 0 &&
        buf[0].content_offset_seconds <= now + 2 &&
        (now <= buf[buf.length - 1].content_offset_seconds || !cursorRef.current)
      if (covered) {
        const idx = upperBound(buf, now)
        bufferIndexRef.current = idx
        const recent: QuinChatComment[] = []
        for (let i = idx - 1; i >= 0 && recent.length < 40; i--) {
          if (passes(buf[i])) recent.push(buf[i])
        }
        setVisible(recent.reverse())
        setLoading(false)
        return
      }
      setVisible([])
      // Start a little earlier so the panel isn't empty right after a seek
      fetchAtOffset(now - 20, gen)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchAtOffset]
  )

  // VOD changed (next/prev stream): start over
  useEffect(() => {
    bufferRef.current = uniqueById(initialComments)
    cursorRef.current = initialCursor
    bufferIndexRef.current = 0
    lastNowRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vodId])

  /*
    One steady ticker (5x a second). Each tick reads the real player time, so
    chat follows playback speed, buffering, pauses and seeks made with
    YouTube's own controls. A jump that normal playback can't explain is a seek.
  */
  useEffect(() => {
    const id = setInterval(() => {
      const raw = getPlayheadRef.current?.() ?? fallbackRef.current
      const now = raw + delayRef.current
      const wall = performance.now()
      const dt = (wall - lastWallRef.current) / 1000
      lastWallRef.current = wall
      const last = lastNowRef.current
      lastNowRef.current = now

      if (last === null || now < last - 1 || now - last > dt * 2.5 + 2) {
        reanchor(now)
        return
      }
      if (anchoringRef.current) return

      const buf = bufferRef.current
      let idx = bufferIndexRef.current
      const incoming: QuinChatComment[] = []
      while (idx < buf.length && buf[idx].content_offset_seconds <= now) {
        if (passes(buf[idx])) incoming.push(buf[idx])
        idx++
      }
      bufferIndexRef.current = idx
      if (incoming.length) {
        setVisible((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const fresh = uniqueById(incoming, seen)
          if (!fresh.length) return prev
          const merged = prev.concat(fresh)
          return merged.length > MAX_VISIBLE_MESSAGES
            ? merged.slice(merged.length - MAX_VISIBLE_MESSAGES)
            : merged
        })
      }
      if (buf.length - idx < 40 && cursorRef.current) fetchNextPage()
    }, TICK_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reanchor, fetchNextPage])

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    programmaticScrollRef.current = true
    el.scrollTop = el.scrollHeight
    setScrolledUp(false)
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false
    })
  }, [])

  useEffect(() => {
    if (!scrolledUp) scrollToBottom()
  }, [visible, scrolledUp, scrollToBottom])

  const onScroll = useCallback(() => {
    if (programmaticScrollRef.current) return
    const el = scrollRef.current
    if (!el) return
    setScrolledUp(el.scrollHeight - (el.scrollTop + el.clientHeight) > 60)
  }, [])

  if (collapsed && !isPortrait) {
    return (
      <div className="flex w-11 shrink-0 flex-col items-center border-l border-border bg-surface py-2">
        <IconButton label="Show chat (C)" onClick={onToggleCollapse}>
          <PanelRightOpen className={cn('size-[18px]', settings.chatOnLeft && 'rotate-180')} />
        </IconButton>
      </div>
    )
  }

  return (
    <aside
      aria-label="Chat replay"
      className={cn(
        'relative flex min-h-0 w-full flex-1 flex-col border-t border-border bg-surface',
        className,
        'lg:w-[var(--chat-w)] lg:flex-none lg:shrink-0 lg:self-stretch lg:border-t-0',
        settings.chatOnLeft ? 'lg:border-r' : 'lg:border-l'
      )}
      style={{ '--chat-w': `${settings.chatWidth}px` } as React.CSSProperties}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2">
        {onToggleCollapse && (
          <span className="hidden lg:contents">
            <IconButton label="Hide chat (C)" onClick={onToggleCollapse}>
              <PanelRightClose className={cn('size-[18px]', settings.chatOnLeft && 'rotate-180')} />
            </IconButton>
          </span>
        )}
        <h2 className="flex-1 text-center text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Chat replay
        </h2>
        <IconButton label="Chat settings" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="size-[18px]" />
        </IconButton>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="thin-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2"
        style={{ overflowAnchor: 'none', fontSize: settings.messageFontSize }}
      >
        <div className="mt-auto">
          {loading && visible.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-3 py-6 text-[13px] text-faint">
              <SpinnerDots className="size-5 text-primary" />
              Loading chat
            </p>
          ) : visible.length === 0 ? (
            <p className="fade-in px-4 py-8 text-center text-[13px] text-muted-foreground">
              {isPlaying ? 'Chat was quiet here.' : 'Chat plays along with the video.'}
            </p>
          ) : (
            visible.map((c) => (
              <ChatMessageRow
                key={c.id}
                comment={c}
                episodeStartOffset={episodeStartOffset}
                showTimestamp={settings.showTimestamp}
                emoteLookup={emoteLookup}
                badgeLookup={badgeLookup}
                onSeekToVodOffset={onSeekToVodOffset}
              />
            ))
          )}
        </div>
      </div>

      {scrolledUp && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="press fade-in absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-raised px-3.5 py-1.5 text-[13px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.5)] ring-1 ring-border hover:bg-line"
        >
          <ArrowDown className="size-3.5" />
          Back to live chat
        </button>
      )}

      {settingsOpen && (
        <ChatSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          updateSettings={updateSettings}
          resetSettings={resetSettings}
        />
      )}
    </aside>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */

function ChatSettingsDialog({
  open,
  onOpenChange,
  settings,
  updateSettings,
  resetSettings,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  settings: typeof DEFAULT_CHAT_SETTINGS
  updateSettings: (p: Partial<typeof DEFAULT_CHAT_SETTINGS>) => void
  resetSettings: () => void
}) {
  const [word, setWord] = useState('')
  const addWord = () => {
    const w = word.trim()
    if (w && !settings.filterWords.includes(w)) {
      updateSettings({ filterWords: [...settings.filterWords, w] })
    }
    setWord('')
  }

  const row = 'flex items-center justify-between gap-4 py-3'
  const stepBtn =
    'flex size-8 items-center justify-center rounded-md bg-raised text-[15px] hover:bg-line'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-lg bg-surface p-5 ring-border sm:max-w-sm">
        <DialogTitle className="font-display text-[22px] font-semibold tracking-wide">
          Chat settings
        </DialogTitle>

        <div className="mt-2 divide-y divide-border text-[14px]">
          <label className={row}>
            <span>Show timestamps</span>
            <input
              type="checkbox"
              checked={settings.showTimestamp}
              onChange={(e) => updateSettings({ showTimestamp: e.target.checked })}
              className="size-4 accent-[var(--accent-c)]"
            />
          </label>

          <div className={row}>
            <span>Chat side</span>
            <div className="flex rounded-md bg-raised p-0.5">
              {(['Left', 'Right'] as const).map((side) => {
                const active = (side === 'Left') === settings.chatOnLeft
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => updateSettings({ chatOnLeft: side === 'Left' })}
                    className={cn(
                      'h-7 rounded px-3 text-[13px]',
                      active ? 'bg-foreground text-background' : 'text-muted-foreground'
                    )}
                  >
                    {side}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={row}>
            <span>Text size</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={stepBtn}
                aria-label="Smaller text"
                onClick={() => updateSettings({ messageFontSize: Math.max(11, settings.messageFontSize - 1) })}
              >
                −
              </button>
              <span className="tnum w-10 text-center">{settings.messageFontSize}px</span>
              <button
                type="button"
                className={stepBtn}
                aria-label="Larger text"
                onClick={() => updateSettings({ messageFontSize: Math.min(20, settings.messageFontSize + 1) })}
              >
                +
              </button>
            </div>
          </div>

          <label className="flex flex-col gap-2 py-3 max-lg:hidden">
            <span className="flex justify-between">
              <span>Chat width</span>
              <span className="tnum text-muted-foreground">{settings.chatWidth}px</span>
            </span>
            <input
              type="range"
              min={260}
              max={560}
              step={10}
              value={settings.chatWidth}
              onChange={(e) => updateSettings({ chatWidth: Number(e.target.value) })}
              className="w-full accent-[var(--accent-c)]"
            />
          </label>

          <div className={row}>
            <span>
              Chat delay
              <span className="block text-[12px] text-muted-foreground">
                If chat feels early or late
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={stepBtn}
                aria-label="Show chat earlier"
                onClick={() => updateSettings({ userChatDelay: settings.userChatDelay - 1 })}
              >
                −
              </button>
              <span className="tnum w-10 text-center">
                {settings.userChatDelay > 0 ? '+' : ''}
                {settings.userChatDelay}s
              </span>
              <button
                type="button"
                className={stepBtn}
                aria-label="Show chat later"
                onClick={() => updateSettings({ userChatDelay: settings.userChatDelay + 1 })}
              >
                +
              </button>
            </div>
          </div>

          <div className="py-3">
            <p>Hide messages containing</p>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addWord()
              }}
            >
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="word or emote"
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 outline-none placeholder:text-faint focus:border-primary"
              />
              <button
                type="submit"
                className="h-9 rounded-md bg-raised px-3 hover:bg-line"
              >
                Add
              </button>
            </form>
            {settings.filterWords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {settings.filterWords.map((w) => (
                  <span
                    key={w}
                    className="flex h-7 items-center gap-1 rounded-md bg-raised pl-2.5 pr-1 text-[13px]"
                  >
                    {w}
                    <button
                      type="button"
                      aria-label={`Stop hiding ${w}`}
                      onClick={() =>
                        updateSettings({ filterWords: settings.filterWords.filter((x) => x !== w) })
                      }
                      className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-between">
          <button
            type="button"
            onClick={resetSettings}
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:brightness-110"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
