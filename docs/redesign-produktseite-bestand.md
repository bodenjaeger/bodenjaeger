# Bestandsaufnahme Produktdetailseite – Grundlage für das Redesign

Stand: 26.10.2026, Branch `feature/black-weeks-2026` (Produktseite identisch mit `main`, nur `src/lib/promo.ts` weicht minimal ab, siehe 2.2).
Nur gelesen, nichts geändert. Der Bildentwurf lag beim Erstellen nicht vor. Der Abgleich in Schritt 3 stützt sich deshalb auf die Elementliste aus dem Auftrag.

---

## 1. Aktuelle Produktseite

### 1.1 Beteiligte Dateien

| Rolle | Datei | Inhalt |
|---|---|---|
| Route (Server) | `src/app/products/[slug]/page.tsx` | `ProductPage`: lädt Produkt, Zusatzprodukte, WC-Beschreibung; JSON-LD; `generateStaticParams`, `generateMetadata`, `revalidate = 30` |
| Altlast | `src/app/products/[slug]/page-old.tsx` | nicht geroutet, toter Code |
| Orchestrator (Client) | `src/components/product/ProductPageContent.tsx` | State, Mengen- und Preisberechnung, Layout; enthält inline `ProductTabs`, `SimpleProductLayout` (Zubehör), `handleOrderSample` |
| Titel/Features/Set | `src/components/product/ProductInfo.tsx` | H1, Art.-Nr., max. 3 Vorteile, bindet `SetAngebot` (≥ md) und `SetAngebotMobile` (< md) ein |
| Set-Box Desktop | `src/components/product/SetAngebot.tsx` | Set-Positionen, Gesamt €/m², %-Badge, Auswahl-Modal Dämmung/Sockelleiste; exportiert Typ `SparpaketAnzeige` |
| Set-Box Mobil | `src/components/product/SetAngebotMobile.tsx` | wie oben, kompakter, Modal als Bottom-Sheet |
| Stepper | `src/components/product/QuantitySelector.tsx` | Pakete ↔ m², Verschnitt-Info |
| Gesamtsumme + Warenkorb | `src/components/product/TotalPrice.tsx` | Gesamtsumme, Aktion, „Du sparst“, Warenkorb-Payload, Angebot-Button, Lieferzeit |
| Galerie | `src/components/product/ImageGallery.tsx` | Hauptbild, Pfeile, 3 Thumbnails, Badges |
| Zubehör | `src/components/product/ZubehoerSlider.tsx` | Kategorien + horizontaler Slider, Warenkorb pro Karte |
| Zahlungsarten | `src/components/product/ZahlungsIcons.tsx` | Logos aus `PAYMENT_BADGES` (`src/lib/footer-nav.ts`) |
| Mengenlogik | `src/lib/setCalculations.ts` | `calculateSetQuantities`, `calculatePackages`, `calculateSparpaketQuantities` |
| Sparpaket-Konfig | `src/content/klebevinyl-sparpaket.ts` | `KLEBEVINYL_SPARPAKET` (Mindestmenge 5, Bestandteile, Verbrauch/m², Produkt-IDs) |
| Aktion | `src/lib/promo.ts` | `calculateProductAktion` („Jedes 7. Paket gratis“, seit 21.10. beendet) |
| Muster | `src/lib/sampleUtils.ts`, API `src/app/api/products/samples` | Musterprodukt `muster-<slug>` |
| Warenkorb | `src/contexts/CartContext.tsx` | `addSetToCart`, `addToCart`, `addSampleToCart`, `SetBundle`, `CartItem` |
| Warenkorb-Neuberechnung | `src/components/cart/CartDrawer.tsx` | `handleSetQuantityChange` (Set-Mengen im Drawer) |
| Analytics | `src/lib/analytics/track.ts`, `mapItem.ts` | `view_item`, `add_to_cart` |
| Hinweis-Modal | `src/hooks/useAlert.ts`, `src/components/AlertModal.tsx` | Rückmeldungen zur Musterbestellung |
| SEO | `src/lib/schema.ts`, `src/lib/seo.ts`, `src/lib/product-description.ts` | Product- und Breadcrumb-JSON-LD, Meta |
| Global | `src/app/layout.tsx` → `Roomvo.tsx`, `TrustedShops.tsx` | Roomvo-Skript und Trustbadge auf allen Seiten |
| CSS | `src/app/globals.css` (`.bj-specs-table`) | Tabellen-Styling „Weitere Artikeldetails“ |

