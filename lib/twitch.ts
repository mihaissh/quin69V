import { QUIN_TWITCH_ID } from './quin-utils'

/*
  Twitch Helix API (official). Needs a free Twitch app:
  https://dev.twitch.tv/console/apps → "Register Your Application"
  then set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.local
*/

import type { ClipRange, TwitchClip } from './clip-types'
export type { ClipRange, TwitchClip } from './clip-types'
export { CLIP_RANGES } from './clip-types'

export function twitchConfigured() {
  return Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
}

let token: { value: string; expiresAt: number } | null = null

async function getAppToken(): Promise<string | null> {
  if (!twitchConfigured()) return null
  if (token && Date.now() < token.expiresAt - 60_000) return token.value
  const body = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID!,
    client_secret: process.env.TWITCH_CLIENT_SECRET!,
    grant_type: 'client_credentials',
  })
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    body,
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = (await res.json()) as { access_token: string; expires_in: number }
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return token.value
}

const DAY = 24 * 60 * 60 * 1000

export async function getQuinClips(
  range: ClipRange = '7d',
  after?: string | null
): Promise<{ clips: TwitchClip[]; cursor: string | null; configured: boolean }> {
  if (!twitchConfigured()) return { clips: [], cursor: null, configured: false }
  const access = await getAppToken()
  if (!access) return { clips: [], cursor: null, configured: true }

  const params = new URLSearchParams({ broadcaster_id: QUIN_TWITCH_ID, first: '24' })
  if (range !== 'all') {
    const days = range === '24h' ? 1 : range === '7d' ? 7 : 30
    // Round to the hour so the request (and its cache entry) is stable for a while
    const now = Math.floor(Date.now() / 3_600_000) * 3_600_000
    params.set('started_at', new Date(now - days * DAY).toISOString())
    params.set('ended_at', new Date(now + 3_600_000).toISOString())
  }
  if (after) params.set('after', after)

  try {
    const res = await fetch(`https://api.twitch.tv/helix/clips?${params}`, {
      headers: {
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${access}`,
      },
      next: { revalidate: 300 },
    })
    if (res.status === 401) token = null
    if (!res.ok) return { clips: [], cursor: null, configured: true }
    const json = (await res.json()) as { data: TwitchClip[]; pagination?: { cursor?: string } }
    return { clips: json.data ?? [], cursor: json.pagination?.cursor ?? null, configured: true }
  } catch {
    return { clips: [], cursor: null, configured: true }
  }
}
