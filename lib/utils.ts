import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ref callback for <img data-fade>: marks the image loaded so CSS can fade it
 * in. Handles images that finished loading before React attached.
 */
export function fadeIn(img: HTMLImageElement | null) {
  if (!img) return
  const done = () => img.setAttribute('data-loaded', '')
  if (img.complete) done()
  else {
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
  }
}
