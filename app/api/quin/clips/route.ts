import { NextRequest, NextResponse } from 'next/server'
import { getQuinClips, type ClipRange } from '@/lib/twitch'

const RANGES = new Set(['24h', '7d', '30d', 'all'])

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const range = (RANGES.has(sp.get('range') ?? '') ? sp.get('range') : '7d') as ClipRange
  const result = await getQuinClips(range, sp.get('after'))
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  })
}
