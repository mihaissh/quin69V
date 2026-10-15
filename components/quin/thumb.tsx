'use client'

import { useEffect, useState } from 'react'
import { fadeIn } from '@/lib/utils'
import { formatBoxArtUrl } from '@/lib/quin-utils'

/*
  Episode thumbnail with a proper placeholder.

  Right after an upload YouTube hasn't made thumbnails yet and serves a tiny
  grey 120×90 stub instead (it looks awful stretched). We try each source in
  order and, if all are stubs or fail, show the game's box art on a blurred
  backdrop with a small "New upload" note.
*/
export function Thumb({
  srcs,
  boxArt,
  label,
  priority = false,
  className = '',
}: {
  srcs: (string | null | undefined)[]
  boxArt?: string | null
  label?: string
  priority?: boolean
  className?: string
}) {
  const list = srcs.filter(Boolean) as string[]
  const [i, setI] = useState(0)
  const failed = i >= list.length

  // Warm the browser cache with the fallbacks in parallel, so if the first
  // source turns out to be YouTube's stub the next one shows instantly
  // instead of starting a new download (was several seconds in a row).
  const key = list.join('|')
  useEffect(() => {
    list.slice(1).forEach((u) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = u
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (failed) {
    return <ThumbPlaceholder boxArt={boxArt} label={label} className={className} />
  }

  const next = () => setI((v) => v + 1)


  return (
    <img
      key={list[i]}
      src={list[i]}
      alt=""
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      // Hidden until we know it's a real thumbnail, so the grey stub never flashes
      data-fade=""
      ref={(img) => {
        if (!img || img.dataset.watched) return
        img.dataset.watched = '1'
        // Native listeners: React can miss load/error that happen around hydration
        const check = () => {
          if (img.naturalWidth <= 120) next()
          else img.setAttribute('data-loaded', '')
        }
        if (img.complete) check()
        else {
          img.addEventListener('load', check, { once: true })
          img.addEventListener('error', next, { once: true })
        }
      }}
      onError={next}
      className={'size-full object-cover ' + className}
    />
  )
}

export function ThumbPlaceholder({
  boxArt,
  label,
  className = '',
}: {
  boxArt?: string | null
  label?: string
  className?: string
}) {
  const art = boxArt ? formatBoxArtUrl(boxArt, 285, 380) : null
  return (
    <span
      className={
        '[container-type:size] ph-in absolute inset-0 flex items-center justify-center overflow-hidden bg-surface ' +
        className
      }
    >
      {art && (
        <img
          src={art}
          alt=""
          aria-hidden
          data-fade=""
          ref={fadeIn}
          className="ph-bg absolute inset-0 size-full scale-125 object-cover blur-2xl"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/55" />
      <span className="relative flex flex-col items-center gap-3 px-3 text-center">
        {art && (
          <img
            src={art}
            alt=""
            aria-hidden
            data-fade=""
            ref={fadeIn}
            className="hidden h-[34cqh] w-auto rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.5)] @[480px]:block"
          />
        )}
        {label !== '' && (
          <span className="leading-snug text-white">
            <span className="block text-[12px] font-semibold @[300px]:text-[14px] @[640px]:text-[18px]">
              {label ?? "We're processing this video."}
            </span>
            <span className="block text-[11px] text-white/70 @[300px]:text-[13px] @[640px]:text-[15px]">
              Check back later.
            </span>
          </span>
        )}
      </span>
    </span>
  )
}

export const ytMaxres = (videoId?: string | null) =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null
