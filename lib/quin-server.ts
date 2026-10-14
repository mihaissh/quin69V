import {
  QuinBadgeSet,
  QuinEmoteItem,
  QuinGameEpisode,
  QuinLibraryGame,
  QuinOverviewData,
  QuinVodBundleResponse,
  QuinVodDetail,
  QuinVodSummary,
} from './quin-types'
import { ARCHIVE_API_BASE, QUIN_SLUG, QUIN_TWITCH_ID } from './quin-utils'

async function fetchJsonWithTimeout<T>(
  url: string,
  revalidateSeconds = 120,
  timeoutMs = 7000
): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      next: { revalidate: revalidateSeconds },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function getQuinOverviewServer(): Promise<QuinOverviewData> {
  const [vodsRes, recentEpisodesRes, topGamesRes, recentGamesRes] =
    await Promise.all([
      fetchJsonWithTimeout<{
        success: boolean
        data: QuinVodSummary[]
        meta?: { total: number }
      }>(`${ARCHIVE_API_BASE}/${QUIN_SLUG}/vods?limit=6&page=1`, 60),
      fetchJsonWithTimeout<{
        success: boolean
        data: QuinGameEpisode[]
        meta?: { total: number }
      }>(
        `${ARCHIVE_API_BASE}/${QUIN_SLUG}/games?limit=12&page=1&sort=created_at&order=desc`,
        90
      ),
      fetchJsonWithTimeout<{
        success: boolean
        data: QuinLibraryGame[]
        meta?: { total: number }
      }>(
        `${ARCHIVE_API_BASE}/${QUIN_SLUG}/games/library?limit=12&page=1&sort=count&order=desc`,
        300
      ),
      fetchJsonWithTimeout<{
        success: boolean
        data: QuinLibraryGame[]
        meta?: { total: number }
      }>(
        `${ARCHIVE_API_BASE}/${QUIN_SLUG}/games/library?limit=8&page=1&sort=recent&order=desc`,
        180
      ),
    ])

  const recentVods = vodsRes?.data ?? []
  const liveVod = recentVods.find((v) => v.is_live) ?? null
  const recentEpisodes = recentEpisodesRes?.data ?? []
  const topGames = topGamesRes?.data ?? []
  const recentGames = recentGamesRes?.data ?? []

  return {
    liveVod,
    recentVods,
    recentEpisodes,
    topGames,
    recentGames,
    stats: {
      totalEpisodes: recentEpisodesRes?.meta?.total ?? 922,
      totalGames: topGamesRes?.meta?.total ?? 92,
      latestVodId:
        recentEpisodes[0]?.vod_id ?? recentVods[0]?.id ?? 780,
      isLive: Boolean(liveVod),
    },
  }
}

export async function getQuinGamesServer(params: Record<string, string>) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.set(k, v)
    }
  }
  if (!search.has('limit')) search.set('limit', '20')
  if (!search.has('page')) search.set('page', '1')
  if (!search.has('sort')) search.set('sort', 'created_at')
  if (!search.has('order')) search.set('order', 'desc')

  const url = `${ARCHIVE_API_BASE}/${QUIN_SLUG}/games?${search.toString()}`
  return fetchJsonWithTimeout<{
    success: boolean
    data: QuinGameEpisode[]
    meta: { page: number; limit: number; total: number }
  }>(url, 120)
}

export async function getQuinLibraryServer(params: Record<string, string>) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.set(k, v)
    }
  }
  if (!search.has('limit')) search.set('limit', '20')
  if (!search.has('page')) search.set('page', '1')
  if (!search.has('sort')) search.set('sort', 'count')
  if (!search.has('order')) {
    search.set('order', search.get('sort') === 'game_name' ? 'asc' : 'desc')
  }

  const url = `${ARCHIVE_API_BASE}/${QUIN_SLUG}/games/library?${search.toString()}`
  return fetchJsonWithTimeout<{
    success: boolean
    data: QuinLibraryGame[]
    meta: { page: number; limit: number; total: number }
  }>(url, 300)
}

