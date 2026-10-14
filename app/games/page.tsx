import { Suspense } from 'react'
import { getQuinGamesServer, getQuinLibraryServer } from '@/lib/quin-server'
import { EpisodesExplorer } from '@/components/quin/episodes-explorer'

export const metadata = {
  title: 'All Episodes — QUIN69.GG VOD Archive & Chat Replay',
  description:
    'Browse and filter all 920+ Quin69 game episodes with synchronized Twitch chat replay.',
}

export default async function GamesPage() {
  const [gamesRes, topLibraryRes] = await Promise.all([
    getQuinGamesServer({ limit: '20', page: '1', sort: 'created_at', order: 'desc' }),
    getQuinLibraryServer({ limit: '10', page: '1', sort: 'count', order: 'desc' }),
  ])

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <EpisodesExplorer
        initialEpisodes={gamesRes?.data ?? []}
        initialTotal={gamesRes?.meta?.total ?? 922}
        topGames={topLibraryRes?.data ?? []}
      />
    </Suspense>
  )
}
