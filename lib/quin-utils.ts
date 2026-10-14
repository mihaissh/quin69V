export const QUIN_CHANNEL = 'Quin69'
export const QUIN_SLUG = 'quin69'
export const QUIN_TWITCH_ID = '56649026'
export const ARCHIVE_API_BASE = 'https://archive.overpowered.tv/api/v1'

export const QUIN_SOCIALS = [
  {
    name: 'Twitch',
    handle: 'twitch.tv/quin69',
    url: 'https://twitch.tv/quin69',
    badge: 'LIVE STREAM',
  },
  {
    name: 'YouTube',
    handle: 'Quin69 VODs & Highlights',
    url: 'https://www.youtube.com/channel/UCGKQFbHWBL9SqYXH41ZMTkw',
    badge: 'VODS',
  },
  {
    name: 'Discord',
    handle: 'discord.gg/rats',
    url: 'https://discord.gg/rats',
    badge: 'THE RATS',
  },
  {
    name: 'Reddit',
    handle: 'r/quin69',
    url: 'https://reddit.com/r/quin69',
    badge: 'SUBREDDIT',
  },
  {
    name: 'X / Twitter',
    handle: '@Quin69',
    url: 'https://twitter.com/Quin69',
    badge: 'UPDATES',
  },
] as const

export function formatDuration(secondsInput: number | string | undefined | null): string {
  const totalSeconds = Math.max(0, Math.floor(Number(secondsInput) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const mm = minutes < 10 ? `0${minutes}` : `${minutes}`
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`
  }
  return `${mm}:${ss}`
}

export function formatHumanDuration(secondsInput: number | string | undefined | null): string {
  const totalSeconds = Math.max(0, Math.floor(Number(secondsInput) || 0))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function formatTimestampParam(secondsInput: number): string {
  const total = Math.max(0, Math.floor(secondsInput))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  let out = ''
  if (h > 0) out += `${h}h`
  if (m > 0 || h > 0) out += `${m}m`
  out += `${s}s`
  return out
}

export function parseTimestampParam(param: string | null | undefined): number | null {
  if (!param) return null
  const trimmed = param.trim()
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10)
  }
  const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i
  const match = trimmed.match(regex)
  if (!match) return null
  const h = parseInt(match[1] || '0', 10)
  const m = parseInt(match[2] || '0', 10)
  const s = parseInt(match[3] || '0', 10)
  const total = h * 3600 + m * 60 + s
  return total > 0 ? total : null
}

export function formatBoxArtUrl(
  templateUrl?: string | null,
  width = 400,
  height = 530
): string {
  if (!templateUrl) {
    return 'https://static-cdn.jtvnw.net/ttv-static/404_boxart.jpg'
  }
  return templateUrl
    .replace('{width}', String(width))
    .replace('{height}', String(height))
}

export function normalizeUserColor(color?: string | null): string {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return '#a78bfa'
  }
  let r = parseInt(color.slice(1, 3), 16)
  let g = parseInt(color.slice(3, 5), 16)
  let b = parseInt(color.slice(5, 7), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  if (luminance < 95) {
    const boost = (95 - luminance) / 95
    r = Math.round(r + (255 - r) * boost)
    g = Math.round(g + (255 - g) * boost)
    b = Math.round(b + (255 - b) * boost)
  }
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function formatDateShort(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return ''
  }
}

export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return formatDateShort(isoString)
  } catch {
    return ''
  }
}

export function getEmoteUrl(
  id: string,
  provider: 'FFZ' | 'BTTV' | '7TV' | 'Twitch',
  scale: 1 | 2 | 4 = 1
): string {
  switch (provider) {
    case 'FFZ':
      return `https://cdn.frankerfacez.com/emote/${id}/${scale}`
    case 'BTTV':
      return `https://cdn.betterttv.net/emote/${id}/${scale === 4 ? 3 : scale}x`
    case '7TV':
      return `https://cdn.7tv.app/emote/${id}/${scale}x.webp`
    case 'Twitch':
    default:
      return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/${scale === 4 ? '3.0' : `${scale}.0`}`
  }
}

export function getEmoteSrcSet(
  id: string,
  provider: 'FFZ' | 'BTTV' | '7TV' | 'Twitch'
): string {
  switch (provider) {
    case 'FFZ':
      return `https://cdn.frankerfacez.com/emote/${id}/1 1x, https://cdn.frankerfacez.com/emote/${id}/2 2x, https://cdn.frankerfacez.com/emote/${id}/4 4x`
    case 'BTTV':
      return `https://cdn.betterttv.net/emote/${id}/1x 1x, https://cdn.betterttv.net/emote/${id}/2x 2x, https://cdn.betterttv.net/emote/${id}/3x 3x`
    case '7TV':
      return `https://cdn.7tv.app/emote/${id}/1x.webp 1x, https://cdn.7tv.app/emote/${id}/2x.webp 2x, https://cdn.7tv.app/emote/${id}/3x.webp 3x, https://cdn.7tv.app/emote/${id}/4x.webp 4x`
    case 'Twitch':
    default:
      return `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/1.0 1x, https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0 2x, https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0 4x`
  }
}
