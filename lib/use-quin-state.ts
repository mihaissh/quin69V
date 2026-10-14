'use client'

import useSWR from 'swr'
import type { WatchProgressItem } from './quin-types'

export interface ChatReplaySettings {
  showTimestamp: boolean
  chatWidth: number
  fontFamily: string
  messageFontSize: number
  chatOnLeft: boolean
  userChatDelay: number
  filterWords: string[]
  cinemaGlow: boolean
}

export const DEFAULT_CHAT_SETTINGS: ChatReplaySettings = {
  showTimestamp: true,
  chatWidth: 360,
  fontFamily: 'var(--font-sans)',
  messageFontSize: 13,
  chatOnLeft: false,
  userChatDelay: 0,
  filterWords: [],
  cinemaGlow: true,
}

let inMemoryChatSettings: ChatReplaySettings = { ...DEFAULT_CHAT_SETTINGS }
let inMemoryWatchHistory: WatchProgressItem[] = []

export function useChatSettings() {
  const { data, mutate } = useSWR<ChatReplaySettings>(
    'quin-chat-settings',
    () => inMemoryChatSettings,
    {
      fallbackData: inMemoryChatSettings,
      revalidateOnFocus: false,
    }
  )

  const updateSettings = (patch: Partial<ChatReplaySettings>) => {
    inMemoryChatSettings = { ...inMemoryChatSettings, ...patch }
    mutate(inMemoryChatSettings, false)
  }

  const resetSettings = () => {
    inMemoryChatSettings = { ...DEFAULT_CHAT_SETTINGS }
    mutate(inMemoryChatSettings, false)
  }

  return {
    settings: data ?? DEFAULT_CHAT_SETTINGS,
    updateSettings,
    resetSettings,
  }
}

export function useWatchProgress() {
  const { data, mutate } = useSWR<WatchProgressItem[]>(
    'quin-watch-progress',
    () => inMemoryWatchHistory,
    {
      fallbackData: inMemoryWatchHistory,
      revalidateOnFocus: false,
    }
  )

  const saveProgress = (item: WatchProgressItem) => {
    if (item.timestamp < 5) return
    const filtered = inMemoryWatchHistory.filter(
      (x) => x.episodeId !== item.episodeId
    )
    inMemoryWatchHistory = [item, ...filtered].slice(0, 8)
    mutate(inMemoryWatchHistory, false)
  }

  const getEpisodeProgress = (episodeId: number): number => {
    const found = (data ?? inMemoryWatchHistory).find(
      (x) => x.episodeId === episodeId
    )
    return found ? found.timestamp : 0
  }

  const removeProgress = (episodeId: number) => {
    inMemoryWatchHistory = inMemoryWatchHistory.filter(
      (x) => x.episodeId !== episodeId
    )
    mutate(inMemoryWatchHistory, false)
  }

  return {
    history: data ?? [],
    saveProgress,
    getEpisodeProgress,
    removeProgress,
  }
}