export async function getQuinVodBundleServer(
  vodId: string | number
): Promise<QuinVodBundleResponse | null> {
  const [vodRes, vodEmotesRes, badgesRes, bttvGlobal, bttvChannel, sevenTvGlobal, sevenTvUser, ffzRoom] =
    await Promise.all([
      fetchJsonWithTimeout<{ success: boolean; data: QuinVodDetail }>(
        `${ARCHIVE_API_BASE}/${QUIN_SLUG}/vods/${vodId}`,
        120
      ),
      fetchJsonWithTimeout<{
        success: boolean
        data: {
          ffz_emotes?: Array<{ id: string; code?: string; text?: string; name?: string; width?: number; height?: number }>
          bttv_emotes?: Array<{ id: string; code: string; width?: number; height?: number }>
          seventv_emotes?: Array<{ id: string; code?: string; name?: string; width?: number; height?: number; flags?: number }>
        }
      }>(`${ARCHIVE_API_BASE}/${QUIN_SLUG}/vods/${vodId}/emotes`, 600),
      fetchJsonWithTimeout<{
        success: boolean
        data: { channel?: QuinBadgeSet[]; global?: QuinBadgeSet[] }
      }>(`${ARCHIVE_API_BASE}/${QUIN_SLUG}/badges/twitch`, 3600),
      fetchJsonWithTimeout<Array<{ id: string; code: string; width?: number; height?: number }>>(
        'https://api.betterttv.net/3/cached/emotes/global',
        3600,
        4000
      ),
      fetchJsonWithTimeout<{
        channelEmotes?: Array<{ id: string; code: string; width?: number; height?: number }>
        sharedEmotes?: Array<{ id: string; code: string; width?: number; height?: number }>
      }>(
        `https://api.betterttv.net/3/cached/users/twitch/${QUIN_TWITCH_ID}`,
        3600,
        4000
      ),
      fetchJsonWithTimeout<{
        emotes?: Array<{ id: string; name: string; flags?: number }>
      }>('https://7tv.io/v3/emote-sets/global', 3600, 4000),
      fetchJsonWithTimeout<{
        emote_set?: {
          emotes?: Array<{ id: string; name: string; flags?: number }>
        }
      }>(`https://7tv.io/v3/users/twitch/${QUIN_TWITCH_ID}`, 3600, 4000),
      fetchJsonWithTimeout<{
        room?: { set?: number }
        sets?: Record<
          string,
          {
            emoticons?: Array<{
              id: number | string
              name: string
              width?: number
              height?: number
            }>
          }
        >
      }>(`https://api.frankerfacez.com/v1/room/id/${QUIN_TWITCH_ID}`, 3600, 4000),
    ])

  if (!vodRes?.success || !vodRes.data) {
    return null
  }

  const firstGameStart = vodRes.data.games?.[0]?.start ?? 0
  const initialCommentsRes = await fetchJsonWithTimeout<{
    success: boolean
    data: { comments?: any[]; cursor?: string | null }
  }>(
    `${ARCHIVE_API_BASE}/${QUIN_SLUG}/vods/${vodId}/comments?content_offset_seconds=${Math.max(0, Math.floor(firstGameStart))}`,
    600,
    4000
  )

  const emoteMap = new Map<string, QuinEmoteItem>()

  // 1. FFZ Emotes (from VOD archive + live room fallback)
  const ffzFromVod = vodEmotesRes?.data?.ffz_emotes ?? []
  for (const e of ffzFromVod) {
    const code = e.code || e.text || e.name || ''
    if (!code) continue
    emoteMap.set(code, {
      id: String(e.id),
      code,
      name: e.name || code,
      width: e.width,
      height: e.height,
      provider: 'FFZ',
    })
  }
  if (ffzFromVod.length === 0 && ffzRoom?.sets && ffzRoom.room?.set) {
    const roomEmotes = ffzRoom.sets[String(ffzRoom.room.set)]?.emoticons ?? []
    for (const e of roomEmotes) {
      emoteMap.set(e.name, {
        id: String(e.id),
        code: e.name,
        name: e.name,
        width: e.width,
        height: e.height,
        provider: 'FFZ',
      })
    }
  }

  // 2. BTTV Emotes (global + channel + VOD archive)
  const bttvList = [
    ...(bttvGlobal ?? []),
    ...(bttvChannel?.sharedEmotes ?? []),
    ...(bttvChannel?.channelEmotes ?? []),
    ...(vodEmotesRes?.data?.bttv_emotes ?? []),
  ]
  for (const e of bttvList) {
    if (!e?.code) continue
    emoteMap.set(e.code, {
      id: String(e.id),
      code: e.code,
      name: e.code,
      width: e.width,
      height: e.height,
      provider: 'BTTV',
    })
  }

  // 3. 7TV Emotes (global + channel + VOD archive)
  const sevenTvGlobalList = sevenTvGlobal?.emotes ?? []
  for (const e of sevenTvGlobalList) {
    if (!e?.name) continue
    emoteMap.set(e.name, {
      id: String(e.id),
      code: e.name,
      name: e.name,
      flags: e.flags,
      provider: '7TV',
    })
  }
  const sevenTvUserList = sevenTvUser?.emote_set?.emotes ?? []
  for (const e of sevenTvUserList) {
    if (!e?.name) continue
    emoteMap.set(e.name, {
      id: String(e.id),
      code: e.name,
      name: e.name,
      flags: e.flags,
      provider: '7TV',
    })
  }
  const sevenTvVodList = vodEmotesRes?.data?.seventv_emotes ?? []
  for (const e of sevenTvVodList) {
    const code = e.name || e.code || ''
    if (!code) continue
    emoteMap.set(code, {
      id: String(e.id),
      code,
      name: code,
      width: e.width,
      height: e.height,
      flags: e.flags,
      provider: '7TV',
    })
  }

  return {
    vod: vodRes.data,
    emotes: Array.from(emoteMap.values()),
    badges: {
      channel: badgesRes?.data?.channel ?? [],
      global: badgesRes?.data?.global ?? [],
    },
    initialComments: initialCommentsRes?.data?.comments ?? [],
    initialCursor: initialCommentsRes?.data?.cursor ?? null,
  }
}
