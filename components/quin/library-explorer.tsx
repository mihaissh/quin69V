'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR, { preload } from 'swr'
import { Close as X, Search } from './icons'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { Pager } from './pager'
import { formatBoxArtUrl, formatRelativeTime } from '@/lib/quin-utils'
import type { QuinLibraryGame } from '@/lib/quin-types'
import { cn, fadeIn } from '@/lib/utils'

const PAGE_SIZE = 24
const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SORTS = [
  { key: 'count', label: 'Most played' },
  { key: 'recent', label: 'Recently played' },
  { key: 'game_name', label: 'A–Z' },
] as const

export function LibraryExplorer({
  initialGames,
  initialTotal,
}: {
  initialGames: QuinLibraryGame[]
  initialTotal: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const sort = searchParams.get('sort') || 'count'
  const search = searchParams.get('search') || ''

  const [input, setInput] = useState(search)
  const typedRef = useRef(false)

  useEffect(() => {
    if (!typedRef.current) setInput(search)
  }, [search])

  const setParams = (
    patch: Record<string, string | null>,
    mode: 'push' | 'replace' = 'push'
  ) => {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    const url = `/library${qs ? `?${qs}` : ''}`
    if (mode === 'replace') router.replace(url, { scroll: false })
    else router.push(url)
  }

  useEffect(() => {
    if (!typedRef.current) return
    const value = input.trim()
    const t = setTimeout(() => {
      typedRef.current = false
      if (value === search) return
      setParams({ search: value || null, page: null }, 'replace')
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  const buildUrl = (p: number) => {
    const sp = new URLSearchParams()
    sp.set('limit', String(PAGE_SIZE))
    sp.set('page', String(p))
    sp.set('sort', sort)
    sp.set('order', sort === 'game_name' ? 'asc' : 'desc')
    if (search) sp.set('game_name', search)
    return `/api/quin/library?${sp.toString()}`
  }
  const apiUrl = buildUrl(page)
  const isDefault = page === 1 && sort === 'count' && !search

  const { data, isLoading } = useSWR<{
    success: boolean
    data: QuinLibraryGame[]
    meta: { page: number; limit: number; total: number }
  }>(apiUrl, fetcher, {
    fallbackData: isDefault
      ? {
          success: true,
          data: initialGames,
          meta: { page: 1, limit: PAGE_SIZE, total: initialTotal },
        }
      : undefined,
    keepPreviousData: true,
    revalidateOnFocus: false,
  })

  const games = data?.data ?? []
  const total = data?.meta?.total ?? initialTotal
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const prefetch = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) preload(buildUrl(p), fetcher)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="page-in mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-3 pb-12 pt-6 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[34px] font-semibold leading-none tracking-wide">
              Games
            </h1>
            <p className="tnum mt-1.5 text-muted-foreground">
              {total} games played on stream
            </p>
          </div>

          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search games</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              value={input}
              onChange={(e) => {
                typedRef.current = true
                setInput(e.target.value)
              }}
              placeholder="Search games"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-9 outline-none placeholder:text-faint focus:border-primary"
            />
            {input && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  typedRef.current = false
                  setInput('')
                  setParams({ search: null, page: null }, 'replace')
                }}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        <div role="tablist" aria-label="Sort" className="mt-5 flex gap-5 border-b border-border">
          {SORTS.map((opt) => {
            const active = sort === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setParams({ sort: opt.key === 'count' ? null : opt.key, page: null })}
                className={cn(
                  '-mb-px border-b-2 pb-2.5 text-[14px] font-medium transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          {isLoading && games.length === 0 ? (
            <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton aspect-[3/4] rounded-md" />
                  <div className="skeleton mt-2 h-3.5 w-3/4 rounded-sm" />
                </div>
              ))}
            </div>
          ) : games.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[16px]">No games match “{search}”.</p>
              <button
                type="button"
                onClick={() => {
                  setInput('')
                  router.push('/library')
                }}
                className="mt-2 text-primary hover:underline"
              >
                Show all games
              </button>
            </div>
          ) : (
            <ul
              className={cn(
                'stagger grid grid-cols-3 gap-x-3 gap-y-6 transition-opacity sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
                isLoading && 'opacity-60'
              )}
            >
              {games.map((g, i) => (
                <li key={g.game_id} style={{ '--i': i } as React.CSSProperties}>
                  <Link href={`/games?game_id=${g.game_id}`} className="group block">
                    <span className="lift block rounded-md">
                      <img
                        src={formatBoxArtUrl(g.chapter_image, 285, 380)}
                        alt=""
                        loading={i < 8 ? 'eager' : 'lazy'}
                        data-fade={i < 8 ? undefined : ''}
                        ref={i < 8 ? undefined : fadeIn}
                        decoding="async"
                        className="lift-inner aspect-[3/4] w-full rounded-md bg-surface object-cover"
                      />
                    </span>
                    <p className="mt-2 truncate font-medium transition-colors group-hover:text-primary" title={g.game_name}>
                      {g.game_name}
                    </p>
                    <p className="tnum truncate text-[13px] text-muted-foreground" suppressHydrationWarning>
                      {g.count} eps · {formatRelativeTime(g.last_played)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10">
          <Pager
            page={page}
            totalPages={totalPages}
            onPrefetch={prefetch}
            onPage={(p) => setParams({ page: p <= 1 ? null : String(p) })}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
