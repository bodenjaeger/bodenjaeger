/**
 * Harmonisierte EU-Mitteilung zur gesetzlichen Gewährleistung
 * (Durchführungsverordnung (EU) 2025/1960, Anhang I).
 *
 * Die SVG ist die amtliche Datei der EU-Kommission und darf nicht verändert werden
 * (SHA-256 fd39364dbe42fa775ff55fb9b7aa80c377a5d04219929fef86a8522eed486b1a).
 * Deshalb nur als <img> einbinden – nicht inline, nicht über next/image-Optimierung:
 * Die Datei nutzt generische Klassen (.st0 …) und IDs, die mit dem Seiten-CSS kollidieren würden.
 */

const SVG_PATH = '/legal/gewaehrleistung-mitteilung-de.svg';
const DESCRIPTION_ID = 'gewaehrleistung-mitteilung-text';

export default function GewaehrleistungsMitteilung() {
  return (
    <div className="mb-6">
      <a href={SVG_PATH} target="_blank" rel="noopener" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- amtliche Datei, muss unverändert ausgeliefert werden */}
        <img
          src={SVG_PATH}
          width="595"
          height="842"
          alt="Harmonisierte EU-Mitteilung: Gesetzliche Gewährleistung"
          aria-describedby={DESCRIPTION_ID}
          className="block w-full h-auto"
        />
      </a>

      <div id={DESCRIPTION_ID} className="sr-only">
        <p>Gesetzliche Gewährleistung.</p>
        <p>
          Mindestens zwei Jahre gesetzliche Gewährleistung der Vertragsmäßigkeit für Waren, die in
          der Europäischen Union verkauft werden.
        </p>
        <p>
          Verbraucherinnen und Verbraucher können ihre Rechte im Rahmen des gesetzlichen
          Gewährleistungsrechts geltend machen, z. B. wenn die Waren nicht der Beschreibung
          entsprechen, nicht bestimmungsgemäß funktionieren.
        </p>
        <p>
          Verkäufer haften für jede Vertragswidrigkeit, die zum Zeitpunkt der Lieferung der Waren
          bestand und innerhalb des Zeitraums der gesetzlichen Gewährleistung erkennbar wird.
          Verkäufer müssen in solchen Fällen Folgendes anbieten: kostenlose Nachbesserung oder
          kostenlose Ersatzlieferung, in bestimmten Fällen eine Preisminderung oder eine vollständige
          Erstattung des Kaufpreises.
        </p>
        <p>
          In einigen Ländern gilt ein längerer Zeitraum für die gesetzliche Gewährleistung. Für
          gebrauchte Waren kann ein kürzerer Zeitraum gelten, jedoch nicht weniger als ein Jahr.
        </p>
        <p>
          Für weitere Informationen zu Ihren Rechten in einem bestimmten Land scannen Sie den
          nachstehenden QR-Code oder fragen Sie den Verkäufer.
        </p>
        <p>europa.eu/youreurope/garantien</p>
        <p>Was ist zu tun, wenn Sie vertragswidrige Waren erhalten?</p>
        <p>1. Melden Sie dem Verkäufer das Problem so bald wie möglich.</p>
        <p>
          2. Legen Sie einen Kaufnachweis vor, z. B. die Quittung, Rechnung oder einen Kontoauszug.
        </p>
        <p>
          Verkäufer und Hersteller können auch gewerbliche Garantien gewähren, die unabhängig von der
          gesetzlichen Gewährleistung gelten. Diese GARAN-Kennzeichnung zeigt beispielsweise, dass der
          Hersteller eine gewerbliche Haltbarkeitsgarantie ohne zusätzliche Kosten gewährt, die die
          gesamte Ware abdeckt.
        </p>
      </div>

      <p className="mt-3 text-sm text-dark">
        Weitere Informationen zu Ihren Gewährleistungsrechten:{' '}
        <a
          href="https://europa.eu/youreurope/garantien"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          europa.eu/youreurope/garantien
        </a>
      </p>
    </div>
  );
}
