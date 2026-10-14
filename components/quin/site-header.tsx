'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Tv,
  Film,
  Library,
  Search,
  Radio,
  ExternalLink,
  Sparkles,
  Play,
  Clock,
  Gamepad2,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Kbd } from '@/components/ui/kbd'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
  QUIN_SOCIALS,
} from '@/lib/quin-utils'
import type {
  QuinGameEpisode,
  QuinLibraryGame,
  QuinOverviewData,
} from '@/lib/quin-types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function SiteHeader({
  compact = false,
  rightSlot,
}: {
  compact?: boolean
  rightSlot?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const { data: overview } = useSWR<QuinOverviewData>(
    '/api/quin/overview',
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 220)
    return () => clearTimeout(timer)
  }, [query])

  const { data: searchGamesRes, isLoading: isSearching } = useSWR<{
    success: boolean
    data: QuinGameEpisode[]
  }>(
    searchOpen && debouncedQuery.length >= 2
      ? `/api/quin/games?limit=8&page=1&game_name=${encodeURIComponent(debouncedQuery)}`
      : null,
    fetcher
  )

  const { data: searchLibraryRes } = useSWR<{
    success: boolean
    data: QuinLibraryGame[]
  }>(
    searchOpen && debouncedQuery.length >= 2
      ? `/api/quin/library?limit=6&page=1&game_name=${encodeURIComponent(debouncedQuery)}`
      : null,
    fetcher
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const isLive = overview?.stats?.isLive ?? false
  const liveVod = overview?.liveVod
  const latestVodId = overview?.stats?.latestVodId ?? 780

  const navItems = [
    {
      href: '/',
      label: 'Broadcast Hub',
      icon: Tv,
      active: pathname === '/',
    },
    {
      href: '/games',
      label: 'All Episodes',
      icon: Film,
      active: pathname === '/games',
      badge: overview?.stats?.totalEpisodes
        ? `${overview.stats.totalEpisodes}`
        : '922',
    },
    {
      href: '/library',
      label: 'Game Library',
      icon: Library,
      active: pathname === '/library',
      badge: overview?.stats?.totalGames
        ? `${overview.stats.totalGames}`
        : '92',
    },
    {
      href: `/games/${latestVodId}`,
      label: 'Theater Replay',
      icon: Play,
      active: pathname.startsWith('/games/') && pathname !== '/games',
    },
  ]

  const displayedEpisodes =
    debouncedQuery.length >= 2
      ? (searchGamesRes?.data ?? [])
      : (overview?.recentEpisodes?.slice(0, 5) ?? [])

  const displayedLibrary =
    debouncedQuery.length >= 2
      ? (searchLibraryRes?.data ?? [])
      : (overview?.topGames?.slice(0, 6) ?? [])

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl transition-colors',
          compact ? 'h-12' : 'h-14'
        )}
      >
        <div className="mx-auto flex h-full max-w-[1800px] items-center justify-between gap-4 px-3 sm:px-5">
          {/* Left: Brand + Primary Nav */}
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <Link
              href="/"
              className="group flex items-center gap-2.5 focus:outline-none shrink-0"
            >
              <div className="relative size-8 overflow-hidden rounded-lg border border-primary/40 bg-secondary shadow-sm transition-transform group-hover:scale-105">
                <img
                  src="/quin69-logo.jpg"
                  alt="Quin69 Teddy Logo"
                  className="size-full object-cover"
                />
                {isLive && (
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
                )}
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    QUIN69
                  </span>
                  <span className="rounded bg-primary/15 px-1 py-0.5 font-mono text-[10px] font-semibold text-primary">
                    .GG
                  </span>
                </div>
                <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground">
                  ARCHIVE &amp; REPLAY v2
                </span>
              </div>
            </Link>

            <nav
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0',
                      item.active
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'ml-0.5 rounded px-1.5 py-0.2 font-mono text-[10px]',
                          item.active
                            ? 'bg-primary/20 text-primary'
                            : 'bg-secondary text-muted-foreground'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Center / Right: Quick Search + Live Stream Pill + Socials */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-8 items-center gap-2.5 rounded-md border border-border bg-secondary/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground"
              aria-label="Quick search episodes and games"
            >
              <Search className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline-block pr-4">
                Search 920+ episodes or games...
              </span>
              <span className="sm:hidden">Search</span>
              <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
            </button>

            {isLive ? (
              <Link
                href="/?live=1"
                className="flex h-8 items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
                title={liveVod?.title || 'Quin69 is currently LIVE on Twitch'}
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <span className="font-mono tracking-wide">LIVE NOW</span>
              </Link>
            ) : (
              <a
                href="https://twitch.tv/quin69"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden lg:flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Radio className="size-3.5 text-primary" />
                <span>Twitch Channel</span>
                <ExternalLink className="size-3 opacity-60" />
              </a>
            )}

            {rightSlot}

            <div className="hidden 2xl:flex items-center gap-1 pl-1 border-l border-border">
              {QUIN_SOCIALS.slice(0, 4).map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title={`${social.name} (${social.handle})`}
                >
                  {social.name}
                </a>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {/* Mobile Drawer Nav */}
        {mobileMenuOpen && (
          <div className="border-b border-border bg-card px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium',
                      item.active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" />
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
              <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                {QUIN_SOCIALS.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-secondary px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {social.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Instant Command Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0 border-border bg-card">
          <DialogHeader className="border-b border-border p-3">
            <DialogTitle className="sr-only">
              Search Quin69 Episodes and Games
            </DialogTitle>
            <div className="flex items-center gap-2 px-1">
              <Search className="size-4 text-primary shrink-0" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (
                    e.nativeEvent.isComposing ||
                    e.keyCode === 229
                  ) {
                    return
                  }
                  if (e.key === 'Enter' && query.trim()) {
                    setSearchOpen(false)
                    router.push(
                      `/games?filter=Game&game=${encodeURIComponent(query.trim())}`
                    )
                  }
                }}
                placeholder="Type a game name (e.g. Path of Exile, Valheim, Elden Ring, Terraria)..."
                className="h-9 border-0 bg-transparent px-1 text-sm focus-visible:ring-0"
                autoFocus
              />
              {query && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setQuery('')}
                >
                  Clear
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-[65vh] overflow-y-auto p-3 chat-scrollbar flex flex-col gap-4">
            {/* Matching Games Library */}
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Gamepad2 className="size-3.5 text-primary" />
                  {debouncedQuery.length >= 2
                    ? 'Matching Games in Library'
                    : 'Most Played Categories'}
                </span>
                <Link
                  href="/library"
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-primary hover:underline"
                >
                  View all 92 games
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {displayedLibrary.map((g) => (
                  <button
                    key={g.game_id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false)
                      router.push(`/games?game_id=${g.game_id}`)
                    }}
                    className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-secondary/40 p-2 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    <img
                      src={formatBoxArtUrl(g.chapter_image, 80, 106)}
                      alt={g.game_name}
                      className="h-11 w-8 rounded object-cover shrink-0 bg-muted"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {g.game_name}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {g.count} Episodes
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Matching / Latest Episodes */}
            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  {debouncedQuery.length >= 2
                    ? isSearching
                      ? 'Searching episodes...'
                      : 'Matching VOD Episodes'
                    : 'Recent Episodes with Chat Replay'}
                </span>
                <Link
                  href="/games"
                  onClick={() => setSearchOpen(false)}
                  className="text-xs text-primary hover:underline"
                >
                  Browse all episodes
                </Link>
              </div>
              <div className="flex flex-col gap-1.5">
                {displayedEpisodes.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No episodes found matching &ldquo;{debouncedQuery}&rdquo;.
                  </p>
                ) : (
                  displayedEpisodes.map((ep) => (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => {
                        setSearchOpen(false)
                        router.push(`/games/${ep.vod_id}?game_id=${ep.id}`)
                      }}
                      className="flex items-center justify-between gap-3 rounded-lg border border-transparent bg-secondary/30 p-2 text-left transition-colors hover:border-primary/30 hover:bg-secondary/80"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-11 w-20 shrink-0 overflow-hidden rounded bg-muted">
                          {ep.thumbnail_url && (
                            <img
                              src={ep.thumbnail_url}
                              alt={ep.title}
                              className="size-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-background/90 px-1 font-mono text-[10px] text-foreground">
                            {formatDuration(ep.duration)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {ep.title}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {ep.game_name} &bull; {formatDateShort(ep.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                        VOD #{ep.vod_id}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-4 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 text-primary" />
              Press <Kbd>Enter</Kbd> to filter all episodes
            </span>
            <span className="font-mono">Edge-Cached Archive API</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
