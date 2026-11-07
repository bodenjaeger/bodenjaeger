import { NextRequest, NextResponse } from 'next/server'
import { BODENARTEN, type BodenartKey } from '@/lib/verlegeservice/montage'
import { preisklassen } from '@/lib/verlegeservice/shop'

/**
 * Preisklassen (€/m²) einer Bodenart aus den echten Shop-Preisen.
 * GET /api/verlegeservice/preisklassen?art=klick → { klassen: { guenstig: [a,b], … } | null }
 */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const art = request.nextUrl.searchParams.get('art') ?? ''
  if (!(art in BODENARTEN)) return NextResponse.json({ klassen: null }, { status: 400 })
  try {
    const klassen = await preisklassen(art as BodenartKey)
    return NextResponse.json({ klassen }, { headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=3600' } })
  } catch (e) {
    console.error('[api/verlegeservice/preisklassen]', e)
    return NextResponse.json({ klassen: null }, { status: 502 })
  }
}