### 1.2 Datenquellen

Kein GraphQL, kein ACF im Frontend. Alles läuft über REST mit Basic Auth.

1. **Jäger-API** `GET /wp-json/jaeger/v1/products` über `wooCommerceClient.getProduct(slug)` (`src/lib/woocommerce.ts`). Liefert `StoreApiProduct` mit den Plugin-Feldern auf Root-Ebene:
   - Preis: `price` (Set-Preis Boden, Zahl in €), `regular_price`, `sale_price`, `uvp`, `show_uvp`, `on_sale`, `discount_percent`
   - Paket: `paketinhalt`, `einheit`, `einheit_short`, `verpackungsart`, `verpackungsart_short`, `verschnitt` (nur durchgereicht, wird nicht angewendet), `verrechnung`
   - Set: `setangebot_titel`, `setangebot_einzelpreis`, `setangebot_gesamtpreis`, `setangebot_ersparnis_euro`, `setangebot_ersparnis_prozent`, `daemmung_id`, `sockelleisten_id`, `daemmung_option_ids`, `sockelleisten_option_ids`
   - Texte: `short_description` (daraus die Vorteile), `artikelbeschreibung` (Fließtext), `text_produktuebersicht` + `show_…`
   - Badges: `show_aktion`, `aktion`, `aktion_button_style`, `aktion_text_color`, `show_angebotspreis_hinweis`, `angebotspreis_hinweis` (+ Stil)
   - Lieferzeit: `lieferzeit`, `show_lieferzeit`
   - Zubehör: 7 Felder `option_products_*` (kommagetrennte ID-Strings)
   - Sonstiges: `images[]`, `categories[]`, `sku`, `name`, `slug`; laut Typ auch `average_rating`, `rating_count` (Backend-Test 11/2025: `"0"`/`0`, im Frontend nicht verwendet)
2. **WooCommerce REST v3** `GET /wp-json/wc/v3/products/{id}?_fields=description,meta_data` über `getProductDetails()`. Liefert `description` (HTML mit `<table>` bzw. `bj-specs`, Basis für „Weitere Artikeldetails“) und `rank_math_description` (nur Meta). Überschreibt `product.description`.
3. **Zusatzprodukte** gesammelt per `getProductsByIds()` (Standard-Dämmung/-Sockelleiste, Optionen, bei Klebe-Vinyl die Sparpaket-IDs). Läuft serverseitig.
4. **Clientseitig nachgeladen:**
   - Zubehör: `POST /api/products/by-ids` je aktiver Zubehör-Kategorie
   - Muster: `GET /api/products/samples?slug=muster-<slug>` beim Klick
5. **Statisch im Code:** Service-Zeilen (Telefon `02433938884`, Einlagerung 12 Monate, Wunschtermin, Lieferung ab 999 €), Verschnitt-Infotext, Zahlungs-Logos, Sparpaket-Konfiguration.

### 1.3 Reihenfolge heute (Bodenprodukte)

Layout: `grid grid-cols-1 lg:grid-cols-[55%_45%]`. Zweispaltig erst ab `lg` (1024 px).

**Desktop (≥ 1024 px)**

