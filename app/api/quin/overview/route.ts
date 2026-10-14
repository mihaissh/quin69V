import { NextResponse } from 'next/server'
import { getQuinOverviewServer } from '@/lib/quin-server'

export async function GET() {
  const data = await getQuinOverviewServer()
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
