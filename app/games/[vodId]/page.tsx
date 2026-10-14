import { Suspense } from 'react'
import Link from 'next/link'
import { getQuinVodBundleServer } from '@/lib/quin-server'
import { VodTheaterWorkspace } from '@/components/quin/vod-theater-workspace'
import { SiteHeader } from '@/components/quin/site-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Tv } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vodId: string }>
}) {
  const { vodId } = await params
  const bundle = await getQuinVodBundleServer(vodId)
  const title = bundle?.vod?.games?.[0]?.title || bundle?.vod?.title || `VOD #${vodId}`
  return {
    title: `${title} — QUIN69.GG Theater & Chat Replay`,
    description: bundle?.vod?.title || `Watch Quin69 VOD #${vodId} with synchronized Twitch chat replay.`,
  }
}

export default async function VodPlayerPage({
  params,
}: {
  params: Promise<{ vodId: string }>
}) {
  const { vodId } = await params
  const bundle = await getQuinVodBundleServer(vodId)

  if (!bundle) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <SiteHeader />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <Tv className="size-10 text-primary" />
          <h1 className="text-xl font-bold">VOD #{vodId} Not Found</h1>
          <p className="max-w-md text-xs text-muted-foreground">
            This broadcast VOD could not be loaded or may still be processing in
            the Overpowered Archive.
          </p>
          <Link href="/games">
            <Button size="sm">
              <ArrowLeft data-icon="inline-start" />
              Browse All Episodes
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="h-dvh w-full bg-background" />}>
      <VodTheaterWorkspace bundle={bundle} />
    </Suspense>
  )
}