| Linke Spalte | Rechte Spalte |
|---|---|
| 1. Galerie (Badges -%, Aktion, Angebotshinweis; Pfeile nur bei Hover; max. 3 Thumbnails) | 1. H1 Produktname |
| 2. Button „Kostenloses Muster bestellen“ (nur Bodenkategorien) | 2. Art.-Nr. |
| 3. Service-Zeilen: Beratung (Tel.), Einlagerung, Wunschtermin, Lieferung ab 999 € | 3. Vorteile (max. 3, rote Haken) |
| | 4. Set-Box („Dein Set-Angebot“/Backend-Titel/„Sparpaket“): Boden, Dämmung, Sockelleiste, ggf. Sparpaket-Zeilen; Zeile „Gesamt“ mit Streichpreis €/m², Set-Preis €/m², -%-Badge |
| | 5. Graue Box: Stepper Pakete / m² (Info-Icon Verschnitt) → „Gesamtsumme (inkl. MwSt.)“ → ggf. Aktionszeile → „Du sparst X € (Y %)“ → Erfolgsmeldung → Buttons „Individuelles Angebot anfragen“ / „In den Warenkorb“ → Lieferzeit (wenn `show_lieferzeit`) |
| | 6. Zahlungs-Logos |

Darunter in voller Breite: 7. Zubehör-Bereich (`#zubehoer-section`), 8. Toggle-Buttons „Artikelbeschreibung“ / „Weitere Artikeldetails“.

**Mobil (< 1024 px)**, einspaltig:
Galerie → Muster-Button → H1 → Art.-Nr. → Vorteile → Set-Box (< 768 px `SetAngebotMobile`, 768–1023 px die Desktop-Variante) → Stepper/Gesamtsumme/Buttons/Lieferzeit → Zahlungs-Logos → Service-Zeilen → Zubehör → Beschreibung/Details.

**Zubehör-Layout** (`zubehoer`, `sockelleisten`, `daemmung`): `SimpleProductLayout` in `ProductPageContent.tsx` mit eigenem Stepper, eigener Preisberechnung und `addToCart` statt `addSetToCart`. Es gibt keine Set-Box und keinen Zubehör-Slider. Tabs kommen dort nicht vor, nur „Produktdetails“ mit `product.description`.

---

## 2. Berechnungslogik (nur gelesen)

> 🔒 = muss beim Umbau **unverändert** bleiben (Logik, Rundung, Payload). Nur die Darstellung darf sich ändern.

### 2.1 Stepper m² ↔ Pakete – `QuantitySelector.tsx`

- Interner State: `sqm` (Zahl), `sqmInputValue`, `packagesInputValue` (Strings). Die Komponente ist **unkontrolliert**: Der Parent bekommt Änderungen nur über `onQuantityChange(packages, sqm)` und setzt `wantedM2`. Den Wert zurückschreiben kann er nicht.
- 🔒 `ceilPackages(m2) = max(1, ceil((m2 − 1e-9) / paketinhalt))`: FP-sicheres Aufrunden.
- Pakete +/−: `newSqm = pakete × paketinhalt`, Minimum 1 Paket.
- m² +/−: Schritt = `paketinhalt`, Minimum `paketinhalt`. Pakete per `ceilPackages`.
- m² frei eingeben: `sqm = Eingabe`, Pakete = `ceilPackages(Eingabe)`. Beim Verlassen des Feldes werden Werte unter `paketinhalt` auf 1 Paket gesetzt, sonst auf 2 Nachkommastellen formatiert.
- Pakete eingeben: ganze Zahl > 0. Beim Verlassen werden leer oder < 1 zu 1.
- Startwert: `initialPackages` (Klebe-Vinyl mit Sparpaket: `KLEBEVINYL_SPARPAKET.mindestPakete` = 5, sonst 1). Unter 5 kann man trotzdem gehen, das Sparpaket wird dann inaktiv.
- Zweites Feld wird ausgeblendet, wenn `einheit_short` `-`/leer ist oder `paketinhalt === 1` und beide Labels gleich sind.
- Labels: `verpackungsart` (Fallback „Paket(e)“), `einheit` (Fallback „Quadratmeter“).
- Der Verschnitt wird **nicht** aufgeschlagen, es gibt nur einen Infotext.

### 2.2 Mengen – `setCalculations.ts` → `calculateSetQuantities()` (aufgerufen in `ProductPageContent` `quantities`-useMemo)

