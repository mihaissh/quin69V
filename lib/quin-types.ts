export interface QuinGameEpisode {
  id: number
  vod_id: number
  start: number
  duration: number
  end: number
  video_provider: 'youtube' | 'twitch' | string
  video_id: string
  thumbnail_url: string | null
  game_id: string
  game_name: string
  title: string
  chapter_image: string
  created_at: string
  updated_at?: string
}

export interface QuinLibraryGame {
  game_id: string
  game_name: string
  chapter_image: string
  count: string | number
  last_played: string
}

export interface QuinChapter {
  id: number
  name: string
  image: string
  start: number
  duration: number
  end: number
}

export interface QuinVodSummary {
  id: number
  platform_vod_id: string
  platform: 'twitch' | 'kick' | string
  title: string
  duration: number
  platform_stream_id?: string
  created_at: string
  is_live: boolean
  started_at?: string
  updated_at?: string
  thumbnail_url?: string | null
  chapters: QuinChapter[]
  games: QuinGameEpisode[]
}

export interface QuinVodDetail extends QuinVodSummary {
  prev: QuinVodSummary[]
  next: QuinVodSummary[]
}

export interface QuinChatFragment {
  text: string
  emote: {
    emoteID: string
  } | null
  emoticon?: {
    emoticon_id: string
  } | null
}

export interface QuinUserBadge {
  id?: string
  _id?: string
  setID: string
  version: string
  url?: string
  badgeVersionId?: string
}

export interface QuinChatComment {
  id: string
  vod_id: number
  display_name: string
  content_offset_seconds: number
  user_color: string
  created_at: string
  message: QuinChatFragment[]
  user_badges: QuinUserBadge[]
}

export interface QuinEmoteItem {
  id: string
  code: string
  name: string
  width?: number
  height?: number
  flags?: number
  provider: 'FFZ' | 'BTTV' | '7TV' | 'Twitch'
}

export interface QuinBadgeVersion {
  id: string
  image_url_1x: string
  image_url_2x: string
  image_url_4x: string
  title?: string
}

export interface QuinBadgeSet {
  set_id: string
  versions: QuinBadgeVersion[]
}

export interface QuinVodBundleResponse {
  vod: QuinVodDetail
  emotes: QuinEmoteItem[]
  badges: {
    channel: QuinBadgeSet[]
    global: QuinBadgeSet[]
  }
  initialComments?: QuinChatComment[]
  initialCursor?: string | null
}

export interface QuinOverviewData {
  liveVod: QuinVodSummary | null
  recentVods: QuinVodSummary[]
  recentEpisodes: QuinGameEpisode[]
  topGames: QuinLibraryGame[]
  recentGames: QuinLibraryGame[]
  stats: {
    totalEpisodes: number
    totalGames: number
    latestVodId: number
    isLive: boolean
  }
}

export interface WatchProgressItem {
  episodeId: number
  vodId: number
  title: string
  gameName: string
  thumbnailUrl: string | null
  chapterImage: string
  timestamp: number
  duration: number
  updatedAt: number
}
