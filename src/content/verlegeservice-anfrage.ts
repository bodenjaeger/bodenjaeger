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
export const VS_SCHRITTE = ['Standort', 'Projekt', 'Altboden', 'Ablauf', 'Kontakt'] as const
export type VsSchritt = (typeof VS_SCHRITTE)[number]
/**
 * Zusätzlicher Schritt, nur wenn „Aufmaß vor Ort" gewählt wurde. Er erscheint
 * im Fortschritt erst ab dem Kontakt-Schritt, damit Interessenten nicht schon
 * zu Beginn einen Bezahlschritt sehen.
 */
export const VS_SCHRITT_ZAHLUNG = 'Zahlung'

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

// ── Schritt 4: Ablauf („Wie soll es weitergehen?") ────────────────────────────
export const VS_WEGE = [
  {
    key: 'aufmass',
    label: 'Aufmaß vor Ort vereinbaren',
    text: 'Wir messen bei dir aus, beraten dich und erstellen dein genaues Angebot. Du bezahlst das Aufmaß direkt online und wir rufen dich nur noch für den Termin an. Erteilst du uns den Auftrag mit Verlegung, schreiben wir dir den Betrag vollständig gut.',
    badge: 'Schnellster Weg zum Angebot',
  },
  {
    key: 'telefon',
    label: 'Erst telefonisch beraten lassen',
    text: 'Kostenlos. Wir rufen dich an und besprechen dein Projekt.',
    badge: null,
  },
  {
    key: 'preis',
    label: 'Grobe Preiseinschätzung vorab',
    text: 'Kostenlos und auf Basis deiner Angaben. Das verbindliche Angebot erstellen wir nach dem Aufmaß vor Ort.',
    badge: null,
  },
] as const
export type VsWegKey = (typeof VS_WEGE)[number]['key']
export const VS_WEG_AUFMASS: VsWegKey = 'aufmass'

export const VS_ABLAUF = {
  ueberschrift: 'Wie soll es weitergehen?',
  hinweis: 'Wähle, was dir gerade am meisten hilft. Du kannst dich später immer noch anders entscheiden.',
  frage: 'Dein nächster Schritt',
  aufmassNichtMoeglich:
    'Ein Aufmaß vor Ort bieten wir im Umkreis von ca. 50 km um Hückelhoven an. Wähle gern die telefonische Beratung oder die Preiseinschätzung.',
  aufmassNichtOnline:
    'Für deinen Standort können wir das Aufmaß gerade nicht online buchen. Wähle gern die telefonische Beratung, wir vereinbaren das Aufmaß dann persönlich.',
  weiter: 'Weiter zu Kontakt und Unterlagen',
} as const

// ── Schritt 5: Kontakt und Unterlagen ─────────────────────────────────────────
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
  /** Bei „Aufmaß vor Ort": erst zur Zahlung, abgeschickt wird dort. */
  weiterZurZahlung: 'Weiter zur Zahlung',
} as const

// ── Schritt 6: Zahlung (nur „Aufmaß vor Ort") ─────────────────────────────────
/**
 * Zahlarten für das Aufmaß. Vorkasse ist bewusst nicht dabei: Der Termin soll
 * nicht auf einen Zahlungseingang warten. Apple Pay und Google Pay bietet
 * Stripe auf der Kartenseite automatisch an, sofern sie im Stripe-Konto aktiv
 * sind.
 */
export const VS_ZAHLARTEN = [
  { key: 'paypal', label: 'PayPal' },
  { key: 'stripe', label: 'Kredit- oder Debitkarte, Apple Pay, Google Pay' },
  { key: 'klarna', label: 'Klarna' },
] as const
export type VsZahlartKey = (typeof VS_ZAHLARTEN)[number]['key']