- 🔒 Boden: `calculateFloorQuantity` → `packages = ceil(wantedM2 / paketinhalt)`, `actualM2 = packages × paketinhalt`.
- 🔒 Dämmung: Basis `floor.actualM2`. `isFree = (verrechnung ?? max(0, preis − standardpreis)) === 0`. Kostenlos: `max(1, floor(m²/VE))`, mit Aufpreis: `ceil`.
- 🔒 Sockelleiste: `lfm = floor.actualM2 × 1.0`, gleiche Rundungsregel wie die Dämmung.
- 🔒 Klebe-Vinyl-Sparpaket: `calculateSparpaketQuantities(floorPackages, floorM2, products)`. Aktiv ab 5 Bodenpaketen. Bedarf = `m² × verbrauchProM2`. `combineGebinde`: große Gebinde, höchstens 1 kleines für den Rest. Alle Gebinde kommen als Position mit, auch mit 0, damit der Drawer später umrechnen kann. Der Zahnspachtel wird nicht angezeigt, kommt aber in den Warenkorb.
- Aktion (`promo.ts` → `calculateProductAktion`): `floor(pakete / 7)` Gratispakete × `price × paketinhalt`. Seit 21.10.2026 21:30 ist die Aktion beendet und liefert 0. Auf diesem Branch greift das Enddatum jetzt auch im Preview-Modus.

### 2.3 Preise – `ProductPageContent.tsx` `prices`-useMemo (Single Source of Truth)

| Wert | Formel |
|---|---|
| Boden Set-Preis €/m² | `product.price` |
| Boden Streichpreis €/m² | `uvp \|\| regular_price \|\| price` |
| Dämmung Set-Preis/Einheit | `verrechnung ?? max(0, preis − standardpreis)` (0 = kostenlos) |
| Dämmung Streichpreis/Einheit | voller Preis des gewählten Produkts |
| Sockelleiste | analog zur Dämmung |
| Sparpaket Streichpreis €/m² | Σ `verbrauchProM2 × Preis großes Gebinde` (nur wenn aktiv) |
| `comparisonPriceTotal` | `floor.actualM2 × (Boden-Streich + Dämm-Streich + Sockel-Streich + Sparpaket-Streich)` |
| `totalDisplayPrice` | `floor.actualM2 × price + insulation.actualM2 × dämmVerrechnung + baseboard.actualLfm × sockelVerrechnung` |
| `savings` | `comparisonPriceTotal − totalDisplayPrice` (nur > 0) |
| `savingsPercent` | `setangebot_ersparnis_prozent` aus dem Backend; bei Sparpaket `max(Backend, berechnet)` |

Davon abgeleitet in den Kind-Komponenten:
- 🔒 **„Gesamt“ in der Set-Box** (`SetAngebot`/`SetAngebotMobile`): statisch pro m². `basePrice + dämmSet + sockelSet` gegen den Streichpreis `regularPrice + dämmRegular + sockelRegular + sparpaketRegular`. Ändert sich bei der Produktauswahl, **nicht** bei der Menge.
- 🔒 **„Gesamtsumme“** (`TotalPrice`): `endpreis = totalDisplayPrice − aktion.discount`. Hängt von der Menge ab. Die beiden Anzeigen müssen getrennt bleiben (CLAUDE.md).
- „Du sparst X € (Y %)“: `savings`, `Math.round(savingsPercent)`.
- Rabatt-Badge in der Set-Box: `-{round(savingsPercent)}%`.
- Rabatt-Badge auf der Galerie: nur bei `product.on_sale`. Wert `rabattProzent` (nur Sparpaket) sonst `setangebot_ersparnis_prozent || discount_percent`.
- Auswahl-Modal: Aufpreis = `optionPrice − regularPricePerUnit` des **aktuell gewählten** Produkts. Bezugsbasis ist also nicht das Standardprodukt, siehe offene Fragen.
- `ProductInfo` berechnet `gesamtVergleichspreisProM2` (`setangebot_einzelpreis || …`) und gibt ihn an `SetAngebot` weiter. Dort wird er **nicht benutzt** (toter Prop).

### 2.4 Set-Auswahl (Dämmung/Sockelleiste)

