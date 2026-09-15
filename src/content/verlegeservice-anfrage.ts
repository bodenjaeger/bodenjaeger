/**
 * Inhalte und Optionslisten des Formulars „Verlegeservice anfragen".
 *
 * Wortlaut 1:1 aus der Kundenspezifikation — nicht umformulieren.
 *
 * Bewusst NICHT enthalten (ausdrückliche Vorgabe): „Nur Material kaufen" und
 * „Ich verlege selbst". Das Formular richtet sich ausschließlich an
 * Interessenten, die eine Verlegung durch Bodenjäger möchten. Ebenfalls nicht
 * abgefragt: Sockelleistenfarbe, Spachtelstärke, Grundierung, Schleifarbeiten,
 * Feuchtigkeitsmessung, exakter Untergrundaufbau — das klärt das Team später.
 *
 * Die `key`-Werte gehen unverändert in Trello und ins Tracking. Wer Labels
 * ändert, sollte die Keys stabil lassen, sonst brechen Auswertungen.
 */

// ── Schritte / Fortschritt ────────────────────────────────────────────────────
export const VS_SCHRITTE = ['Standort', 'Projekt', 'Altboden', 'Kontakt'] as const
export type VsSchritt = (typeof VS_SCHRITTE)[number]

// ── Schritt 1: Standort ───────────────────────────────────────────────────────
export const VS_STANDORT = {
  ueberschrift: 'Wo soll der Boden verlegt werden?',
  hinweis:
    'Gib die Postleitzahl des Projekts ein. Wir prüfen direkt, ob der Standort in unserem regulären Verlegegebiet liegt.',
  plzLabel: 'Postleitzahl',
  ortLabel: 'Ort',
  plzPlatzhalter: '41836',
  ortPlatzhalter: 'wird automatisch ergänzt',
  inArea: {
    titel: 'Gute Nachricht!',
    text: 'Dein Projekt liegt in unserem regulären Verlegegebiet.',
  },
  outOfArea: {
    titel: 'Dein Projekt liegt außerhalb unseres regulären 50-km-Verlegegebiets.',
    text: 'Du kannst deine Anfrage trotzdem absenden. Wir prüfen individuell, ob wir dein Projekt übernehmen können.',
  },
  unbekannt:
    'Diese Postleitzahl kennen wir nicht. Bitte prüfe die Eingabe — du kannst die Anfrage aber trotzdem absenden.',
  weiter: 'Weiter zum Projekt',
} as const

// ── Schritt 2: Projekt ────────────────────────────────────────────────────────
export const VS_FLAECHE_STAFFELN = [
  { key: 'unter_15', label: 'Unter 15 m²', min: 1, max: 14 },
  { key: '15_bis_40', label: '15 m² – 40 m²', min: 15, max: 40 },
  { key: '41_bis_80', label: '41 m² – 80 m²', min: 41, max: 80 },
  { key: 'ueber_80', label: 'Mehr als 80 m²', min: 81, max: 100000 },
  // Ohne Grenzen: hier wird keine genaue Quadratmeterzahl verlangt.
  { key: 'unbekannt', label: 'Noch nicht genau bekannt', min: null, max: null },
] as const
export type VsFlaecheKey = (typeof VS_FLAECHE_STAFFELN)[number]['key']

export const VS_RAEUME = [
  'Wohnzimmer',
  'Esszimmer',
  'Küche',
  'Flur',
  'Schlafzimmer',
  'Kinderzimmer',
  'Arbeitszimmer',
  'Badezimmer',
  'Gäste-WC',
  'Keller',
  'Treppe',
  'Gewerbefläche',
  'Sonstiger Raum',
] as const
/** Löst das Freitextfeld „Welcher Raum?" aus. */
export const VS_RAUM_SONSTIGER = 'Sonstiger Raum'

