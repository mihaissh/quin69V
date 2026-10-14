import { NextRequest, NextResponse } from 'next/server'
import { getQuinGamesServer } from '@/lib/quin-server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = await getQuinGamesServer(params)
  if (!result) {
    return NextResponse.json(
      { success: false, data: [], meta: { page: 1, limit: 20, total: 0 } },
      { status: 502 }
    )
  }

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
    },
  })
}