- Optionen kommen serverseitig aus `daemmung_option_ids`/`sockelleisten_option_ids`. Das Standardprodukt wird vorne eingefügt, falls es fehlt.
- Der Auswahl-State liegt **doppelt** in `SetAngebot` und `SetAngebotMobile`. Beide sind immer gemountet (nur per CSS ausgeblendet) und melden per `useEffect` an `handleProductSelection` (🔒 `useCallback`, gegen die Race Condition).
- „Vorhanden“ wird über den Namen erkannt: `daemmungName !== 'Trittschalldämmung'`. Bei fehlendem Produkt ist das der Fallback-Name. Die Initialauswahl wird ebenfalls per Namensvergleich gefunden.

### 2.5 Warenkorb-Übergabe

**Set (Bodenprodukte)** – `TotalPrice.handleAddToCart()` → `CartContext.addSetToCart(setBundle)`:

```ts
SetBundle = {
  floor:      { product, packages, actualM2, setPricePerUnit: price, regularPricePerUnit: price },
  insulation: { product, packages, actualM2, setPricePerUnit: isFree ? 0 : verrechnung,
                regularPricePerUnit: voller Preis, standardProduct: product /* = Boden! */ } | null,
  baseboard:  { product, packages, actualLfm, setPricePerUnit, regularPricePerUnit, standardProduct } | null,
  sparpaket?: [{ typ, product, packages, amount, regularPricePerUnit: Preis großes Gebinde }]
}
```

- 🔒 `addSetToCart` erzeugt die `setId` und legt **eine flache `CartItem`-Zeile je Bestandteil** an: `isSetItem`, `setItemType` (`floor`/`insulation`/`baseboard`/`primer`/…), `setPricePerUnit`, `regularPricePerUnit`, `actualM2` (bei Sockelleiste lfm, bei Sparpaket kg/Stk.), `quantity = packages`. Sparpaket-Positionen haben immer `setPricePerUnit: 0`.
- 🔒 Zeilensumme im Warenkorb = `setPricePerUnit × actualM2` (`CartContext.totalPrice`, `promo.getLineTotal`, Checkout).
- 🔒 Die Preise pro Einheit für Dämmung und Sockelleiste rechnet `TotalPrice` **nochmals selbst** aus (Kopie der Logik aus `ProductPageContent`). Bei Änderungen müssen beide Stellen synchron bleiben.
- Danach: GA4 `add_to_cart` (Paketpreise), `openCartDrawer()`, nach 300 ms Scroll zu `#zubehoer-section`, 3 s Erfolgsmeldung.
- Im Drawer rechnet `CartDrawer.handleSetQuantityChange` die Set-Mengen mit eigener floor/ceil-Logik neu. Die Logik ist dupliziert und hat kein `max(1, …)` für kostenlose Positionen.

**Zubehör-Slider:** `addToCart(product, 1)` + GA4. Der Drawer öffnet sich dabei nicht, es gibt 2 s grünes Feedback.
**Muster:** `addSampleToCart(sampleProduct)` (Duplikatprüfung pro ID), Modal mit Hinweis zur Musterfracht ab dem 4. Muster.
**Zubehör-Layout:** `addToCart(product, packages)`.

---

## 3. Abgleich mit dem Entwurf

