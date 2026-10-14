import { Suspense } from 'react'
import {
  getQuinOverviewServer,
  getQuinVodBundleServer,
} from '@/lib/quin-server'
import { BroadcastHub } from '@/components/quin/broadcast-hub'

export default async function HomePage() {
  const overview = await getQuinOverviewServer()
  const latestVodId =
    overview.recentEpisodes[0]?.vod_id ?? overview.stats.latestVodId ?? 780
  const initialVodBundle = await getQuinVodBundleServer(latestVodId)

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <BroadcastHub
        initialOverview={overview}
        initialVodBundle={initialVodBundle}
      />
    </Suspense>
  )
}
