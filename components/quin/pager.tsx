'use client'

import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from './icons'

function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p))
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p))
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

export function Pager({
  page,
  totalPages,
  onPage,
  onPrefetch,
  prevLabel = 'Prev',
  nextLabel = 'Next',
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
  onPrefetch?: (p: number) => void
  prevLabel?: string
  nextLabel?: string
}) {
  if (totalPages <= 1) return null
  const item =
    'press tnum flex h-9 min-w-9 items-center justify-center rounded-md px-2.5 text-[14px] transition-colors'

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        disabled={page <= 1}
        onMouseEnter={() => onPrefetch?.(page - 1)}
        onClick={() => onPage(page - 1)}
        className={cn(item, 'text-muted-foreground hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40')}
      >
        <ArrowLeft className="mr-1 size-4" />
        {prevLabel}
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-faint">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            onMouseEnter={() => onPrefetch?.(p)}
            onClick={() => onPage(p)}
            className={cn(
              item,
              p === page
                ? 'bg-primary font-semibold text-primary-foreground'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onMouseEnter={() => onPrefetch?.(page + 1)}
        onClick={() => onPage(page + 1)}
        className={cn(item, 'text-muted-foreground hover:bg-surface hover:text-foreground disabled:pointer-events-none disabled:opacity-40')}
      >
        {nextLabel}
        <ArrowRight className="ml-1 size-4" />
      </button>
    </nav>
  )
}
