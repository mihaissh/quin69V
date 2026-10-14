import { Suspense } from 'react'
import { getQuinLibraryServer } from '@/lib/quin-server'
import { LibraryExplorer } from '@/components/quin/library-explorer'

export const metadata = {
  title: 'Game Library — QUIN69.GG Complete Game Archive',
  description:
    'Browse all 92+ games played by Quin69 sorted by episode count or recent streams.',
}

export default async function LibraryPage() {
  const libRes = await getQuinLibraryServer({
    limit: '20',
    page: '1',
    sort: 'count',
    order: 'desc',
  })

  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <LibraryExplorer
        initialGames={libRes?.data ?? []}
        initialTotal={libRes?.meta?.total ?? 92}
      />
    </Suspense>
  )
}
