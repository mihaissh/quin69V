'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/*
  Thin yellow bar at the top while a page is loading (like YouTube).
  Starts the moment an internal link is clicked, finishes when the new URL
  has rendered. Pure transform/opacity, so it never janks.
*/
export function NavProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      if (url.pathname === location.pathname && url.search === location.search) return
      if (timer.current) clearTimeout(timer.current)
      setState('loading')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // URL changed → page rendered: finish the bar, then hide it
  useEffect(() => {
    setState((s) => (s === 'loading' ? 'done' : s))
    timer.current = setTimeout(() => setState('idle'), 400)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pathname, searchParams])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]"
      style={{ opacity: state === 'idle' ? 0 : 1, transition: 'opacity 300ms ease 100ms' }}
    >
      <div
        className="h-full origin-left bg-primary shadow-[0_0_8px_var(--accent-c)]"
        style={{
          transform: `scaleX(${state === 'idle' ? 0 : state === 'loading' ? 0.8 : 1})`,
          transition:
            state === 'loading'
              ? 'transform 2.5s cubic-bezier(0.1, 0.7, 0.2, 1)'
              : state === 'done'
                ? 'transform 200ms ease-out'
                : 'none',
        }}
      />
    </div>
  )
}
