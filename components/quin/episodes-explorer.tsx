'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR, { preload } from 'swr'
import {
  Film,
  Search,
  Calendar,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Gamepad2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { EpisodeCard } from './episode-card'
import { useWatchProgress } from '@/lib/use-quin-state'
import type { QuinGameEpisode, QuinLibraryGame } from '@/lib/quin-types'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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

  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const gameIdParam = searchParams.get('game_id') || ''
  const filterModeParam = searchParams.get('filter') || 'Default'
  const gameSearchParam = searchParams.get('game') || ''
  const fromDateParam = searchParams.get('from') || ''
  const toDateParam = searchParams.get('to') || ''

  const [searchInput, setSearchInput] = useState(gameSearchParam)
  const [fromDate, setFromDate] = useState(fromDateParam)
  const [toDate, setToDate] = useState(toDateParam)

  useEffect(() => {
    setSearchInput(gameSearchParam)
  }, [gameSearchParam])

  const updateUrlParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    router.push(`/games${qs ? `?${qs}` : ''}`)
  }

  // Build API URL for current filter state
  const apiUrl = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('limit', '20')
    sp.set('page', String(pageParam))
    sp.set('sort', 'created_at')
    sp.set('order', 'desc')
    if (gameIdParam) sp.set('game_id', gameIdParam)
    if (gameSearchParam) sp.set('game_name', gameSearchParam)
    if (fromDateParam && toDateParam) {
      try {
        sp.set('from', new Date(fromDateParam).toISOString())
        sp.set('to', new Date(toDateParam).toISOString())
      } catch {
        // Ignore invalid date
      }
    }
    return `/api/quin/games?${sp.toString()}`
  }, [pageParam, gameIdParam, gameSearchParam, fromDateParam, toDateParam])

  const isDefaultInitialState =
    pageParam === 1 &&
    !gameIdParam &&
    !gameSearchParam &&
    !fromDateParam &&
    !toDateParam

  const { data, isLoading } = useSWR<{
    success: boolean
    data: QuinGameEpisode[]
    meta: { page: number; limit: number; total: number }
  }>(apiUrl, fetcher, {
    fallbackData: isDefaultInitialState
      ? {
          success: true,
          data: initialEpisodes,
          meta: { page: 1, limit: 20, total: initialTotal },
        }
      : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const episodes = data?.data ?? []
  const totalEpisodes = data?.meta?.total ?? initialTotal
  const totalPages = Math.max(1, Math.ceil(totalEpisodes / 20))

  // Prefetch next page for instant pagination
  const prefetchPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return
    const sp = new URLSearchParams(apiUrl.split('?')[1] || '')
    sp.set('page', String(targetPage))
    preload(`/api/quin/games?${sp.toString()}`, fetcher)
  }

  const activeCategoryName = useMemo(() => {
    if (!gameIdParam) return null
    const found = topGames.find((g) => String(g.game_id) === gameIdParam)
    if (found) return found.game_name
    return episodes[0]?.game_name ?? `Game #${gameIdParam}`
  }, [gameIdParam, topGames, episodes])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 px-3 py-6 sm:px-6">
        {/* Page Header + Filter Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {gameIdParam && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateUrlParams({ game_id: null, page: null })}
                >
                  <ArrowLeft data-icon="inline-start" />
                  All Games
                </Button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Film className="size-5 text-primary" />
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {activeCategoryName
                      ? `${activeCategoryName} Episodes`
                      : 'All Quin69 Episodes'}
                  </h1>
                  <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-xs">
                    {totalEpisodes} Episodes
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Watch any episode with full Twitch chat replay, 7TV/BTTV/FFZ
                  emotes, and VOD chapter timelines.
                </p>
              </div>
            </div>

            {/* Search & Filter Mode Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return
                    if (e.key === 'Enter') {
                      updateUrlParams({
                        game: searchInput.trim() || null,
                        filter: searchInput.trim() ? 'Game' : null,
                        page: null,
                      })
                    }
                  }}
                  placeholder="Filter by game name..."
                  className="h-9 pr-8 text-xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('')
                      updateUrlParams({ game: null, filter: null, page: null })
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <Button
                size="sm"
                onClick={() =>
                  updateUrlParams({
                    game: searchInput.trim() || null,
                    filter: searchInput.trim() ? 'Game' : null,
                    page: null,
                  })
                }
              >
                <Search data-icon="inline-start" />
                Filter
              </Button>
            </div>
          </div>

          {/* Quick Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border/60 pt-3 chat-scrollbar">
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground flex items-center gap-1 mr-1">
              <Gamepad2 className="size-3.5 text-primary" />
              Categories:
            </span>
            <button
              type="button"
              onClick={() =>
                updateUrlParams({ game_id: null, game: null, page: null })
              }
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                !gameIdParam && !gameSearchParam
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              )}
            >
              All Episodes
            </button>
            {topGames.slice(0, 8).map((g) => {
              const active = String(g.game_id) === gameIdParam
              return (
                <button
                  key={g.game_id}
                  type="button"
                  onClick={() =>
                    updateUrlParams({
                      game_id: active ? null : String(g.game_id),
                      game: null,
                      page: null,
                    })
                  }
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <span>{g.game_name}</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({g.count})
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Episodes Grid */}
        {isLoading && episodes.length === 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[16/12] rounded-xl border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
            <Film className="size-8 text-muted-foreground" />
            <h2 className="text-base font-bold">
              No episodes found matching your filter
            </h2>
            <p className="text-xs text-muted-foreground">
              Try clearing your search or selecting another game category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput('')
                router.push('/games')
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {episodes.map((ep) => (
              <EpisodeCard
                key={ep.id}
                episode={ep}
                progressSeconds={getEpisodeProgress(ep.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground">
              Page <strong className="text-foreground">{pageParam}</strong> of{' '}
              <strong className="text-foreground">{totalPages}</strong> &bull;{' '}
              {totalEpisodes} Episodes
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pageParam <= 1}
                onMouseEnter={() => prefetchPage(pageParam - 1)}
                onClick={() =>
                  updateUrlParams({
                    page: pageParam - 1 <= 1 ? null : String(pageParam - 1),
                  })
                }
              >
                <ChevronLeft data-icon="inline-start" />
                Prev
              </Button>

              {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                let p = i + 1
                if (totalPages > 7 && pageParam > 4) {
                  p = Math.min(totalPages - 6 + i, pageParam - 3 + i)
                }
                return (
                  <Button
                    key={p}
                    variant={p === pageParam ? 'default' : 'outline'}
                    size="sm"
                    className="font-mono w-9"
                    onMouseEnter={() => prefetchPage(p)}
                    onClick={() =>
                      updateUrlParams({ page: p === 1 ? null : String(p) })
                    }
                  >
                    {p}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                disabled={pageParam >= totalPages}
                onMouseEnter={() => prefetchPage(pageParam + 1)}
                onClick={() =>
                  updateUrlParams({ page: String(pageParam + 1) })
                }
              >
                Next
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
