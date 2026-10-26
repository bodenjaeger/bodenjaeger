# Redesign Produktdetailseite (Böden) – Plan zur Freigabe

Stand: 26.10.2026, Branch `feature/produktseite-redesign` (von `main`, cea51e3).
Grundlage: `docs/redesign-produktseite-bestand.md` und der Entwurf `_diagnose/Anpassung_Produktseiten_2026.jpg`.
**Phase 1: bisher kein Code geändert.**

> Hinweis Branch: Beim Anlegen wurde automatisch `origin/main` als Upstream gesetzt. Vor dem ersten Push muss das gelöst werden (`git branch --unset-upstream` oder `git push -u origin feature/produktseite-redesign`), sonst zielt ein `git push` ohne Ziel auf `main`.

---

## 1. Vorab: zwei Befunde, die den Plan bestimmen

### 1.1 Roomvo bringt „Boden virtuell verlegen“ selbst mit, hängt aber an unserem Markup

Geprüft wurde das Skript `cdn.roomvo.com/static/scripts/b2b/bodenfachmarktjaegerde.js` (Kundenanpassung für Bodenjäger, 76 KB). Es enthält eine eigene Integration für unsere Produktseite:

- **Button:** Roomvo erzeugt selbst `<button id="detail-btn" class="roomvo-stimr">` mit dem Text **„Boden virtuell verlegen“** (`getStimrButtonText`) und einem Kamera-Icon. Die Optik kommt per Inline-Style: weiß, Rahmen `#2e2d32`, Radius 8 px, Poppins Bold, `margin-bottom: 8px`. Steht ein Produkt bei Roomvo nicht zur Verfügung, blendet Roomvo den Button per `visibility: hidden` aus.
- **Einfügeort:** direkt **vor** dem Element `button:has(img[alt='Musterbox'])`, also vor unserem Muster-Button, und zwar als Geschwister-Element im selben Container.
- **Produktkennung:** aus `h1 + div.text-sm.text-gray-600` per Regex `Art\.Nr\.\s*:\s*(\S+)`, also aus der Art.-Nr.-Zeile **direkt nach der H1**. Fallback ist der URL-Pfad.

**Folgerungen:**
- Kein eigenes Trigger-Element nötig, Roomvo liefert den Button. Er kann per CSS im Stil des Entwurfs gestaltet werden (rot umrandet, rote Schrift und rotes Icon). Wegen der Inline-Styles geht das nur mit `!important` auf `#detail-btn.roomvo-stimr` in `globals.css`.
- 🔒 **Muss beim Umbau erhalten bleiben**, sonst ist der Button weg oder zeigt das falsche Produkt:
  1. Auf die H1 folgt **unmittelbar** ein `div` mit den Klassen `text-sm text-gray-600` und dem Text `Art.Nr.: <sku>`. Das Kategorie-Label darf deshalb nur **vor** die H1.
  2. Der Muster-Button bleibt ein `<button>` mit `<img alt="Musterbox">`. Es gibt ihn nur **einmal** im DOM.
- **Reihenfolge laut Entwurf** (erst Muster, dann virtuell verlegen): Roomvo fügt seinen Button davor ein. Lösung ohne Logik: Der Container wird `flex flex-col`, der Muster-Button bekommt `order-first`.
- Ist das Produkt bei Roomvo nicht verfügbar, bleibt wegen `visibility: hidden` eine Lücke in Buttonhöhe. Das ist schon heute so und lässt sich per CSS kaschieren (`[style*="visibility: hidden"]` → `display: none`). Freigabe nötig.
- Prüfen lässt sich das nur im Browser, weil Roomvo erst clientseitig einfügt (Kontrolle mit `roomvo.debug()` in der Konsole).

### 1.2 `categories[0]` ist als Kategorie-Label und Breadcrumb ungeeignet

Die Jäger-API liefert die Kategorien **alphabetisch**. `categories[0]` ist deshalb oft eine Sammelkategorie:

| Produkt | `categories[0]` |
|---|---|
| Laminat Torgas Pine | **Kostenlose Bodenmuster bestellen** (`musterbox`) |
| Laminat Espresso Carpenter Oak | **Kostenlose Bodenmuster bestellen** |
| Parkett Leon Weiß | **Kostenlose Bodenmuster bestellen** |
| COREtec Yukon | **COREtec** |
| Klebe-Vinyl Fresh Oak Classic | Klebe-Vinyl ✓ |

Das betrifft schon heute die JSON-LD-Breadcrumb (`page.tsx`).
**Vorschlag** für Label und sichtbare Breadcrumb: Es wird die erste Kategorie aus der bestehenden Bodenliste genommen (`isFloorProduct`: `klebe-vinyl`, `rigid-vinyl`, `vinylboden`, `laminat`, `parkett`), die spezifischere vor `vinylboden`. Das ist eine neue Auswahlregel, also **Freigabe nötig**. Das JSON-LD bleibt laut Vorgabe unverändert; ob es dieselbe Regel bekommt, wäre ein eigener Schritt.
Der Entwurf zeigt zwei Kategorie-Ebenen (Vinylboden > Klebe-Vinyl). Die Daten haben keine Hierarchie, deshalb wird nur eine Ebene angezeigt.

---

## 2. Komponentenbaum

### Vorher (Bodenprodukte)

