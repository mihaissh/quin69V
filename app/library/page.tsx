import { Suspense } from 'react'
import { getQuinLibraryServer } from '@/lib/quin-server'
import { LibraryExplorer } from '@/components/quin/library-explorer'
import { PageTransition } from '@/components/quin/transitions'

export const metadata = {
  title: 'Games',
  description: 'Every game Quin69 has played on stream, by episode count or last played.',
}

export default async function LibraryPage() {
  const libRes = await getQuinLibraryServer({
    limit: '24',
    page: '1',
    sort: 'count',
    order: 'desc',
  })

  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <PageTransition>
      <LibraryExplorer
        initialGames={libRes?.data ?? []}
        initialTotal={libRes?.meta?.total ?? 92}
      />
      </PageTransition>
    </Suspense>
  )
}
