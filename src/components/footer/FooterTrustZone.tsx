import Image from 'next/image'
import { CreditCard, MapPin, Store, Truck, type LucideIcon } from 'lucide-react'
import BadgeGrid from './BadgeGrid'
import StarRating from './StarRating'
import {
  PAYMENT_BADGES,
  SHIPPING_BADGES,
  TRUST_ZONE_TEXTE,
  TRUSTED_SHOPS_BEWERTUNG,
} from '@/lib/footer-nav'

const BLOCK_TITLE =
  'mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-white'

/**
 * Blocküberschrift mit vorangestelltem Lucide-Icon. Das Icon ist eine Stufe
 * größer als die Versalien daneben (16px zu 12px), sonst wirkt es gequetscht.
 */
function BlockTitle({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <h3 className={BLOCK_TITLE}>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-white" />
      {children}
    </h3>
  )
}

/**
 * Eigene horizontale Zone unter den Spalten.
 *
 * Der Footer ist durchgehend `bg-dark` — der frühere hellere Untergrund
 * (`bg-mid`) ist entfallen. Abgesetzt wird die Zone stattdessen nur noch über
 * eine dezente Trennlinie, wie sie auch die Bottom-Bar nutzt.
 *
 * Der Trusted-Shops-Block zeigt Note und Sterne (Designvorlage
 * „Footer_2026", Stand 23.09.2026). Die Zahl kommt statisch aus
 * TRUSTED_SHOPS_BEWERTUNG — siehe Warnhinweis dort. Das Floating-Widget
 * (components/TrustedShops.tsx) bleibt davon unberührt.
 */
export default function FooterTrustZone() {
  const { note, maximum } = TRUSTED_SHOPS_BEWERTUNG
  // de-DE: Komma als Dezimaltrennzeichen, immer eine Nachkommastelle
  // (4,0 statt 4 — sonst wirkt eine glatte Note wie ein abgeschnittener Wert).
  const noteFormatiert = note.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return (
    <div className="w-full bg-dark">
      <div className="content-container">
        <div className="grid gap-8 border-t border-white/10 py-8 md:grid-cols-2 lg:grid-cols-12">
          {/* 1 — Trusted Shops */}
          <div className="lg:col-span-2">
            <h3 className={BLOCK_TITLE}>Geprüfter Shop</h3>
            <div
              className="flex items-start gap-3"
              role="img"
              aria-label={`Trusted Shops Käuferschutz — Bewertung ${noteFormatiert} von ${maximum}`}
            >
              {/* Das Trustmark ist ein dunkel umringtes Rundsiegel und würde auf
                  `bg-dark` seine Außenkante verlieren. Es sitzt deshalb — wie die
                  Zahlungslogos — auf Weiß, hier als Kreis statt als Kachel. */}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
                <Image
                  src="/images/trusted-shops/Trustmark-RGB.png"
                  alt=""
                  width={1250}
                  height={1250}
                  className="h-9 w-9 object-contain"
                />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none text-white">{noteFormatiert}</p>
                <StarRating note={note} maximum={maximum} className="mt-1.5" />
                <p className="mt-1.5 text-[13px] leading-5 text-ash">
                  {TRUST_ZONE_TEXTE.trustedShops.titel}
                  <br />
                  {TRUST_ZONE_TEXTE.trustedShops.text}
                </p>
              </div>
            </div>
          </div>

          {/* 2 — Sichere Zahlung */}
          <div className="lg:col-span-4">
            <BlockTitle icon={CreditCard}>{TRUST_ZONE_TEXTE.zahlung.titel}</BlockTitle>
            <BadgeGrid badges={PAYMENT_BADGES} />
          </div>

          {/* 3 — Schnelle Lieferung */}
          <div className="lg:col-span-3">
            <BlockTitle icon={Truck}>{TRUST_ZONE_TEXTE.lieferung.titel}</BlockTitle>
            <BadgeGrid badges={SHIPPING_BADGES} />
            <p className="mt-2 text-[13px] leading-5 text-ash">
              {TRUST_ZONE_TEXTE.lieferung.zusatz}
            </p>
          </div>

          {/* 4 — Fachmarkt vor Ort */}
          <div className="lg:col-span-3">
            <BlockTitle icon={Store}>{TRUST_ZONE_TEXTE.fachmarkt.titel}</BlockTitle>
            <div className="flex items-start gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-white" />
              <p className="text-[15px] leading-6 text-ash">
                {TRUST_ZONE_TEXTE.fachmarkt.text}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
