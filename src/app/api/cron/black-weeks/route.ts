import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { PROMO_START, getPromoEnd } from '@/lib/black-weeks';

/**
 * Cache-Leerung zu Start und Ende der Black Weeks.
 *
 * Bannerleiste und Aktionskachel stehen im gerenderten HTML, das Vercel
 * zwischenspeichert. Damit sie um 00:00 Uhr ohne neuen Deploy erscheinen
 * (und nach dem Ende verschwinden), leert dieser Endpunkt den Cache aller
 * Seiten (`revalidatePath('/', 'layout')`).
 *
 * Aufruf durch Vercel Cron (vercel.json): täglich 23:01 UTC = 00:01 Uhr in
 * Berlin (Winterzeit) — eine Minute Puffer, damit ein minimal früher Lauf den
 * Start nicht verpasst. Geleert wird nur, wenn Start oder Ende in den letzten
 * 25 Stunden lag — an allen anderen Tagen passiert nichts. So funktioniert
 * derselbe Eintrag auf Hobby (nur täglich, Ausführung irgendwann in der
 * Stunde) wie auf Pro, und das Ende muss nicht im Cron-Plan stehen.
 *
 * Manuell (Fallback, leert sofort):
 *   curl -H "Authorization: Bearer $CRON_SECRET" "https://bodenjaeger.de/api/cron/black-weeks?force=1"
 *
 * Ohne gesetztes `CRON_SECRET` lehnt der Endpunkt jeden Aufruf ab.
 */

const WINDOW_MS = 25 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const force = request.nextUrl.searchParams.get('force') === '1';
  const boundaries = [new Date(PROMO_START), getPromoEnd()].filter((d): d is Date => d !== null);
  const due = boundaries.some((d) => d.getTime() <= now && now - d.getTime() <= WINDOW_MS);

  if (!force && !due) {
    return NextResponse.json({ revalidated: false, reason: 'Kein Start/Ende in den letzten 25 Stunden' });
  }

  revalidatePath('/', 'layout');
  console.info(`[black-weeks] Cache aller Seiten geleert (${force ? 'manuell' : 'Cron'})`);
  return NextResponse.json({ revalidated: true, at: new Date(now).toISOString() });
}
