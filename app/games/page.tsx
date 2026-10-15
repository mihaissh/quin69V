import { Suspense } from 'react'
import { getQuinGamesServer, getQuinLibraryServer } from '@/lib/quin-server'
import { EpisodesExplorer } from '@/components/quin/episodes-explorer'
import { PageTransition } from '@/components/quin/transitions'

export const metadata = {
  title: 'Episodes',
  description: 'Every Quin69 game episode, with Twitch chat replay.',
}

export default async function GamesPage() {
  const [gamesRes, topLibraryRes] = await Promise.all([
    getQuinGamesServer({ limit: '20', page: '1', sort: 'created_at', order: 'desc' }),
    getQuinLibraryServer({ limit: '12', page: '1', sort: 'count', order: 'desc' }),
  ])

  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <PageTransition>
      <EpisodesExplorer
        initialEpisodes={gamesRes?.data ?? []}
        initialTotal={gamesRes?.meta?.total ?? 922}
        topGames={topLibraryRes?.data ?? []}
      />
      </PageTransition>
    </Suspense>
  )
}
