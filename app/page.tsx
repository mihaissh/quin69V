import { Suspense } from 'react'
import { getQuinOverviewServer } from '@/lib/quin-server'
import { HomeView } from '@/components/quin/broadcast-hub'
import { PageTransition } from '@/components/quin/transitions'

export default async function HomePage() {
  const overview = await getQuinOverviewServer()

  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <PageTransition>
        <HomeView initialOverview={overview} />
      </PageTransition>
    </Suspense>
  )
}
