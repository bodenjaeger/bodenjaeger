import { NextRequest, NextResponse } from 'next/server'
import { pruefeServicegebiet } from '@/lib/servicegebiet'
import { strassenVorschlaege } from '@/lib/verlegeservice/adresse'

/**
 * Straßenvorschläge innerhalb einer PLZ.
 * GET /api/verlegeservice/adresse?plz=41844&q=haupt → { vorschlaege: [{ strasse, plz, ort }] }
 */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const plz = request.nextUrl.searchParams.get('plz')?.trim() ?? ''
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const gebiet = pruefeServicegebiet(plz)
  if (!gebiet) return NextResponse.json({ vorschlaege: [] })
  const vorschlaege = await strassenVorschlaege(q, gebiet.plz, gebiet.ort)
  return NextResponse.json({ vorschlaege }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } })
}
