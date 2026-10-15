'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Search, Twitch } from './icons'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  quinAvatar,
  episodeHref,
  formatBoxArtUrl,
  formatDateShort,
  formatDuration,
} from '@/lib/quin-utils'
import type {
  QuinGameEpisode,
  QuinLibraryGame,
  QuinOverviewData,
} from '@/lib/quin-types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useOverview(fallbackData?: QuinOverviewData) {
  return useSWR<QuinOverviewData>('/api/quin/overview', fetcher, {
    fallbackData,
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
}

export function SiteHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const { data: overview } = useOverview()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const nav = [
    { href: '/', label: 'Home', active: pathname === '/' },
    {
      href: '/games',
      label: 'Episodes',
      active: pathname.startsWith('/games'),
    },
    { href: '/library', label: 'Games', active: pathname === '/library' },
    { href: '/clips', label: 'Clips', active: pathname === '/clips' },
  ]

  return (
    <>
      <header
        className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-background"
      >
        <div className="mx-auto flex h-full max-w-[1600px] items-center gap-2 px-3 sm:gap-6 sm:px-5">
          <Link href="/" className="group/logo flex shrink-0 items-center gap-2.5">
            <img
              src={quinAvatar(70)}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full bg-surface object-cover ring-2 ring-transparent transition-shadow group-hover/logo:ring-primary"
            />
            <span className="hidden font-display text-[22px] font-bold leading-none tracking-wide sm:inline">
              QUIN69
            </span>
          </Link>

          <nav aria-label="Main" className="flex h-full items-stretch">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center px-2.5 text-[14px] font-medium transition-colors sm:px-3',
                  'after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:origin-center after:bg-primary after:transition-transform after:duration-200 sm:after:inset-x-3',
                  item.active
                    ? 'text-foreground after:scale-x-100'
                    : 'text-muted-foreground after:scale-x-0 hover:text-foreground hover:after:scale-x-50'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="press flex h-9 items-center gap-2 rounded-md bg-surface px-2.5 text-muted-foreground hover:bg-raised hover:text-foreground md:w-64"
            >
              <Search className="size-4" />
              <span className="hidden text-[13px] md:inline">Search games</span>
              <kbd className="ml-auto hidden rounded border border-border px-1.5 text-[11px] text-faint md:inline">
                /
              </kbd>
            </button>

            {rightSlot}

            <a
              href="https://twitch.tv/quin69"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Quin69 on Twitch"
              className="press hidden size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground lg:flex"
            >
              <Twitch className="size-5" />
            </a>
          </div>
        </div>
      </header>

      {searchOpen && (
        <SearchDialog
          open={searchOpen}
          onOpenChange={setSearchOpen}
          overview={overview}
        />
      )}
    </>
  )
}

function SearchDialog({
  open,
  onOpenChange,
  overview,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  overview?: QuinOverviewData
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 180)
    return () => clearTimeout(t)
  }, [query])

  const searching = debounced.length >= 2

  const { data: gamesRes } = useSWR<{ data: QuinLibraryGame[] }>(
    searching
      ? `/api/quin/library?limit=6&page=1&game_name=${encodeURIComponent(debounced)}`
      : null,
    fetcher,
    { keepPreviousData: true }
  )
  const { data: episodesRes, isLoading } = useSWR<{ data: QuinGameEpisode[] }>(
    searching
      ? `/api/quin/games?limit=8&page=1&game_name=${encodeURIComponent(debounced)}`
      : null,
    fetcher,
    { keepPreviousData: true }
  )

  const games = searching
    ? (gamesRes?.data ?? [])
    : (overview?.topGames?.slice(0, 6) ?? [])
  const episodes = searching
    ? (episodesRes?.data ?? [])
    : (overview?.recentEpisodes?.slice(0, 5) ?? [])

  const go = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden rounded-lg bg-surface p-0 ring-border sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return
              if (e.key === 'Enter' && query.trim()) {
                go(`/games?game=${encodeURIComponent(query.trim())}`)
              }
            }}
            placeholder="Path of Exile, Valheim, Elden Ring…"
            className="h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-border px-1.5 text-[11px] text-faint">
            Esc
          </kbd>
        </div>

        <div className="thin-scroll max-h-[60vh] overflow-y-auto py-2">
          {games.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-2 text-[12px] text-faint">
                {searching ? 'Games' : 'Most played'}
              </p>
              {games.map((g) => (
                <button
                  key={g.game_id}
                  type="button"
                  onClick={() => go(`/games?game_id=${g.game_id}`)}
                  className="flex w-full items-center gap-3 px-4 py-1.5 text-left transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                >
                  <img
                    src={formatBoxArtUrl(g.chapter_image, 52, 70)}
                    alt=""
                    className="h-[35px] w-[26px] shrink-0 rounded-sm bg-raised object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate">{g.game_name}</span>
                  <span className="tnum text-[12px] text-muted-foreground">
                    {g.count} eps
                  </span>
                </button>
              ))}
            </>
          )}

          <p className="px-4 pb-1 pt-3 text-[12px] text-faint">
            {searching ? (isLoading ? 'Searching…' : 'Episodes') : 'Latest episodes'}
          </p>
          {episodes.length === 0 && searching && !isLoading ? (
            <p className="px-4 py-6 text-muted-foreground">
              Nothing found for “{debounced}”.
            </p>
          ) : (
            episodes.map((ep) => (
              <button
                key={ep.id}
                type="button"
                onClick={() => go(episodeHref(ep))}
                className="flex w-full items-center gap-3 px-4 py-1.5 text-left transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
              >
                <span className="relative h-[34px] w-[60px] shrink-0 overflow-hidden rounded-sm bg-raised">
                  {ep.thumbnail_url && (
                    <img
                      src={ep.thumbnail_url}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{ep.title}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {ep.game_name} · {formatDateShort(ep.created_at)}
                  </span>
                </span>
                <span className="tnum text-[12px] text-muted-foreground">
                  {formatDuration(ep.duration)}
                </span>
              </button>
            ))
          )}
        </div>

        {query.trim() && (
          <button
            type="button"
            onClick={() =>
              go(`/games?game=${encodeURIComponent(query.trim())}`)
            }
            className="border-t border-border px-4 py-2.5 text-left text-[13px] text-muted-foreground hover:bg-raised hover:text-foreground"
          >
            See all episodes matching “{query.trim()}” ↵
          </button>
        )}
      </DialogContent>
    </Dialog>
  )
}