```
ProductPageContent
└─ grid lg:[55%_45%]
   ├─ links:  ImageGallery · Muster-Button · Service-Zeilen (hidden lg:block)
   └─ rechts: ProductInfo (H1, Art.-Nr., Vorteile, SetAngebot [hidden md:block] + SetAngebotMobile [md:hidden])
              · bg-ash-Box (QuantitySelector + TotalPrice) · ZahlungsIcons · Service-Zeilen (lg:hidden)
├─ #zubehoer-section → ZubehoerSlider
└─ ProductTabs (inline, 2 Toggle-Buttons)
```

### Nachher

```
ProductPageContent
├─ ProduktBreadcrumb (neu, nur Darstellung)
├─ grid  (Mobil 1 Spalte · lg 2 Spalten · xl 3 Spalten, s. Abschnitt 5)
│  ├─ [galerie]  ImageGallery (variante="neu")
│  ├─ [info]     ProductInfoKopf: Kategorie-Label → H1 → Art.-Nr. → Vorteile
│  │             → Button-Container (flex-col): Muster-Button (order-first) + Roomvo-Button (fügt Roomvo selbst ein)
│  ├─ [karte]    Karte: ProductSetAngebot (SetAngebot hidden md:block + SetAngebotMobile md:hidden)
│  │             → QuantitySelector → TotalPrice (inkl. Lieferzeit) → Service-Zeilen → ZahlungsIcons (variante="raster")
│  └─ [zubehoer] #zubehoer-section → ZubehoerSlider (Desktop: Tab-Leiste; Mobil: Akkordeon)
└─ ProduktDetails (ersetzt ProductTabs): Anker-Leiste (ab lg) · Abschnitt Beschreibung
   · Trust-Leiste · Abschnitt Technische Daten (Mobil: Akkordeons, standardmäßig zu)
```

**ProductInfo aufteilen:** Heute rendert `ProductInfo` Kopf und Set-Box zusammen. Für drei Spalten müssen sie getrennt werden.
Vorschlag: Beide Teile bleiben in `ProductInfo.tsx`, als zwei Exporte `ProductInfoKopf` und `ProductSetAngebot`. Die vorhandene Ableitung (`basePrice`, `regularPrice`, Namen, Bilder, VE, `setangebotTitel` usw.) wird **unverändert** in eine gemeinsame Funktion in derselben Datei verschoben. Beide bekommen dieselben Props wie heute `ProductInfo`.
`SetAngebot` und `SetAngebotMobile` bleiben beide gemountet, mit denselben Klassen `hidden md:block` / `md:hidden` und demselben `onProductSelection`. Kein State wird verschoben.

### Geänderte Dateien (geplant)

| Datei | Art der Änderung |
|---|---|
| `src/components/product/ProductPageContent.tsx` | Layout/JSX des Boden-Zweigs, Service-Zeilen in die Karte, `ProductTabs` → `ProduktDetails`. `prices`, `quantities`, `sparpaket*`, `handleProductSelection`, `handleOrderSample` und der Zubehör-Zweig (`SimpleProductLayout` usw.) bleiben unverändert |
| `src/components/product/ProductInfo.tsx` | Aufteilung in Kopf und Set-Box (s. o.), Kategorie-Label |
| `src/components/product/SetAngebot.tsx` | nur Optik: Badge oben rechts, Zeilenaufbau, „Gesamt“-Block. Modal unverändert |
| `src/components/product/SetAngebotMobile.tsx` | nur Optik, wie Desktop |
| `src/components/product/QuantitySelector.tsx` | nur JSX/Optik: Reihenfolge m² links / Paket(e) rechts, Stepper-Optik. Handler und Rundung unverändert |
| `src/components/product/TotalPrice.tsx` | nur JSX/Optik: Gesamtsumme-Zeile, Buttons untereinander, Lieferzeit als Icon-Zeile. `handleAddToCart` unverändert |
| `src/components/product/ImageGallery.tsx` | optionale Prop `variante` (Standard = heutiges Aussehen, damit das Zubehör-Layout gleich bleibt): Pfeile immer sichtbar, 4 Thumbnails, aktives Thumbnail `border-brand` |
| `src/components/product/ZahlungsIcons.tsx` | optionale Prop `variante="raster"` (Standard unverändert für das Zubehör-Layout) |
| `src/components/product/ZubehoerSlider.tsx` | nur Optik: Tab-Leiste mit roter Unterstreichung, Kartenaufbau, Pfeile. Mobil: Akkordeon-Kopf. Lade- und Warenkorb-Logik unverändert |
| `src/components/product/ProduktBreadcrumb.tsx` | neu |
| `src/components/product/ProduktDetails.tsx` | neu: Anker-Leiste, Abschnitte, Akkordeons, Trust-Leiste. Die HTML-Bereinigung von `artikelbeschreibung` wird **unverändert** aus `ProductTabs` übernommen |
| `src/app/globals.css` | `.bj-specs-table` neu gestaltet, Roomvo-Button-Override |

**Nicht angefasst:** `setCalculations.ts`, `promo.ts`, `CartContext.tsx`, `CartDrawer.tsx`, `page.tsx` (JSON-LD, Metadaten), `analytics/*`, Zubehör-Layout.

Nebenbefund: `ProductTabs` ist heute **innerhalb** von `ProductPageContent` definiert. Bei jedem Render (z. B. Stepper-Klick) wird es neu gemountet, und der Tab-Zustand springt zurück. Mit Akkordeons würden diese bei jeder Mengenänderung zuklappen. `ProduktDetails` wird deshalb eine eigene Datei. Das ändert das Verhalten nur insofern, als der Zustand erhalten bleibt.

---

## 3. Texte, die der Entwurf braucht, die es heute nicht gibt (Regel 3, werden NICHT eingebaut)

