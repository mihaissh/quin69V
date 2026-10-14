import { NextRequest, NextResponse } from 'next/server'
import { ARCHIVE_API_BASE, QUIN_SLUG } from '@/lib/quin-utils'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ vodId: string }> }
) {
  const { vodId } = await context.params
  const { searchParams } = request.nextUrl
  const cursor = searchParams.get('cursor')
  const offset = searchParams.get('content_offset_seconds')

  const upstreamParams = new URLSearchParams()
  if (cursor) {
    upstreamParams.set('cursor', cursor)
  } else {
    upstreamParams.set(
      'content_offset_seconds',
      String(Math.max(0, Math.floor(Number(offset) || 0)))
    )
  }

  const url = `${ARCHIVE_API_BASE}/${QUIN_SLUG}/vods/${encodeURIComponent(vodId)}/comments?${upstreamParams.toString()}`

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { success: false, data: { comments: [], cursor: null } },
        { status: res.status }
      )
    }

    const json = await res.json()
    return NextResponse.json(json, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, data: { comments: [], cursor: null } },
      { status: 502 }
    )
  }
}