export const VS_BODENARTEN = [
  { key: 'rigid_vinyl', label: 'Klick-Vinyl / Rigid-Vinyl' },
  { key: 'klebe_vinyl', label: 'Klebe-Vinyl' },
  { key: 'laminat', label: 'Laminat' },
  { key: 'parkett', label: 'Parkett' },
  { key: 'teppichboden', label: 'Teppichboden' },
  { key: 'pvc_cv', label: 'PVC- / CV-Belag' },
  { key: 'beratung', label: 'Noch nicht entschieden – Beratung gewünscht' },
] as const
export type VsBodenartKey = (typeof VS_BODENARTEN)[number]['key']
/**
 * Schließt die übrigen Bodenarten aus: „Noch nicht entschieden" zusammen mit
 * „Laminat" anzukreuzen widerspricht sich, und das Team bekäme einen Lead, der
 * beides behauptet. Deshalb verdrängen sich die Auswahl und diese Option
 * gegenseitig.
 */
export const VS_BODENART_BERATUNG: VsBodenartKey = 'beratung'

export const VS_ZEITRAEUME = [
  { key: 'asap', label: 'So schnell wie möglich' },
  { key: 'bis_4_wochen', label: 'Innerhalb der nächsten 4 Wochen' },
  { key: '1_bis_3_monate', label: 'In 1 bis 3 Monaten' },
  { key: '3_bis_6_monate', label: 'In 3 bis 6 Monaten' },
  { key: 'spaeter', label: 'Später' },
  { key: 'offen', label: 'Noch nicht festgelegt' },
] as const
export type VsZeitraumKey = (typeof VS_ZEITRAEUME)[number]['key']
/** Bei dieser Auswahl erscheint das optionale Terminfeld. */
export const VS_ZEITRAUM_SPAETER: VsZeitraumKey = 'spaeter'

export const VS_PROJEKT = {
  ueberschrift: 'Erzähl uns kurz von deinem Projekt',
  flaecheFrage: 'Wie groß ist die zu verlegende Fläche ungefähr?',
  qmFrage: 'Wie viele Quadratmeter sind es ungefähr?',
  // Kein Pflichtfeld: Die Staffel ist bereits gewählt, die genaue Zahl kennen
  // viele Interessenten noch nicht. Wird sie angegeben, muss sie aber zur
  // Staffel passen — siehe pruefeProjekt().
  qmHinweis: 'Optional — eine grobe Schätzung genügt.',
  qmEinheit: 'm²',
  qmPlatzhalter: 'ca. …',
  raeumeFrage: 'Welche Räume sollen einen neuen Boden erhalten?',
  raeumeHinweis: 'Mehrfachauswahl möglich',
  raumSonstigerFrage: 'Welcher Raum?',
  bodenartFrage: 'Welche Bodenart möchtest du verlegen lassen?',
  bodenartHinweis: 'Mehrfachauswahl möglich',
  zeitraumFrage: 'Wann soll die Verlegung stattfinden?',
  zeitraumSpaeterFrage: 'Gewünschter Zeitraum oder Termin',
  zeitraumSpaeterPlatzhalter: 'Zum Beispiel Oktober 2026 oder spätestens vor dem Einzug.',
  weiter: 'Weiter zum Altboden',
} as const

// ── Schritt 3: Altboden ───────────────────────────────────────────────────────
export const VS_ALTBODEN_ENTFERNEN = [
  { key: 'ja', label: 'Ja' },
  { key: 'nein', label: 'Nein' },
  { key: 'unklar', label: 'Weiß ich noch nicht' },
  { key: 'keiner', label: 'Es ist kein Bodenbelag vorhanden' },
] as const
export type VsAltbodenEntfernenKey = (typeof VS_ALTBODEN_ENTFERNEN)[number]['key']

export const VS_ALTBODEN_BELAG = [
  { key: 'laminat', label: 'Laminat' },
  { key: 'klick_vinyl', label: 'Klick-Vinyl' },
  { key: 'klebe_vinyl', label: 'Klebe-Vinyl' },
  { key: 'fliesen', label: 'Fliesen' },
  { key: 'teppichboden', label: 'Teppichboden' },
  { key: 'pvc_cv', label: 'PVC- / CV-Belag' },
  { key: 'parkett_holz', label: 'Parkett oder Holzboden' },
  { key: 'sonstiger', label: 'Sonstiger Bodenbelag' },
  { key: 'unbekannt', label: 'Weiß ich nicht' },
] as const
export type VsAltbodenBelagKey = (typeof VS_ALTBODEN_BELAG)[number]['key']
/** Löst das Freitextfeld für den vorhandenen Belag aus. */
export const VS_BELAG_SONSTIGER: VsAltbodenBelagKey = 'sonstiger'

