import { NextRequest, NextResponse } from 'next/server'
import { getQuinVodAssetsServer } from '@/lib/quin-server'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ vodId: string }> }
) {
  const { vodId } = await context.params
  const assets = await getQuinVodAssetsServer(vodId)
  return NextResponse.json(assets, {
    headers: {
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
