import { NextRequest, NextResponse } from 'next/server'
import { getQuinVodBundleServer } from '@/lib/quin-server'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ vodId: string }> }
) {
  const { vodId } = await context.params
  const bundle = await getQuinVodBundleServer(vodId)

  if (!bundle) {
    return NextResponse.json(
      { error: 'VOD not found or upstream archive unavailable' },
      { status: 404 }
    )
  }

  return NextResponse.json(bundle, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=1800',
    },
  })
}