export const VS_ALTBODEN_VERLEGEART = [
  { key: 'lose', label: 'Lose beziehungsweise schwimmend verlegt' },
  { key: 'vollflaechig', label: 'Vollflächig verklebt' },
  { key: 'teilweise', label: 'Teilweise verklebt' },
  { key: 'unbekannt', label: 'Weiß ich nicht' },
] as const
export type VsVerlegeartKey = (typeof VS_ALTBODEN_VERLEGEART)[number]['key']

export const VS_ALTBODEN = {
  ueberschrift: 'Was müssen wir vor der Verlegung berücksichtigen?',
  entfernenFrage: 'Soll der vorhandene Boden entfernt werden?',
  belagFrage: 'Welcher Bodenbelag ist derzeit vorhanden?',
  belagSonstigerFrage: 'Welcher Bodenbelag ist vorhanden?',
  verlegeartFrage: 'Ist der vorhandene Boden lose verlegt oder verklebt?',
  // Die Verlegeart bleibt bewusst optional — viele Privatkunden wissen sie nicht.
  verlegeartHinweis: 'Optional — wenn du unsicher bist, klären wir das gemeinsam.',
  unklarHinweis:
    'Kein Problem. Wir beurteilen gemeinsam mit dir, ob der vorhandene Boden entfernt werden muss.',
  weiter: 'Weiter zu Kontakt und Unterlagen',
} as const

// ── Schritt 4: Kontakt und Unterlagen ─────────────────────────────────────────
export const VS_KONTAKTART = [
  { key: 'telefon', label: 'Telefon' },
  { key: 'email', label: 'E-Mail' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'egal', label: 'Keine Präferenz' },
] as const
export type VsKontaktartKey = (typeof VS_KONTAKTART)[number]['key']

export const VS_ERREICHBARKEIT = [
  { key: 'vormittags', label: 'Vormittags' },
  { key: 'nachmittags', label: 'Nachmittags' },
  { key: 'abends', label: 'Abends' },
  { key: 'jederzeit', label: 'Jederzeit' },
] as const
export type VsErreichbarkeitKey = (typeof VS_ERREICHBARKEIT)[number]['key']

export const VS_KONTAKT = {
  ueberschrift: 'Fast geschafft – wie können wir dich erreichen?',
  hinweis: 'Wir prüfen deine Angaben und melden uns persönlich bei dir.',
  vornameLabel: 'Vorname',
  nachnameLabel: 'Nachname',
  telefonLabel: 'Telefonnummer',
  emailLabel: 'E-Mail-Adresse',
  kontaktartFrage: 'Wie möchtest du bevorzugt kontaktiert werden?',
  erreichbarkeitFrage: 'Wann bist du am besten erreichbar?',

  preisUeberschrift: 'Gibt es bereits eine Preisvorstellung für dein Projekt?',
  preisPlatzhalter: 'Zum Beispiel: ca. 8.000 € für Material und Verlegung',
  preisHinweis: 'Die Angabe ist freiwillig und hilft uns, deine Anfrage besser einzuordnen.',

  freitextUeberschrift: 'Gibt es noch etwas, das wir zu deinem Projekt wissen sollten?',
  freitextHinweis: 'Optional',
  freitextPlatzhalter:
    'Zum Beispiel Fußbodenheizung, Treppe, Möbel in den Räumen, besondere Übergänge, ein Einzugstermin oder besondere Wünsche zur Ausführung.',

  uploadUeberschrift: 'Bilder oder Bauplan hochladen',
  uploadHinweis:
    'Optional — lade gerne Bilder der Räume, des vorhandenen Bodens oder einen Bauplan hoch. Das hilft uns bei der ersten Einschätzung deines Projekts.',
  uploadButton: 'Dateien auswählen',
  uploadEntfernen: 'Entfernen',

  datenschutzText:
    'Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Angaben zur Bearbeitung meiner Anfrage zu.',
  datenschutzLinkLabel: 'Datenschutzerklärung',
  datenschutzHref: '/datenschutz',

  absenden: 'Verlegeservice unverbindlich anfragen',
  absendenLaeuft: 'Anfrage wird gesendet …',
  absendenHinweis: 'Kostenlos und unverbindlich. Wir melden uns persönlich bei dir.',
} as const

