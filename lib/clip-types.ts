// Shared between server (lib/twitch.ts) and the clips page

export interface TwitchClip {
  id: string
  url: string
  embed_url: string
  broadcaster_name: string
  creator_name: string
  video_id: string
  game_id: string
  title: string
  view_count: number
  created_at: string
  thumbnail_url: string
  duration: number
  vod_offset: number | null
}

export type ClipRange = '24h' | '7d' | '30d' | 'all'

export const CLIP_RANGES: { key: ClipRange; label: string }[] = [
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
]
