import { NextRequest, NextResponse } from 'next/server'
import { pruefeServicegebiet } from '@/lib/servicegebiet'
import { strassenSuche } from '@/lib/verlegeservice/adresse'

/**
 * Straßenvorschläge innerhalb einer PLZ.
 * GET /api/verlegeservice/adresse?plz=41844&q=haupt → { vorschlaege: [{ strasse, plz, ort }], verzeichnis }
 */
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const plz = request.nextUrl.searchParams.get('plz')?.trim() ?? ''
  const q = request.nextUrl.searchParams.get('q') ?? ''
  const gebiet = pruefeServicegebiet(plz)
  if (!gebiet) return NextResponse.json({ vorschlaege: [], verzeichnis: true })
  const ergebnis = await strassenSuche(q, gebiet.plz, gebiet.ort)
  return NextResponse.json(ergebnis, {
    headers: { 'Cache-Control': ergebnis.verzeichnis ? 'public, max-age=3600, s-maxage=86400' : 'no-store' },
  })
}
