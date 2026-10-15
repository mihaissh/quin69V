import { Suspense } from 'react'
import Link from 'next/link'
import { getQuinVodServer } from '@/lib/quin-server'
import { VodTheaterWorkspace } from '@/components/quin/vod-theater-workspace'
import { SiteHeader } from '@/components/quin/site-header'
import { PageTransition } from '@/components/quin/transitions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vodId: string }>
}) {
  const { vodId } = await params
  const vod = await getQuinVodServer(vodId) // same request as the page; Next dedupes it
  const title = vod?.games?.[0]?.title || vod?.title || `Stream #${vodId}`
  return {
    title,
    description: vod?.title || `Watch Quin69 stream #${vodId} with chat replay.`,
  }
}

export default async function VodPlayerPage({
  params,
}: {
  params: Promise<{ vodId: string }>
}) {
  const { vodId } = await params
  // Only the VOD is needed to render. Emotes, badges and chat load in the
  // browser right after, so clicking a stream opens it immediately.
  const vod = await getQuinVodServer(vodId)

  if (!vod) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <h1 className="font-display text-[28px] font-semibold tracking-wide">
            Couldn&apos;t find stream #{vodId}
          </h1>
          <p className="max-w-md text-muted-foreground">
            It may not exist, or the archive is still processing it.
          </p>
          <Link href="/games" className="mt-2 text-primary hover:underline">
            Browse all episodes
          </Link>
        </main>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="h-dvh" />}>
      <PageTransition>
        <VodTheaterWorkspace
          key={vod.id}
          bundle={{ vod, emotes: [], badges: { channel: [], global: [] } }}
        />
      </PageTransition>
    </Suspense>
  )
}
