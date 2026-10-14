'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR, { preload } from 'swr'
import {
  Library,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import {
  formatBoxArtUrl,
  formatDateShort,
  formatRelativeTime,
} from '@/lib/quin-utils'
import type { QuinLibraryGame } from '@/lib/quin-types'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function LibraryExplorer({
  initialGames,
  initialTotal,
}: {
  initialGames: QuinLibraryGame[]
  initialTotal: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const sortParam = searchParams.get('sort') || 'count'
  const searchParam = searchParams.get('search') || ''

  const [searchInput, setSearchInput] = useState(searchParam)

  useEffect(() => {
    setSearchInput(searchParam)
  }, [searchParam])

  const updateUrlParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    router.push(`/library${qs ? `?${qs}` : ''}`)
  }

  const apiUrl = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('limit', '20')
    sp.set('page', String(pageParam))
    sp.set('sort', sortParam)
    sp.set('order', sortParam === 'game_name' ? 'asc' : 'desc')
    if (searchParam) sp.set('game_name', searchParam)
    return `/api/quin/library?${sp.toString()}`
  }, [pageParam, sortParam, searchParam])

  const isDefaultInitialState =
    pageParam === 1 && sortParam === 'count' && !searchParam

  const { data, isLoading } = useSWR<{
    success: boolean
    data: QuinLibraryGame[]
    meta: { page: number; limit: number; total: number }
  }>(apiUrl, fetcher, {
    fallbackData: isDefaultInitialState
      ? {
          success: true,
          data: initialGames,
          meta: { page: 1, limit: 20, total: initialTotal },
        }
      : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const games = data?.data ?? []
  const totalGames = data?.meta?.total ?? initialTotal
  const totalPages = Math.max(1, Math.ceil(totalGames / 20))

  const prefetchPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > totalPages) return
    const sp = new URLSearchParams(apiUrl.split('?')[1] || '')
    sp.set('page', String(targetPage))
    preload(`/api/quin/library?${sp.toString()}`, fetcher)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 px-3 py-6 sm:px-6">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <Library className="size-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Quin69 Complete Game Library
              </h1>
              <Badge className="bg-primary/15 text-primary border-primary/30 font-mono text-xs">
                {totalGames} Games
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Select any game to browse every archived episode and full stream
              with chat replay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.keyCode === 229) return
                  if (e.key === 'Enter') {
                    updateUrlParams({
                      search: searchInput.trim() || null,
                      page: null,
                    })
                  }
                }}
                placeholder="Search game library..."
                className="h-9 pr-8 text-xs"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('')
                    updateUrlParams({ search: null, page: null })
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector Pills */}
            <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5">
              {[
                { key: 'count', label: 'Most Played' },
                { key: 'recent', label: 'Recently Played' },
                { key: 'game_name', label: 'A–Z' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() =>
                    updateUrlParams({ sort: opt.key, page: null })
                  }
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    sortParam === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Library Grid */}
        {isLoading && games.length === 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 15 }).map((_, idx) => (
              <div
                key={idx}
                className="aspect-[3/4] rounded-xl border border-border bg-card animate-pulse"
              />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card py-16 text-center">
            <Library className="size-8 text-muted-foreground" />
            <h2 className="text-base font-bold">
              No games found matching &ldquo;{searchParam}&rdquo;
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput('')
                router.push('/library')
              }}
            >
              Show All Games
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {games.map((game) => (
              <Link
                key={game.game_id}
                href={`/games?game_id=${game.game_id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-secondary">
                  <img
                    src={formatBoxArtUrl(game.chapter_image, 400, 530)}
                    alt={game.game_name}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 right-2.5">
                    <span className="rounded-md bg-background/90 px-2 py-0.5 font-mono text-xs font-bold text-primary border border-border/60">
                      {game.count} EPs
                    </span>
                  </div>
                  <div className="absolute bottom-3 inset-x-3 flex flex-col gap-1">
                    <h2 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {game.game_name}
                    </h2>
                    <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                      <span>Last played</span>
                      <span className="text-foreground/90">
                        {formatRelativeTime(game.last_played) ||
                          formatDateShort(game.last_played)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground">
              Page <strong className="text-foreground">{pageParam}</strong> of{' '}
              <strong className="text-foreground">{totalPages}</strong> &bull;{' '}
              {totalGames} Games
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
                const p = i + 1
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