| Stelle im Entwurf | Text im Entwurf | Umsetzung |
|---|---|---|
| Set-Box, Untertitel | „Alles, was du für die Verlegung brauchst – im Set unschlagbar günstig“ | entfällt |
| Set-Box, Titel als Logo-Grafik „KlebeVinyl Sparpaket“ | Grafik | bestehender Titel als Text-Badge (`setangebot_titel` / „Sparpaket“ / „Dein Set-Angebot“) |
| „Gesamt“-Block | „statt“ vor dem Streichpreis | entfällt, nur durchgestrichener Preis |
| „Gesamt“-Block | „SET-PREIS“ | ✓ vorhanden: „Set-Preis“ (`UnifiedProductCard`, `SliderKartePreis`), per CSS in Großbuchstaben |
| Gesamtsumme | „Gesamtpreis (inkl. MwSt.)“ | bleibt „Gesamtsumme (inkl. MwSt.)“ |
| Du sparst | „Du sparst 51,08 €“ | bleibt „Du sparst X € (Y %)“ |
| Zubehör-Überschrift | „– Für ein perfektes Ergebnis“ | entfällt; Überschrift „Passendes Zubehör“ ist vorhanden |
| Anker-Leiste / Akkordeons | „Produktbeschreibung“, „Technische Daten“ | **gibt es nicht als UI-Text.** Vorhanden: „Artikelbeschreibung“, „Weitere Artikeldetails“. Du nennst die neuen Begriffe im Auftrag. Bitte bestätigen, dann gelten sie als freigegeben, sonst bleiben die alten |
| H2 Beschreibung | produktbezogene Überschrift | Es gibt kein Feld dafür. Vorschlag: Abschnittslabel als H2 (s. Zeile davor) |
| H2 Technische Daten | „Technische Daten“ | Das HTML bringt eine eigene `<h3>Artikeleigenschaften</h3>` mit. Vorschlag: nur Abschnittslabel, h3 aus dem HTML bleibt, oder h3 per CSS ausblenden |
| Trust-Leiste, Titel | „Kostenlose Muster“, „Schnelle Lieferung“, „Fachberatung“, „Einlagerung“, „Verlegeservice“ | vorhandene Titel aus `src/content/service.ts` bzw. `footer-nav.ts`: „3 Muster kostenfrei bestellen“, „Schnelle Lieferung“, „Persönliche Fachberatung“, „Kostenlose Einlagerung“, „Professioneller Verlegeservice“ (mit Links aus `SERVICE_LINKS`) |
| Trust-Leiste, Unterzeilen | „Bis zu 3 A3 Muster gratis“, „3-7 Werktage“, „Persönlich & kompetent“, „Bis zu 6 Monate möglich“, „Im Umkreis von 50 km“ | nur „Schnelle Lieferung“ bekommt die vorhandene Unterzeile „oder Abholung im Fachmarkt“ (`TRUST_ZONE_TEXTE`). Die anderen bleiben ohne Unterzeile, weil die vorhandenen `service.ts`-Texte ganze Sätze sind |
| Info-Zeile Beratung | „Persönliche Beratung: 02433 938884“ | bleibt „Persönliche Beratung unter 02433938884“; Nummer als `tel:`-Link (`STANDORT.telefonLink`) |

Entfällt laut Vorgabe: Sterne, Video-Thumbnail, Vollbild-Icon, PDF-Links, Tabs „Verlegung & Pflege“, „Bewertungen“, „Häufige Fragen“, Box „Vorteile auf einen Blick“, Spalte „Verlegung & Pflege“ / „Wichtige Hinweise“, Untertitel, Zubehör-Tab „Mengenrechner & Zubehör“.

**Bleibt, obwohl nicht im Entwurf (Regel 4):**
- Art.-Nr.
- „Individuelles Angebot anfragen“
- Wunschtermin, „Lieferung ab 999 €“
- Verschnitt-Info
- Badges auf dem Bild
- „Andere Dämmung/Sockelleiste >“
- **Zubehör-Infotexte**: „Hier findest du unsere Vorauswahl …“, „Die Anzahl der Produkte kannst du ganz einfach im Warenkorb anpassen.“, Button „Weiter zum Warenkorb“. Vorschlag: die Texte als eine Zeile unter der Überschrift, der Button rechts neben der Überschrift. **Bitte bestätigen.**

---

## 4. Farben, Schriften, Icons – Zuordnung und Abweichungen

