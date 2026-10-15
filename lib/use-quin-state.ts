'use client'

import { useCallback, useSyncExternalStore } from 'react'
import type { WatchProgressItem } from './quin-types'

/*
  Tiny persisted stores. State lives in memory, is mirrored to localStorage
  (when available) and is read through useSyncExternalStore, so the server
  render and hydration always see the defaults and the saved values appear
  right after mount without a hydration mismatch.
*/

function createStore<T>(key: string, initial: T, writeDelayMs = 0) {
  let state = initial
  let loaded = false
  let writeTimer: ReturnType<typeof setTimeout> | null = null
  const listeners = new Set<() => void>()

  const load = () => {
    if (loaded || typeof window === 'undefined') return
    loaded = true
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) state = JSON.parse(raw) as T
    } catch {
      // storage blocked or corrupt — keep defaults
    }
  }

  const flush = () => {
    writeTimer = null
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore quota / privacy mode
    }
  }

  const persist = () => {
    if (typeof window === 'undefined') return
    if (writeDelayMs === 0) return flush()
    if (writeTimer) return
    writeTimer = setTimeout(flush, writeDelayMs)
  }

  if (typeof window !== 'undefined' && writeDelayMs > 0) {
    window.addEventListener('pagehide', () => {
      if (writeTimer) {
        clearTimeout(writeTimer)
        flush()
      }
    })
  }

  return {
    subscribe(listener: () => void) {
      load()
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get() {
      load()
      return state
    },
    getServer() {
      return initial
    },
    set(next: T) {
      state = next
      persist()
      listeners.forEach((l) => l())
    },
  }
}

/* ---------------- Chat settings ---------------- */

export type VideoQuality = 'hd2160' | 'hd1440' | 'hd1080' | 'hd720' | 'large' | 'auto'

export interface ChatReplaySettings {
  showTimestamp: boolean
  chatWidth: number
  messageFontSize: number
  chatOnLeft: boolean
  userChatDelay: number
  filterWords: string[]
  /** YouTube quality hint passed as `vq` (YouTube falls back if unavailable) */
  videoQuality: VideoQuality
}

export const DEFAULT_CHAT_SETTINGS: ChatReplaySettings = {
  showTimestamp: true,
  chatWidth: 340,
  messageFontSize: 13,
  chatOnLeft: false,
  userChatDelay: 0,
  filterWords: [],
  videoQuality: 'hd1080',
}

const settingsStore = createStore<ChatReplaySettings>(
  'quin.chat-settings',
  DEFAULT_CHAT_SETTINGS
)

export function useChatSettings() {
  const stored = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.get,
    settingsStore.getServer
  )
  const settings = { ...DEFAULT_CHAT_SETTINGS, ...stored }

  const updateSettings = useCallback((patch: Partial<ChatReplaySettings>) => {
    settingsStore.set({ ...settingsStore.get(), ...patch })
  }, [])

  const resetSettings = useCallback(() => {
    settingsStore.set({ ...DEFAULT_CHAT_SETTINGS })
  }, [])

  return { settings, updateSettings, resetSettings }
}

/* ---------------- Watch progress ---------------- */

const EMPTY: WatchProgressItem[] = []
const progressStore = createStore<WatchProgressItem[]>(
  'quin.watch-progress',
  EMPTY,
  4000
)

export function getSavedProgress(episodeId: number): number {
  return progressStore.get().find((x) => x.episodeId === episodeId)?.timestamp ?? 0
}

export function useWatchProgress() {
  const history = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.get,
    progressStore.getServer
  )

  const saveProgress = useCallback((item: WatchProgressItem) => {
    if (item.timestamp < 5) return
    const rest = progressStore.get().filter((x) => x.episodeId !== item.episodeId)
    progressStore.set([item, ...rest].slice(0, 12))
  }, [])

  const getEpisodeProgress = useCallback(
    (episodeId: number) =>
      history.find((x) => x.episodeId === episodeId)?.timestamp ?? 0,
    [history]
  )

  const removeProgress = useCallback((episodeId: number) => {
    progressStore.set(progressStore.get().filter((x) => x.episodeId !== episodeId))
  }, [])

  return { history, saveProgress, getEpisodeProgress, removeProgress }
}