| # | Element | existiert heute? | Datenquelle | Komponente/Datei | Bemerkung |
|---|---|---|---|---|---|
| 1 | Breadcrumb | teilweise | `categories[0]`, `name` | `page.tsx` (`buildBreadcrumbSchema`) | Nur als JSON-LD, **nicht sichtbar**. Die Daten für eine sichtbare Breadcrumb sind vorhanden. |
| 2a | Galerie: Hauptbild + Pfeile | ja | `images[]` | `ImageGallery.tsx` | Pfeile nur bei Hover (`opacity-0 group-hover`), auf Touch-Geräten praktisch unsichtbar |
| 2b | Vollbild/Lightbox | nein | – | – | Funktion fehlt; Daten (Bilder) wären da |
| 2c | Thumbnails | teilweise | `images[]` | `ImageGallery.tsx` | Nur die ersten 3 (`slice(0, 3)`) |
| 2d | Video | nein | kein Feld | – | entfällt |
| 3a | Kategorie-Label | nein (Daten da) | `categories[0].name` | – | Wird nur im JSON-LD genutzt |
| 3b | Titel | ja | `name` | `ProductInfo.tsx` (H1) | |
| 3c | Untertitel | nein | evtl. `text_produktuebersicht` (+`show_…`) | – | Heute nur Fallback für die Vorteile. Ob als Untertitel gedacht: offen |
| – | Art.-Nr. | ja | `sku` | `ProductInfo.tsx` | Im Entwurf nicht gelistet, bleibt sie? |
| 4 | Sternebewertung + Anzahl | nein | `average_rating`/`rating_count` im Typ, Backend lieferte 0 | – | Keine Produktbewertungen im Shop; Trusted Shops nur als globales Shop-Badge. Entfällt |
| 5 | Vorteile-Liste (Häkchen, oben) | ja | `short_description` (`<li>` oder Zeilen), Fallback `text_produktuebersicht`/`lieferzeit`/`paketinhalt` | `ProductInfo.tsx` | max. 3 Einträge |
| 6 | „Kostenlose Muster bestellen“ | ja | Musterprodukt `muster-<slug>` via API | `ProductPageContent.handleOrderSample` | Text heute „Kostenloses Muster bestellen“; nur Bodenkategorien |
| 7 | „Boden virtuell verlegen“ | unklar | Roomvo-Skript global (`Roomvo.tsx`) | `layout.tsx` | Im Code kein Button und kein `roomvo`-Element. Ob das Roomvo-Skript selbst einen Button einfügt, lässt sich im Code nicht prüfen. Klären |
| 8 | PDF-Links (Datenblatt, Verlege-, Pflegeanleitung) | nein | kein Feld | – | entfällt (ggf. im WC-`description`-HTML enthalten, nicht geprüft) |
| 9 | Set-Box mit Rabatt-Badge, Positionen mit Bild, Streichpreis, Set-Preis | ja | s. 2.3 | `SetAngebot.tsx` / `SetAngebotMobile.tsx` | Inkl. Wechsel-Modal und Sparpaket-Zeilen; Badge sitzt heute in der „Gesamt“-Zeile |
| 10 | Statt-Preis, Set-Preis pro m² | ja | s. 2.3 | „Gesamt“-Zeile der Set-Box | 🔒 statisch pro m² |
| 11 | Doppelter Stepper m² / Pakete | ja | `paketinhalt`, `einheit`, `verpackungsart` | `QuantitySelector.tsx` | 🔒 Rundung; Verschnitt-Info-Popover gehört dazu |
| 12 | Gesamtpreis inkl. MwSt. + „Du sparst“ | ja | s. 2.3 | `TotalPrice.tsx` | Plus Aktionszeile (zurzeit inaktiv) |
| 13 | Warenkorb-Button | ja | – | `TotalPrice.tsx` | Daneben „Individuelles Angebot anfragen“ (→ `/kontakt`), im Entwurf nicht gelistet |
| 14a | Info: Lieferzeit | ja | `lieferzeit`, `show_lieferzeit` | `TotalPrice.tsx` | Fallback „3-7 Arbeitstage“ + „oder im Markt abholen“ |
| 14b | Info: Einlagerung | ja (statisch) | Code | `ProductPageContent.tsx` (Service-Zeilen) | „bis zu 12 Monate“ |
| 14c | Info: Persönliche Beratung (Tel.) | ja (statisch) | Code | dto. | Nummer hartcodiert, nicht als `tel:`-Link |
| – | Info: Wunschtermin, Lieferung ab 999 € | ja (statisch) | Code | dto. | Im Entwurf nicht gelistet, bleiben sie? |
| 15 | Zahlungsarten-Logos | ja | `PAYMENT_BADGES` | `ZahlungsIcons.tsx` | Gleiche Quelle wie der Footer |
| 16 | Zubehör mit Tabs + Karten-Slider + Warenkorb | ja (andere Tabs) | `option_products_*` (ID-Strings) → `/api/products/by-ids` | `ZubehoerSlider.tsx` | Heute 7 Kategorien: Zubehör für Sockelleisten, Werkzeug, Kleber, Montagekleber & Silikon, Untergrundvorbereitung, Schienen & Profile, Reinigung & Pflege. Aus dem Entwurf gibt es **Untergrundvorbereitung** und **Reinigung & Pflege**. „Sockelleisten“ ≈ „Zubehör für Sockelleisten“; „Verklebung“ ≈ Kleber + Montagekleber? **„Mengenrechner & Zubehör“ gibt es nicht**. Nur Kategorien mit IDs werden gezeigt |
| 17 | Tab-/Anker-Leiste (Beschreibung, Technische Daten, Verlegung & Pflege, Bewertungen, FAQ) | teilweise | – | `ProductTabs` (inline) | Heute 2 Toggle-Buttons: „Artikelbeschreibung“, „Weitere Artikeldetails“. Verlegung & Pflege, Bewertungen und FAQ ohne Daten |
| 18a | Produktbeschreibung Fließtext | ja | `artikelbeschreibung` (HTML bereinigt) | `ProductTabs` | |
| 18b | Box „Vorteile auf einen Blick“ | teilweise | `short_description` | – | Gleiche Quelle wie #5; heute nur oben (max. 3) |
| 19 | Trust-Leiste (Muster, Lieferung, Fachberatung, Einlagerung, Verlegeservice) | teilweise | statisch | Service-Zeilen | Lieferung, Beratung und Einlagerung gibt es als Texte. Muster nur als Button. **Verlegeservice** gibt es als Seite (`/fachmarkt-hueckelhoven/service/verlegeservice`), aber nicht auf der Produktseite. Statische Texte, kein Backend |
| 20 | Technische Daten als Tabelle(n) | ja | WC-REST `description` (HTML-Tabelle) | `ProductTabs` → `.bj-specs-table` | Fertiges HTML, nicht strukturiert. Mehrere Tabellen/Spalten nur, wenn das HTML sie hergibt |
| 21 | Verlegung & Pflege: PDFs, Video | nein | – | – | entfällt |
| 22 | Box „Wichtige Hinweise“ | nein | – | – | entfällt (nächstliegend: Verschnitt-Infotext am Stepper) |
| 23 | Bewertungen | nein | – | – | entfällt (s. #4) |
| 24 | FAQ | nein (produktbezogen) | – | `shared/Accordion.tsx` existiert | Keine Produkt-FAQ-Daten; entfällt |
| 25a | Mobil: Akkordeons statt Tabs | teilweise | – | `ProductTabs` | Die heutigen Toggle-Buttons verhalten sich schon wie ein Akkordeon (einer offen, wieder schließbar). `shared/Accordion.tsx` ist wiederverwendbar (erwartet `frage`/`antwort`) |
| 25b | Sticky-Elemente | kaum | – | `ZubehoerSlider` (Infobox `lg:sticky`), Modal-Kopf/-Fuß | Keine Sticky-Kaufleiste |

---

## 4. Offene Fragen und Risiken

### Fragen zum Umfang

1. **Entwurf fehlt**: Bitte das Bild nachreichen, damit Reihenfolge und Elemente genau abgeglichen werden können.
2. **„Boden virtuell verlegen“**: Fügt Roomvo auf Produktseiten selbst einen Button ein, oder muss ein eigener Trigger her (Roomvo erwartet dafür üblicherweise ein Element mit Produktkennung)? Ohne Klärung nicht umsetzbar.
3. **Zubehör-Tabs**: Sollen die 7 bestehenden Backend-Kategorien bleiben, oder werden sie auf die 5 Entwurfs-Tabs gemappt (z. B. Kleber + Montagekleber → „Verklebung“)? „Mengenrechner & Zubehör“ hat keine Daten.
4. **Elemente, die heute da sind, im Entwurf aber nicht gelistet**: Art.-Nr., „Individuelles Angebot anfragen“, Wunschtermin, „Lieferung ab 999 €“, Verschnitt-Info, Aktions-/Angebots-Badges auf dem Bild. Laut Memory werden UI-Elemente nicht ohne ausdrückliche Anweisung entfernt, deshalb bitte je Element entscheiden.
5. **Untertitel**: `text_produktuebersicht` verwenden oder weglassen?
6. **„Vorteile auf einen Blick“**: dieselben `short_description`-Punkte zweimal zeigen (oben 3, unten alle)?
7. **Zubehör-Produktseiten** (`SimpleProductLayout`): ebenfalls umbauen oder nur Böden?

### Risiken (Logik eng an das Layout gekoppelt)

1. **Doppelt gemountete Set-Box**: Desktop- und Mobil-Variante laufen gleichzeitig, jede mit eigenem Auswahl-State. Wer im Redesign Breakpoints oder Mount-Bedingungen ändert, kann die alte Race Condition (Mobil überschreibt die Desktop-Auswahl) zurückholen. Empfehlung: Den Auswahl-State in den Parent ziehen und eine Box responsiv rendern. Das ist eine Logikänderung und braucht Freigabe.
2. **Unkontrollierter Stepper**: `QuantitySelector` hält die Menge selbst. Ein zweiter Stepper (z. B. in einer Sticky-Leiste) würde auseinanderlaufen. Dafür müsste er auf kontrolliert umgebaut werden.
3. **Doppelte Preislogik**: Die Einheitspreise für Dämmung und Sockelleiste stehen in `ProductPageContent` und noch einmal in `TotalPrice.handleAddToCart`. Beim Verschieben von Komponenten dürfen sie nicht auseinanderdriften.
4. **Scroll-Anker `#zubehoer-section`**: Nach dem Warenkorb-Klick wird dorthin gescrollt. Die ID muss erhalten bleiben.
5. **Gefundener Rundungsfehler (bestehend, nicht vom Redesign verursacht)**: `calculatePackages()` in `setCalculations.ts` rundet **ohne** FP-Toleranz (`Math.ceil(m2 / paketinhalt)`), während `QuantitySelector` eine Toleranz nutzt. Per Node nachgerechnet: Bei `paketinhalt = 1.92` und 9 Paketen ist `9 × 1.92 / 1.92 = 9.000000000000002`. Der Stepper zeigt also **9 Pakete**, Preis und Warenkorb rechnen mit **10**. Das betrifft u. a. 1.92 (9, 13, 18 …), 1.79 (7, 14 …), 1.45 (7, 14 …), 2.6 (13 …). Bitte an einem echten Produkt mit solchem `paketinhalt` prüfen. Behebung getrennt vom Redesign und nur nach Freigabe.
6. **Galerie-Badge vs. Set-Badge**: Beide -%-Badges haben unterschiedliche Bedingungen (`on_sale` vs. Ersparnis > 0). Wenn der Entwurf nur ein Badge vorsieht, muss die Quelle festgelegt werden.
7. **Modal-Aufpreis**: Im Auswahl-Modal wird der Aufpreis gegen den Preis der **aktuell gewählten** Option gerechnet, nicht gegen das Standardprodukt. Nach einem Wechsel stimmen die angezeigten Differenzen nicht mehr mit der `verrechnung` überein. Das besteht schon heute und wird beim Neugestalten des Modals sichtbar.
8. **Technische Daten nur als HTML**: Eine neue Tabellenoptik geht nur per CSS auf `.bj-specs-table`, Struktur gibt es keine. Mehrspaltige oder gruppierte Tabellen hängen davon ab, wie die Tabellen in WooCommerce gepflegt sind.
9. **`standardProduct: product`** im Set-Payload zeigt auf den Boden statt auf die Standard-Dämmung. Wird im Warenkorb offenbar nicht ausgewertet, also ohne Folgen, aber nicht anfassen.
10. **Toter Code** (`page-old.tsx`, Prop `gesamtVergleichspreisProM2`, `prepareSetForCart`, `SetCartItem`): beim Umbau nicht versehentlich wiederbeleben.
11. **Branch**: Die Bestandsaufnahme ist auf `feature/black-weeks-2026` entstanden (laut Memory „nicht mergen“). Der Umbau sollte auf einem eigenen Branch von `main` laufen.
