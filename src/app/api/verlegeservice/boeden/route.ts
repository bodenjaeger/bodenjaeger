import { NextRequest, NextResponse } from 'next/server'
import { BODENARTEN, type BodenartKey } from '@/lib/verlegeservice/montage'
import { beliebteBoeden, sucheBoeden } from '@/lib/verlegeservice/shop'

/**
 * Böden aus dem Shop für das Verlegeservice-Formular.
 *
 * GET /api/verlegeservice/boeden?q=baja            → Suche über alle Bodenarten
 * GET /api/verlegeservice/boeden?art=klick&q=eiche → Suche in einer Bodenart
 * GET /api/verlegeservice/boeden?art=klick         → beliebteste Böden der Bodenart
 */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const artRoh = request.nextUrl.searchParams.get('art') ?? ''
  const art = artRoh in BODENARTEN ? (artRoh as BodenartKey) : undefined

  try {
    const boeden = q.length >= 2 ? await sucheBoeden(q, art) : art ? await beliebteBoeden(art) : []
    return NextResponse.json(
      { boeden },
      { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' } },
    )
  } catch (e) {
    console.error('[api/verlegeservice/boeden]', e)
    return NextResponse.json({ boeden: [] }, { status: 502 })
  }
}
