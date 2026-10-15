'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, SpinnerRing } from './icons'
import { Thumb, ytMaxres } from './thumb'

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<any> | null = null

/** Loads the YouTube IFrame API once per page. */
export function loadYouTubeApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT)
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    document.head.appendChild(tag)
  })
  return apiPromise
}

export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const

/*
  Click-to-load YouTube player.

  The page first shows the episode thumbnail with a play button (a few KB)
  instead of YouTube's ~1MB player, so the watch page paints instantly.
  When the visitor arrived by clicking around the site we skip the poster and
  start the player right away, since the browser will allow autoplay then.
*/
export function YouTubePlayer({
  videoId,
  start = 0,
  poster,
  boxArt,
  title,
  onPlayer,
  onStateChange,
  quality = 'hd1080',
}: {
  quality?: string
  videoId: string
  start?: number
  poster?: string | null
  boxArt?: string | null
  title: string
  onPlayer: (player: any | null) => void
  onStateChange?: (state: number) => void
}) {
  const [active, setActive] = useState(false)
  const [ready, setReady] = useState(false)
  const shownOnceRef = useRef(false)
  if (ready) shownOnceRef.current = true
  const hostRef = useRef<HTMLDivElement | null>(null)
  const onPlayerRef = useRef(onPlayer)
  onPlayerRef.current = onPlayer
  const onStateRef = useRef(onStateChange)
  onStateRef.current = onStateChange
  const startRef = useRef(start)
  startRef.current = start

  // Warm up: fetch the API while the visitor looks at the poster.
  // If they navigated here from another page of the site, just start.
  useEffect(() => {
    const hasInteracted = (navigator as any).userActivation?.hasBeenActive === true
    if (hasInteracted) {
      setActive(true)
      return
    }
    const idle =
      (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 600))
    const handle = idle(() => loadYouTubeApi().catch(() => {}))
    return () => {
      ;(window as any).cancelIdleCallback?.(handle)
    }
  }, [])

  useEffect(() => {
    if (!active || !hostRef.current) return
    let alive = true
    let player: any = null
    const mount = document.createElement('div')
    hostRef.current.appendChild(mount)
    setReady(false)

    loadYouTubeApi().then((YT) => {
      if (!alive) return
      player = new YT.Player(mount, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          start: Math.floor(startRef.current) || undefined,
          // Quality hint. The embed's "Auto" caps at the player's size (often
          // 480p–720p); `vq` asks for this quality up front, like picking it
          // in the gear menu. YouTube falls back if the video doesn't have it.
          vq: quality === 'auto' ? undefined : quality,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
        },
        events: {
          onReady: (e: any) => {
            if (!alive) return
            setReady(true)
            onPlayerRef.current(e.target)
            e.target.playVideo?.()
          },
          onStateChange: (e: any) => alive && onStateRef.current?.(e.data),
        },
      })
    })

    return () => {
      alive = false
      onPlayerRef.current(null)
      try {
        player?.destroy?.()
      } catch {}
      mount.remove()
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [active, videoId, quality])

  return (
    <div className="absolute inset-0 bg-black">
      <div
        ref={hostRef}
        className={
          'absolute inset-0 transition-opacity duration-300 [&_iframe]:size-full ' +
          (ready ? 'opacity-100' : 'opacity-0')
        }
      />

      {!ready && shownOnceRef.current && (
        <span className="absolute inset-0 flex items-center justify-center bg-black">
          <SpinnerRing className="size-9 text-white/80" />
        </span>
      )}

      {!ready && !shownOnceRef.current && (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Play ${title}`}
          className="group absolute inset-0 flex items-center justify-center"
        >
          <span className="absolute inset-0">
            <Thumb
              key={videoId}
              srcs={[ytMaxres(videoId), poster]}
              boxArt={boxArt}
              priority
            />
          </span>
          <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
          <span
            className={
              'relative flex size-[72px] items-center justify-center rounded-full text-white transition-[transform,background-color] duration-200 ' +
              (active
                ? 'bg-black/60'
                : 'bg-black/60 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground')
            }
          >
            {active ? (
              <SpinnerRing className="size-8" />
            ) : (
              <Play className="ml-0.5 size-8" />
            )}
          </span>
        </button>
      )}
    </div>
  )
}