| Element | Entwurf | Umsetzung (vorhandene Tokens) | Abweichung |
|---|---|---|---|
| Muster-Button | grün, weißes Icon | `bg-success` (#28a745), Icon `musterbox-weiss.png` | Grünton im Entwurf etwas dunkler |
| Virtuell verlegen | weiß, rot umrandet, rotes Icon | CSS-Override: `border`/`color` = `--color-primary`, SVG-Stroke rot | Icon ist das Kamera-Icon von Roomvo, nicht das Würfel-Icon aus dem Entwurf |
| Warenkorb-Button | dunkel, volle Breite | `bg-dark`, `warenkorb-weiss.png` | – |
| Angebot anfragen | (nicht im Entwurf) | Outline `border-dark text-dark`, volle Breite | – |
| Aktives Thumbnail, aktive Tabs/Anker | rot | `border-brand` | – |
| Kategorie-Label, Streichpreise, Info-Zeilen | grau | `text-mid` bzw. `text-gray-500/600` wie heute | – |
| Set-Preise je Zeile und großer Set-Preis | dunkel | `text-dark`, heute `text-brand` (rot) | **Änderung der Farbe laut Entwurf**, bitte bestätigen |
| -%-Badge, Set-Titel | rot | `bg-brand` | – |
| Du sparst | grün | `text-success` (wie heute) | – |
| Karte, Zubehör-Fläche, Trust-Leiste | weiß bzw. sehr hellgrau, feiner Rahmen | `bg-white border border-ash rounded-xl`, Flächen `bg-pale` | Schatten nur `shadow-sm` |
| Seitenhintergrund | weiß | heute `bg-gray-50`, Vorschlag `bg-white` | bitte bestätigen |
| Info-Zeilen-Icons | dunkle Outline-Icons | vorhandene `*-schieferschwarz.png` | Motive leicht anders |
| Trust-Leisten-Icons | rote Outline-Icons | `lucide-react` in `text-brand`, gleiche Icons wie `content/service.ts` (PackageCheck, Truck, Users, Warehouse, Hammer) | Motive weichen ab; rote PNG-Icons gibt es nicht |
| Schrift | Poppins | Poppins (vorhanden), fett = `font-bold` | – |
| Technische Daten | Label grau, Zeilenlinien, runder Rahmen, 2 Tabellen nebeneinander | `.bj-specs-table`: Label `text-mid`, Linien `--color-bg-gray`, Rahmen `rounded-xl` | **Nur eine Tabelle**: Alle 139 Böden liefern genau eine 2-spaltige Tabelle. Das Aufteilen auf zwei Spalten ginge nur per CSS-Umbruch. Laut Vorgabe nicht vorgesehen, daher eine Tabelle. Leere Schlusszeile (bei Fresh Oak vorhanden) per CSS ausblenden? |

---

## 5. Layout und Breakpoints

| Breite | Aufbau |
|---|---|
| < 768 px | eine Spalte; `SetAngebotMobile` (wie heute) |
| 768–1023 px | eine Spalte; Desktop-`SetAngebot` (wie heute, Breakpoint `md` bleibt) |
| **1024–1279 px (Übergang)** | zwei Spalten wie heute (55/45). Links Galerie, darunter Zubehör. Rechts Info-Kopf, darunter die Karte |
| ≥ 1280 px (`xl`) | drei Spalten etwa 5 : 3,5 : 3,5. Galerie, Info, Karte; die Karte reicht neben das Zubehör (Zubehör unter Spalte 1–2) |

Umsetzung per CSS-Grid mit benannten Bereichen. Die DOM-Reihenfolge ist Galerie → Info → Karte → Zubehör, damit Mobil die Reihenfolge aus dem Entwurf von selbst stimmt. Keine Sticky-Elemente, keine Kaufleiste.

**Mobil-Akkordeons** („Passendes Zubehör“, Beschreibung, Technische Daten; Pfeil rechts, standardmäßig zu):
- Desktop: immer offen, Akkordeon-Kopf ausgeblendet.
- Inhalt bei geschlossenem Akkordeon per CSS `hidden`. Der `ZubehoerSlider` bleibt gemountet und lädt wie heute.
- Kopf des Zubehör-Akkordeons **in** `ZubehoerSlider`: Er gibt wie heute `null` zurück, wenn keine Kategorie IDs hat. So gibt es kein leeres Akkordeon.
- **Öffnen nach Warenkorb-Klick:** `TotalPrice` scrollt unverändert zu `#zubehoer-section`.
  - **Vorschlag A (ohne Änderung an `TotalPrice`):** `ZubehoerSlider` beobachtet `cartItems` aus `useCart` (nutzt es schon) und öffnet sich, sobald ein neues Set mit diesem Boden hinzukommt. Muster und Einzelzubehör lösen es nicht aus.
  - **Vorschlag B:** neue optionale Callback-Prop an `TotalPrice`. Expliziter, ändert aber Props.
  - Empfehlung **A**.
- **Anker-Leiste** (ab `lg`): springt per Anker zu den Abschnitten. Die rote Markierung folgt der Scrollposition (kleiner `IntersectionObserver`, reine Anzeige).
- **Breadcrumb**: Entwurf nur Desktop; Vorschlag ab `md` einblenden.

---

## 6. Referenzwerte VOR dem Umbau

**Wie erhoben:** Live-Daten vom 26.10.2026, geladen wie `page.tsx` (Produkt per Suche, Zusatzprodukte per `include`). Gerechnet mit der echten `setCalculations.ts` und einer zeilengetreuen Nachbildung von `prices`-useMemo, `SetAngebot` „Gesamt“, `TotalPrice` und `addSetToCart`. Eingabeweg: Paketfeld (n Pakete).
**Nicht im Browser geklickt** (s. Abschnitt 7). Diese Werte sind der Soll-Stand für Phase 3. Der Rundungsfehler (`bugfix-rundung-pakete.md`) betrifft diese 9 Kombinationen nicht.
Rohdaten: `%TEMP%\rundung-check\refs-vorher.json`, Skript `refs.js`.

### A – Klebe-Vinyl Fresh Oak Classic (Sparpaket; 3,34 m²/Paket; Sockelleiste St58 8069)

Set-Zeilen: Boden 37,95 → 29,99 €/m² · Sockelleiste 5,00 → 0,00 €/m · Sparpaket (ab 5 Paketen): Grundierung 0,80 → 0,00, Spachtelmasse 4,20 → 0,00, Kleber 2,25 → 0,00

| Pakete | Gesamt (Streich / Set €/m², Badge) | Galerie-Badge | Gesamtsumme | Du sparst | Warenkorb (Menge · Zeilensumme) |
|---|---|---|---|---|---|
| 1 | 42,95 / 29,99, -31% | -31% | 100,17 € | 43,29 € (31%) | Boden 1 · 100,17 €; Sockelleiste 1 · 0,00 €; Sparpaket alle 0; Summe 100,17 € |
| 5 | 50,20 / 29,99, -40% | -40% | 500,83 € | 337,51 € (40%) | Boden 5 · 500,83 €; Sockelleiste 6 · 0; Grundierung 5 kg 1, 10 kg 0; Spachtelmasse 25 kg 3; Kleber 5 kg 0, 14 kg 1; Zahnspachtel 1 (alle 0,00 €); Summe 500,83 € |
| 12 | 50,20 / 29,99, -40% | -40% | 1.202,00 € | 810,02 € (40%) | Boden 12 · 1.202,00 €; Sockelleiste 16; Grundierung 5 kg 1; Spachtelmasse 5; Kleber 14 kg 1; Zahnspachtel 1 (alle 0,00 €); Summe 1.202,00 € |

### B – Laminat Torgas Pine (Standard-Dämmung Basic PE-Schaum 2mm, VE 1 m²; Sockelleiste St40 40mm weiß, VE 2,5 lfm; 2,67 m²/Paket)

Set-Zeilen: Boden 19,95 → 13,99 €/m² · Dämmung 0,55 → 0,00 €/m² · Sockelleiste 3,50 → 0,00 €/lfm

| Pakete | Gesamt | Galerie-Badge | Gesamtsumme | Du sparst | Warenkorb |
|---|---|---|---|---|---|
| 1 | 24,00 / 13,99, -44% | -44% | 37,35 € | 26,73 € (44%) | Boden 1 · 37,35 €; Dämmung 2 · 0,00 €; Sockelleiste 1 · 0,00 €; Summe 37,35 € |
| 5 | 24,00 / 13,99, -44% | -44% | 186,77 € | 133,63 € (44%) | Boden 5 · 186,77 €; Dämmung 13; Sockelleiste 5; Summe 186,77 € |
| 12 | 24,00 / 13,99, -44% | -44% | 448,24 € | 320,72 € (44%) | Boden 12 · 448,24 €; Dämmung 32; Sockelleiste 12; Summe 448,24 € |

### C – Laminat Espresso Carpenter Oak, im Modal Dämmung gewechselt auf „Dämmung Premium Sound 2,8mm mit Dampfbremse“ (8,00 €/m²; Standard 0,55 €; `verrechnung` fehlt → Fallback 7,45 €)

Set-Zeilen: Boden 29,95 → 24,99 €/m² · Dämmung 8,00 → +7,45 €/m² · Sockelleiste St58 8218 5,00 → 0,00 €/m

| Pakete | Gesamt | Galerie-Badge | Gesamtsumme | Du sparst | Warenkorb |
|---|---|---|---|---|---|
| 1 | 42,95 / 32,44, -31% | -31% | 97,45 € | **nicht angezeigt** (Vergleichssumme < Set-Summe) | Boden 1 · 56,48 €; Dämmung 1 · 40,98 €; Sockelleiste 1 · 0,00 €; Summe 97,45 € |
| 5 | 42,95 / 32,44, -31% | -31% | 405,31 € | 80,02 € (31%) | Boden 5 · 282,39 €; Dämmung 3 · 122,92 €; Sockelleiste 4; Summe 405,31 € |
| 12 | 42,95 / 32,44, -31% | -31% | 882,60 € | 282,20 € (31%) | Boden 12 · 677,73 €; Dämmung 5 · 204,88 €; Sockelleiste 11; Summe 882,60 € |

Auffällig, bestehend und nicht Teil des Redesigns: Bei C mit 1 Paket zeigt die Set-Box „-31%“, „Du sparst“ fehlt aber, weil die Vergleichssumme unter der Set-Summe liegt (Premium-Dämmung, ganzes Paket 5,5 m² bei 2,26 m² Boden).

### 6.1 Browser-Messung auf dem unveränderten Stand (26.10.2026)

Gemessen mit `puppeteer-core` (`%TEMP%\pdp-browser`, außerhalb des Repos) und Chrome gegen den lokalen Dev-Server, Branch `feature/produktseite-redesign` = `main` (cea51e3), 1440 px. Ablauf je Lauf:
1. eigener, leerer Browser-Kontext
2. bei C im Modal die Dämmung wechseln
3. Paketzahl ins Paketfeld tippen
4. Set-Box, Gesamtsumme, „Du sparst“ und Galerie-Badge ablesen
5. „In den Warenkorb“ klicken und die Positionen aus `localStorage` (`woocommerce-cart`) lesen

Es wurde keine Bestellung abgeschickt. Rohdaten: `%TEMP%\pdp-browser\refs-browser-vorher.json`.

**Ergebnis: Alle Werte stimmen mit der Nachrechnung oben überein**, mit einer Ausnahme:

| | Nachrechnung | Browser lokal | Ursache |
|---|---|---|---|
| A, 12 Pakete, Gesamtsumme | 1.202,00 € | **1.101,83 €** | Aktion „Jedes 7. Paket gratis“: 1 Paket = 100,17 € abgezogen |
| B, 12 Pakete, Gesamtsumme | 448,24 € | **410,89 €** | dto., 37,35 € |
| C, 12 Pakete, Gesamtsumme | 882,60 € | **826,12 €** | dto., 56,48 € |

Ursache ist die lokale Umgebung, nicht der Code der Produktseite: In `.env.local` steht `NEXT_PUBLIC_AKTION_FORCE=1`, und auf `main` hat `isAktionForced()` in `isAktionActive()` Vorrang vor dem Enddatum (21.10.). Live ist die Aktion aus. Die Korrektur „Enddatum gilt auch im Vorschau-Modus“ liegt bisher nur auf `feature/black-weeks-2026`. Warenkorb-Positionen und Zeilensummen sind identisch, weil der Aktionsrabatt erst im Warenkorb bzw. Checkout abgezogen wird.
Für Phase 3 wird mit derselben `.env.local` gemessen. Sollwert für „Gesamtsumme bei 12 Paketen“ ist daher der Browserwert.

Stepper-Anzeige gemessen (Pakete / m²): A 1/3.34, 5/16.70, 12/40.08 · B 1/2.67, 5/13.35, 12/32.04 · C 1/2.26, 5/11.30, 12/27.12.

### 6.2 Betroffen vom Rundungsfehler? (`docs/bugfix-rundung-pakete.md`)

| Produkt | 1 / 5 / 12 Pakete (Paketfeld, so gemessen) | Hinweis |
|---|---|---|
| A Fresh Oak Classic (3,34) | nicht betroffen | betroffen wären 13, 26, 52, 79, 95 |
| B Torgas Pine (2,67) | nicht betroffen | **12 Pakete über den m²-Plus-Button wären betroffen** (Warenkorb 13 statt 12). Phase 3 daher ebenfalls über das Paketfeld messen |
| C Espresso Carpenter Oak (2,26) | nicht betroffen | Drawer-Fehler: Beim Reduzieren auf 1 Paket fällt die kostenlose Sockelleiste auf 0 (nur im Drawer, nicht Teil dieser Messung) |

Nach dem Merge von `fix/rundung-pakete` werden die Werte neu erhoben. Für diese 9 Kombinationen sollte sich nichts ändern.

---

## 7. Prüfung in Phase 2/3: was ich hier kann und was nicht

- **Build/Lint/Typecheck:** `npm run lint`, `npx tsc --noEmit` (ein `typecheck`-Skript gibt es nicht), `npm run build`.
  - `npm run build` rendert über `generateStaticParams` alle ~300 Produktseiten vor und belastet damit jedes Mal das Backend.
  - Laut Memory darf `build` nicht parallel zu `npm run dev` laufen, sonst wird `.next` zerstört.
  - **Vorschlag:** nach jedem Schritt Lint und Typecheck, `build` nach den Schritten 3, 6 und am Ende, jeweils bei gestopptem Dev-Server.
- **Screenshots (1440/1024/390 px):** möglich mit dem installierten Chrome bzw. Edge im Headless-Modus (`--screenshot`), ohne etwas zu installieren.
- **Klicktests** (Stepper auf 1/5/12, Modal-Wechsel, Muster, Zubehör, Set in den Warenkorb, Scroll, Warenkorb-Positionen aus `localStorage`) brauchen Browser-Steuerung. Vorschlag: `puppeteer-core` in einem temporären Ordner **außerhalb des Repos**, der den vorhandenen Chrome steuert. Nichts kommt ins Projekt oder in die `package.json`. **Das ist eine Installation und braucht deine Freigabe.** Ohne sie bleibt der Klicktest bei dir; ich liefere dafür eine Checkliste mit den Sollwerten aus Abschnitt 6.
- Roomvo-Button und Akkordeon-Öffnen lassen sich nur im Browser prüfen.

---

## 8. Entscheidungen, die ich vor Phase 2 brauche

1. **Kategorie-Label/Breadcrumb:** Auswahlregel aus 1.2 statt `categories[0]`?
2. **Anker-/Akkordeon-Labels:** „Produktbeschreibung“ / „Technische Daten“ (aus deinem Auftrag) oder die bestehenden „Artikelbeschreibung“ / „Weitere Artikeldetails“?
3. **H2 der Abschnitte:** wie Abschnittslabel? Und bei Technische Daten die `<h3>Artikeleigenschaften</h3>` aus dem HTML behalten oder ausblenden?
4. **Zubehör-Infotexte + „Weiter zum Warenkorb“:** Platzierung wie in Abschnitt 3 vorgeschlagen?
5. **Set-Preise dunkel statt rot** (Entwurf) und **Seitenhintergrund weiß**?
6. **Trust-Leiste** mit den vorhandenen Titeln aus Abschnitt 3 (nur „Schnelle Lieferung“ mit Unterzeile)?
7. **Roomvo:** Button per CSS umstylen und die Lücke bei nicht verfügbaren Produkten per CSS ausblenden?
8. **Mobil-Akkordeon Zubehör öffnen:** Variante A?
9. **Leere letzte Tabellenzeile** in den Technischen Daten per CSS ausblenden?
10. **Builds** nach Schritt 3, 6 und am Ende statt nach jedem Schritt?
11. **`puppeteer-core`** im temporären Ordner für Klicktests und Screenshots?
12. **Branch-Upstream** vor dem ersten Push lösen (s. Kopf)?

---

## 9. Bericht Phase 2/3 (26.10.2026)

Branch `feature/produktseite-redesign`, Upstream gelöst. **Nichts committet.**

### 9.1 Geänderte Dateien

| Datei | Änderung |
|---|---|
| `src/components/product/ProductPageContent.tsx` | Boden-Zweig: Breadcrumb, Raster (mobil 1 / lg 2 / xl 3 Spalten), Muster-Button grün in `flex-col` mit `order-first` (Roomvo), Karte mit Set-Box/Stepper/TotalPrice/Service-Zeilen (einmal statt doppelt, Telefon als `tel:`)/Zahlungsarten, `#zubehoer-section` im Raster, `ProduktDetails` statt `ProductTabs` (Definition entfernt), Seitenhintergrund nur bei Böden weiß. `prices`, `quantities`, `sparpaket*`, Handler und Zubehör-Layout unverändert |
| `src/components/product/ProductInfo.tsx` | aufgeteilt in `ProductInfoKopf` (Kategorie-Label vor H1, H1, Art.-Nr. direkt danach, Vorteile) und `ProductSetAngebot` (SetAngebot `hidden md:block` + SetAngebotMobile `md:hidden`). Ableitung unverändert in `ableiten()` |
| `src/components/product/SetAngebot.tsx`, `SetAngebotMobile.tsx` | nur JSX: Kopf mit Titel + Badge, Zeilen „Label - Name“ mit Streichpreis, dunkle Set-Preise, Block „Set-Preis“. State, Effekt, Modal unverändert |
| `src/components/product/QuantitySelector.tsx` | nur Klassen: Stepper-Optik, m²-Feld per `order-first` links. Handler/Rundung unverändert |
| `src/components/product/TotalPrice.tsx` | nur JSX unterhalb von `return`: Gesamtsumme-Zeile mit „Du sparst“, Buttons untereinander, Lieferzeit als Icon-Zeile. `handleAddToCart` unverändert |
| `src/components/product/ImageGallery.tsx` | Prop `variante` (Standard = alt): Pfeile immer sichtbar, 4 Thumbnails, aktives `border-brand` |
| `src/components/product/ZahlungsIcons.tsx` | Prop `variante` (Standard = alt): Raster |
| `src/components/product/ZubehoerSlider.tsx` | Tab-Leiste, Infotexte unter der Überschrift, „Weiter zum Warenkorb“ unter dem Slider, mobil Akkordeon (öffnet bei neuem Set dieses Bodens im Warenkorb), `min-w-0` gegen Überbreite. Lade-/Warenkorb-Logik unverändert |
| `src/components/product/ProduktBreadcrumb.tsx` (neu) | sichtbare Breadcrumb + `getBodenKategorie()` (erste echte Bodenkategorie) |
| `src/components/product/ProduktDetails.tsx` (neu) | Anker-Leiste (Desktop), Abschnitte „Artikelbeschreibung“ / „Weitere Artikeldetails“, mobil Akkordeons, Trust-Leiste aus `SERVICE_GRID`/`TRUST_ZONE_TEXTE`. HTML-Bereinigung unverändert aus `ProductTabs` |
| `src/app/globals.css` | Roomvo-Button-Override (nur CSS), `.bj-specs-table` neu gestaltet |

Diff: 10 geänderte + 2 neue Dateien. Alle Dateien haben wie die Originale durchgehend CRLF.

### 9.2 Prüfungen

- **Typecheck:** 0 Fehler in `src` (`npx tsc --noEmit`; die übrigen Meldungen stammen aus dem gitignorierten `_diagnose/`).
- **Lint:** 0 Fehler in `src`, wie auf dem unveränderten Stand. `npm run lint` auf das ganze Projekt meldet 2977 Fehler außerhalb von `src`.
- **Build** nach Schritt 3, 6 und am Ende: grün, 391 Seiten. Gebaut wurde in einem sauberen Worktree, weil `_diagnose/` den Build im Repo selbst bricht (nicht auf Vercel).
- **Referenzwerte:** **63 von 63 Werten identisch** mit der Messung vor dem Umbau (9 Kombinationen × Set-Box, Gesamtsumme, Du sparst, Galerie-Badge, Stepper, Summe, Warenkorb-Positionen). Rohdaten `%TEMP%\pdp-browser\refs-browser-nachher.json`.
- **Funktionstests:** alle bestanden.
  - Muster bestellen: im Warenkorb, Hinweis-Modal erscheint.
  - Zubehör in den Warenkorb.
  - Set in den Warenkorb mit Sprung zu `#zubehoer-section`: Desktop und 390 px, mobil öffnet sich das Akkordeon.
  - Mobile Akkordeons standardmäßig zu und einzeln zu öffnen.
  - Anker-Leiste springt und markiert rot.
  - Optionswechsel im Modal: Desktop (Fall C) und mobiles Bottom-Sheet, Werte gleich Fall C.
  - Roomvo-Button: im DOM vor dem Muster-Button, optisch darunter, rot umrandet.
- **Zubehör-Layout:** Screenshot lokal = live (unverändert).
- **Screenshots** (`%TEMP%\pdp-browser\final\`): `pulse-grey-1440/1024/390`, `fresh-oak-1440/390`, `zubehoer-mobil-offen.png`.

### 9.3 Abweichungen vom Entwurf (bewusst)

- Entfallen laut Vorgabe: Sterne, Video, Vollbild, PDF-Links, „Verlegung & Pflege“, „Wichtige Hinweise“, Bewertungen, FAQ, Untertitel, „Vorteile auf einen Blick“, Zubehör-Tab „Mengenrechner“, Set-Untertitel, „statt“.
- Anker-Leiste und Akkordeons mit den bisherigen Bezeichnungen. Die Tabelle bringt ihre eigene Überschrift „Artikeleigenschaften“ mit (h3 aus dem HTML, beibehalten).
- Technische Daten als eine Tabelle, weil das HTML nur eine liefert.
- Zwei-Ebenen-Breadcrumb nicht möglich, da die Kategorien keine Hierarchie haben; es wird eine Ebene angezeigt.
- Ersparnis-Badge der Set-Box dunkel (`bg-dark`, rund) wie im Entwurf, statt wie im Plan genannt rot.
- Trust-Leiste erst ab `md` (im mobilen Entwurf nicht vorhanden), Breadcrumb ebenfalls erst ab `md`.
- Info-Zeilen nutzen die vorhandenen dunklen PNG-Icons, die Trust-Leiste `lucide`-Icons in Rot.
- Roomvo-Button: Kamera-Icon von Roomvo statt Würfel-Icon aus dem Entwurf. Er erscheint nur bei den 98 von 139 Böden, die bei Roomvo hinterlegt sind.

### 9.4 Bestehende Befunde (nicht vom Redesign, nicht behoben)

- Bei 1024 px ragt der Header (Konto/Wunschliste/Warenkorb) ca. 107 px über die Breite. Live identisch.
- `.env.local`: `NEXT_PUBLIC_AKTION_FORCE=1` lässt die beendete Aktion lokal weiterlaufen (s. 6.1).
- Leere letzte Tabellenzeile in den Technischen Daten (z. B. Fresh Oak), nicht ausgeblendet, weil dazu keine Entscheidung vorliegt.
- Rundungsfehler und Drawer-Fehler: separat in `docs/bugfix-rundung-pakete.md`.

### 9.5 Aufgeräumt

Der Build-Worktree `%TEMP%\pdp-build` ist entfernt; die Junction auf `node_modules` wurde vorher gelöst (Repo-`node_modules` unverändert, 315 Einträge). In `.git/worktrees/pdp-build` blieb ein leerer Rest (`logs`, `refs`, `ORIG_HEAD`) wegen „Permission denied“, vermutlich durch OneDrive. Git führt den Worktree nicht mehr (`git worktree list`). Der Ordner kann gefahrlos gelöscht werden.

### 9.6 Review-Runde nach den Screenshots (26.10.2026)

| # | Punkt | Ergebnis |
|---|---|---|
| 1 | Lieferzeit „… oder im Markt abholen oder im Markt abholen“ | Ursache: Backend-Text enthält den Zusatz bereits (alle Produkte), `TotalPrice` hängt ihn erneut an; live identisch. Fix nur in der Anzeige: Zusatz nur, wenn nicht enthalten |
| 2 | Beratungs-Button + schwebender Warenkorb verdecken die Kaufbox | Quelle: globaler `FloatingContactButton` (layout.tsx). Fix: Wrapper der Kaufbox trägt `data-kaufbox`; nur auf `/products/…` blenden sich die Buttons aus (opacity + translate, `inert`, bleiben im DOM), solange die Kaufbox sichtbar ist. Geprüft 1440/390: Boden aus → am Seitenende sichtbar und klickbar → zurück wieder aus; Zubehörseite und Startseite unverändert sichtbar/klickbar |
| 3 | Trusted-Shops-Badge verdeckt Inhalte | Position kommt aus `TrustedShops.tsx` (feste Snippet-Attribute + `computeLeftOffset()` an die Inhaltskante +60 px), nicht nur aus dem TS-Backend. Im Redesign nicht geändert → Folgeauftrag 3 |
| 4 | Leere Tabellenzeile | per CSS ausgeblendet (`tr:not(:has(td:not(:empty)))`) |
| 5 | Zubehör-Pfeile über Kartentext | Pfeile im Randbereich (`md:px-14`, w-10), unter md wie bisher ausgeblendet |
| 6 | Tab-Überlauf ohne Hinweis | Verlauf rechts, solange weitere Tabs verdeckt sind |
| 7 | Artikelbeschreibung | CSS-Klasse `bj-beschreibung`: Absätze, h2–h4 und fette erste Zeile als Überschrift, Listen mit roten Häkchen, dezente Trennlinie. Backend-HTML unverändert |
| 8 | Technische Daten zweispaltig | ab 1024 px per `column-count: 2` auf `tbody` (spaltenweise), darunter einspaltig |
| 9 | Telefonnummer | `STANDORT.telefonAnzeige` („02433 938884“) als `tel:`-Link |
| 10 | Drawer bei 1024 px sichtbar | live identisch (Header 107 px zu breit, Seite seitlich scrollbar, Drawer links 1024 px / 450 px breit) → Folgeauftrag 1 |

Zusätzlich geändert: `src/components/FloatingContactButton.tsx`. Danach erneut: Referenzwerte 63/63 identisch, Funktionstests 20/20 OK.

## 10. Offene Folgeaufträge (nicht Teil des Redesigns, nicht umgesetzt)

1. **Header bei 1024 px 107 px zu breit:** Die Seite lässt sich seitlich scrollen, dabei wird der Warenkorb-Drawer rechts teilweise sichtbar. Live identisch. Ursache: Header-Aktionen (Konto/Wunschliste/Warenkorb) ragen über die Breite.
2. **Doppelte Lieferzeit im Zubehör-Layout** (`SimpleProductLayout` in `ProductPageContent.tsx`): hängt ebenfalls „oder im Markt abholen“ an den Backend-Text, der den Zusatz schon enthält. Sichtbar nur bei Zubehör mit `show_lieferzeit`.
3. **Position Trusted-Shops-Badge** (`TrustedShops.tsx`, `computeLeftOffset`, Snippet-Attribute): verdeckt auf der Produktseite Thumbnails bzw. mobil Muster-Button/Set-Titel. Mögliche Hebel: Y-Offset, Ausblenden beim Scrollen auch am Desktop, kein Inhaltsversatz auf der Produktseite.

**Nächste Schritte:** Freigabe/Commit durch dich. Nach dem Merge von `fix/rundung-pakete` auf `main`: `main` in diesen Branch holen (Logik aus dem Fix gewinnt) und die Referenzwerte neu erheben.
