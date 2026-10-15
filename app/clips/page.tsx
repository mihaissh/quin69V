import { Suspense } from 'react'
import { getQuinClips, type ClipRange } from '@/lib/twitch'
import { ClipsExplorer } from '@/components/quin/clips-explorer'
import { PageTransition } from '@/components/quin/transitions'

export const metadata = {
  title: 'Clips',
  description: "The best Twitch clips from Quin69's streams.",
}

const RANGES = new Set(['24h', '7d', '30d', 'all'])

export default async function ClipsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const sp = await searchParams
  const range = (RANGES.has(sp.range ?? '') ? sp.range : '7d') as ClipRange
  const initial = await getQuinClips(range)

  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <PageTransition>
        <ClipsExplorer key={range} range={range} initial={initial} />
      </PageTransition>
    </Suspense>
  )
}