// ── Upload-Grenzen ────────────────────────────────────────────────────────────
// Client UND Server prüfen gegen dieselben Werte (Server ist die Instanz, die zählt).
export const VS_UPLOAD = {
  maxFiles: 8,
  maxFileBytes: 10 * 1024 * 1024,
  acceptMime: [
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'application/pdf',
  ],
  // capture wird absichtlich NICHT gesetzt: so bietet das Smartphone Galerie,
  // Kamera und Dateien zur Auswahl an, statt direkt die Kamera zu erzwingen.
  acceptAttr: '.jpg,.jpeg,.png,.heic,.heif,.pdf,image/jpeg,image/png,image/heic,image/heif,application/pdf',
} as const

// ── Bestätigung ───────────────────────────────────────────────────────────────
export const VS_BESTAETIGUNG = {
  ueberschrift: 'Vielen Dank für deine Anfrage!',
  textInArea:
    'Dein Projekt liegt in unserem regulären Verlegegebiet. Wir prüfen deine Angaben und melden uns persönlich bei dir.',
  textOutOfArea:
    'Dein Projekt liegt außerhalb unseres regulären 50-km-Verlegegebiets. Wir prüfen individuell, ob wir die Verlegung trotzdem übernehmen können.',
  zusammenfassungTitel: 'Deine Angaben',
  zurueck: 'Zurück zur Fachmarktseite',
  zurueckHref: '/fachmarkt-hueckelhoven',
} as const

// ── Fehlermeldungen ───────────────────────────────────────────────────────────
export const VS_FEHLER = {
  plzPflicht: 'Bitte gib die Postleitzahl des Projekts an.',
  plzFormat: 'Eine Postleitzahl besteht aus fünf Ziffern.',
  flaechePflicht: 'Bitte wähle eine Flächenangabe.',
  // Kein `qmPflicht` mehr — die Quadratmeterzahl ist freiwillig. Die beiden
  // folgenden Meldungen greifen nur, wenn tatsächlich etwas eingetragen wurde.
  qmZahl: 'Bitte gib nur Zahlen ein.',
  /** Staffel und eingegebene Fläche passen nicht zusammen. */
  qmStaffel: (label: string) => `Die Fläche passt nicht zur Auswahl „${label}".`,
  raeumePflicht: 'Bitte wähle mindestens einen Raum.',
  raumSonstigerPflicht: 'Bitte gib an, welcher Raum gemeint ist.',
  bodenartPflicht: 'Bitte wähle mindestens eine Bodenart.',
  zeitraumPflicht: 'Bitte wähle einen Zeitraum.',
  altbodenPflicht: 'Bitte beantworte die Frage zum vorhandenen Boden.',
  belagPflicht: 'Bitte gib an, welcher Bodenbelag vorhanden ist.',
  belagSonstigerPflicht: 'Bitte beschreibe den vorhandenen Bodenbelag.',
  vornamePflicht: 'Bitte gib deinen Vornamen an.',
  nachnamePflicht: 'Bitte gib deinen Nachnamen an.',
  telefonPflicht: 'Bitte gib eine Telefonnummer an.',
  telefonFormat: 'Diese Telefonnummer sieht nicht vollständig aus.',
  emailPflicht: 'Bitte gib eine E-Mail-Adresse an.',
  emailFormat: 'Diese E-Mail-Adresse sieht nicht korrekt aus.',
  datenschutzPflicht: 'Bitte stimme der Verarbeitung deiner Angaben zu.',
  dateiFormat: 'Erlaubt sind JPG, PNG, HEIC und PDF.',
  dateiGroesse: 'Jede Datei darf höchstens 10 MB groß sein.',
  dateiAnzahl: 'Es sind höchstens 8 Dateien möglich.',
  absendenFehlgeschlagen:
    'Deine Anfrage konnte nicht gesendet werden. Bitte versuche es erneut oder ruf uns an.',
} as const

// ── Meta / SEO ────────────────────────────────────────────────────────────────
export const VS_META = {
  title: 'Verlegeservice anfragen | Bodenjäger Hückelhoven',
  description:
    'Verlegeservice unverbindlich anfragen: In vier Schritten erfassen wir Standort, Projekt und Altboden. Wir prüfen deine Angaben und melden uns persönlich.',
} as const
