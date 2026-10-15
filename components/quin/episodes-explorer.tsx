'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR, { preload } from 'swr'
import { ArrowLeft, ArrowRight, Close as X, Search } from './icons'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { EpisodeCard, EpisodeGridSkeleton } from './episode-card'
import { Pager } from './pager'
import { formatBoxArtUrl, formatCount } from '@/lib/quin-utils'
import { useWatchProgress } from '@/lib/use-quin-state'
import type { QuinGameEpisode, QuinLibraryGame } from '@/lib/quin-types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20
const fetcher = (url: string) => fetch(url).then((r) => r.json())

type GamesResponse = {
  success: boolean
  data: QuinGameEpisode[]
  meta: { page: number; limit: number; total: number }
}

export function EpisodesExplorer({
  initialEpisodes,
  initialTotal,
  topGames,
}: {
  initialEpisodes: QuinGameEpisode[]
  initialTotal: number
  topGames: QuinLibraryGame[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getEpisodeProgress } = useWatchProgress()

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const gameId = searchParams.get('game_id') || ''
  const gameQuery = searchParams.get('game') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  const [input, setInput] = useState(gameQuery)
  const typedRef = useRef(false)

  useEffect(() => {
    if (!typedRef.current) setInput(gameQuery)
  }, [gameQuery])

  const setParams = (
    patch: Record<string, string | null>,
    mode: 'push' | 'replace' = 'push'
  ) => {
    const next = new URLSearchParams(searchParams.toString())
    next.delete('filter') // legacy param
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    const url = `/games${qs ? `?${qs}` : ''}`
    if (mode === 'replace') router.replace(url, { scroll: false })
    else router.push(url)
  }

  // Search as you type (debounced), without stacking history entries
  useEffect(() => {
    if (!typedRef.current) return
    const value = input.trim()
    const t = setTimeout(() => {
      typedRef.current = false
      if (value === gameQuery) return
      setParams({ game: value || null, game_id: null, page: null }, 'replace')
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  const buildUrl = (p: number) => {
    const sp = new URLSearchParams()
    sp.set('limit', String(PAGE_SIZE))
    sp.set('page', String(p))
    sp.set('sort', 'created_at')
    sp.set('order', 'desc')
    if (gameId) sp.set('game_id', gameId)
    if (gameQuery) sp.set('game_name', gameQuery)
    if (from && to) {
      const f = new Date(from)
      const tt = new Date(to)
      if (!isNaN(+f) && !isNaN(+tt)) {
        sp.set('from', f.toISOString())
        sp.set('to', tt.toISOString())
      }
    }
    return `/api/quin/games?${sp.toString()}`
  }
  const apiUrl = buildUrl(page)

  const isDefault = page === 1 && !gameId && !gameQuery && !from && !to

  const { data, isLoading } = useSWR<GamesResponse>(apiUrl, fetcher, {
    fallbackData: isDefault
      ? {
          success: true,
          data: initialEpisodes,
          meta: { page: 1, limit: PAGE_SIZE, total: initialTotal },
        }
      : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const episodes = data?.data ?? []
  const total = data?.meta?.total ?? initialTotal
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const prefetch = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) preload(buildUrl(p), fetcher)
  }

  const activeGame = useMemo(() => {
    if (!gameId) return null
    const g = topGames.find((x) => String(x.game_id) === gameId)
    return {
      name: g?.game_name ?? episodes[0]?.game_name ?? 'Game',
      image: g?.chapter_image ?? episodes[0]?.chapter_image ?? null,
    }
  }, [gameId, topGames, episodes])

  const title = activeGame
    ? activeGame.name
    : gameQuery
      ? `Episodes matching “${gameQuery}”`
      : 'All episodes'

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="page-in mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pb-12 pt-6 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            {activeGame?.image && (
              <img
                src={formatBoxArtUrl(activeGame.image, 96, 128)}
                alt=""
                className="h-16 w-12 rounded-sm bg-surface object-cover"
              />
            )}
            <div>
              {activeGame && (
                <Link
                  href="/games"
                  className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  All episodes
                </Link>
              )}
              <h1 className="font-display text-[34px] font-semibold leading-none tracking-wide">
                {title}
              </h1>
              <p className="tnum mt-1.5 text-muted-foreground">
                {formatCount(total)} episodes
              </p>
            </div>
          </div>

          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Filter by game</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={input}
              onChange={(e) => {
                typedRef.current = true
                setInput(e.target.value)
              }}
              placeholder="Filter by game"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-9 outline-none placeholder:text-faint focus:border-primary"
            />
            {input && (
              <button
                type="button"
                aria-label="Clear filter"
                onClick={() => {
                  typedRef.current = false
                  setInput('')
                  setParams({ game: null, page: null }, 'replace')
                }}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        {topGames.length > 0 && (
          <div className="no-scrollbar -mx-3 mt-5 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip
              active={!gameId && !gameQuery}
              onClick={() => {
                setInput('')
                setParams({ game_id: null, game: null, page: null })
              }}
            >
              All
            </Chip>
            {topGames.slice(0, 8).map((g) => {
              const active = String(g.game_id) === gameId
              return (
                <Chip
                  key={g.game_id}
                  active={active}
                  onClick={() => {
                    setInput('')
                    setParams({
                      game_id: active ? null : String(g.game_id),
                      game: null,
                      page: null,
                    })
                  }}
                >
                  {g.game_name}
                  <span className={cn('tnum ml-1.5', active ? 'opacity-70' : 'text-faint')}>
                    {g.count}
                  </span>
                </Chip>
              )
            })}
            <Link
              href="/library"
              className="flex h-8 shrink-0 items-center px-2 text-[13px] text-muted-foreground hover:text-foreground"
            >
              More games
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </div>
        )}

        <div className="mt-6">
          {isLoading && episodes.length === 0 ? (
            <div className="grid grid-cols-1 gap-x-4 gap-y-7 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              <EpisodeGridSkeleton count={PAGE_SIZE} />
            </div>
          ) : episodes.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[16px]">No episodes found.</p>
              <button
                type="button"
                onClick={() => {
                  setInput('')
                  router.push('/games')
                }}
                className="mt-2 text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div
              className={cn(
                'stagger grid grid-cols-1 gap-x-4 gap-y-7 transition-opacity min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5',
                isLoading && 'opacity-60'
              )}
            >
              {episodes.map((ep, i) => (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  priority={i < 4}
                  index={i}
                  progressSeconds={getEpisodeProgress(ep.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <Pager
            page={page}
            totalPages={totalPages}
            prevLabel="Newer"
            nextLabel="Older"
            onPrefetch={prefetch}
            onPage={(p) => setParams({ page: p <= 1 ? null : String(p) })}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'press flex h-8 shrink-0 items-center rounded-md px-3 text-[13px] font-medium',
        active
          ? 'bg-foreground text-background'
          : 'bg-surface text-foreground/85 hover:bg-raised'
      )}
    >
      {children}
    </button>
  )
}