export const VS_ZAHLUNG = {
  ueberschrift: 'Aufmaß bezahlen',
  hinweis: 'Nach der Zahlung rufen wir dich an und vereinbaren deinen Aufmaßtermin.',
  position: 'Aufmaß + Beratung + Angebot',
  gutschrift: 'Gutschrift bei Auftrag mit Verlegung',
  gutschriftWert: 'vollständig',
  summe: 'Jetzt zu zahlen',
  summeZusatz: 'inkl. MwSt.',
  storno: 'Kostenlos absagen oder verschieben bis 24 Stunden vor dem Termin.',
  strasseLabel: 'Straße und Hausnummer',
  strasseHinweis: 'Hier findet das Aufmaß statt.',
  zahlartFrage: 'Zahlungsart',
  widerrufText:
    'Ich verlange ausdrücklich, dass Bodenjäger vor Ablauf der Widerrufsfrist mit dem Aufmaß beginnt. Mir ist bekannt, dass mein Widerrufsrecht mit vollständiger Erbringung des Aufmaßes erlischt.',
  agbText: 'Es gelten unsere AGB. Hinweise zu deinem Widerrufsrecht findest du in der Widerrufsbelehrung.',
  agbHref: '/agb',
  widerrufHref: '/widerruf',
  /** Der Betrag wird eingesetzt, z. B. „Jetzt 69 € bezahlen". */
  bezahlen: (preis: string) => `Jetzt ${preis} bezahlen`,
  bezahlenLaeuft: 'Du wirst zur Zahlung weitergeleitet …',
} as const

/** Texte der Seite, auf die Stripe und PayPal nach der Zahlung zurückleiten. */
export const VS_AUFMASS_BEZAHLT = {
  ueberschrift: (vorname: string) => (vorname ? `Danke, ${vorname}! Dein Aufmaß ist bezahlt.` : 'Danke! Dein Aufmaß ist bezahlt.'),
  text: 'Wir melden uns per WhatsApp oder Telefon und vereinbaren den Termin für dein Aufmaß. Die Zahlungsbestätigung bekommst du per E-Mail.',
  gutschrift: (preis: string) => `Bei Beauftragung schreiben wir dir ${preis} vollständig gut.`,
  boeden: (liste: string) => `Wir bringen ${liste} als Großmuster mit.`,
  schritte: [
    'Wir melden uns per WhatsApp oder Telefon und vereinbaren deinen Aufmaßtermin.',
    'Aufmaß vor Ort: Wir messen aus und prüfen Untergrund, Türen und Übergänge.',
    'Du bekommst dein genaues Angebot mit Boden, Zubehör und Verlegung.',
    'Verlegung zum Wunschtermin und gemeinsame Abnahme.',
  ],
  wartetTitel: 'Deine Zahlung wird noch bestätigt',
  wartetText:
    'Das dauert manchmal einen Moment. Sobald die Zahlung bestätigt ist, bekommst du eine E-Mail und wir rufen dich für den Termin an.',
  offenTitel: 'Die Zahlung wurde nicht abgeschlossen',
  offenText:
    'Deine Anfrage ist bei uns angekommen. Du kannst das Aufmaß jetzt noch bezahlen oder wir melden uns bei dir und klären alles persönlich.',
  nochmal: 'Jetzt bezahlen',
  nichtGefunden:
    'Diese Bestellung konnten wir nicht finden. Ruf uns gern an, wir helfen dir weiter.',
} as const

/** Bestätigungstexte für die kostenlosen Wege (Telefon, Preiseinschätzung). */
export const VS_BESTAETIGUNG_WEG = {
  telefon:
    'Ein Berater aus unserem Fachmarkt ruft dich an und bespricht dein Projekt mit dir. Kostenlos und unverbindlich.',
  preis:
    'Wir schätzen die Kosten anhand deiner Angaben grob ein und melden uns bei dir. Das verbindliche Angebot erstellen wir nach dem Aufmaß vor Ort.',
  zahlungNichtGestartet:
    'Deine Anfrage ist angekommen, die Zahlung konnte aber gerade nicht gestartet werden. Wir melden uns bei dir und vereinbaren das Aufmaß persönlich.',
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
  wegPflicht: 'Bitte wähle, wie es weitergehen soll.',
  aufmassNichtMoeglich: 'Für diesen Standort können wir das Aufmaß nicht online buchen.',
  strassePflicht: 'Bitte gib Straße und Hausnummer an, damit wir zum Aufmaß kommen können.',
  zahlartPflicht: 'Bitte wähle eine Zahlungsart.',
  widerrufPflicht: 'Bitte bestätige den Hinweis zum Widerrufsrecht.',
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
    'Verlegeservice anfragen: In wenigen Schritten erfassen wir Standort, Projekt und Altboden. Wir prüfen deine Angaben und melden uns persönlich.',
} as const
