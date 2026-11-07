/* Ladeansicht der Kategorieseiten: erscheint sofort nach dem Klick (z. B. auf
   einen Chip der Schnellauswahl), bis die Produkte vom Server da sind.
   Aufbau wie die Kategorieseite: Überschrift, Filterleiste, Produktkacheln. */
export default function KategorieLaedt() {
  return (
    <div className="min-h-screen bg-pale" aria-busy="true" aria-live="polite">
      <div className="content-container py-8">
        <p className="sr-only">Produkte werden geladen …</p>
        <div className="mb-3 h-9 w-56 animate-pulse rounded-lg bg-ash sm:w-72" />
        <div className="mb-8 h-4 w-full max-w-xl animate-pulse rounded bg-ash/70" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-28 flex-shrink-0 animate-pulse rounded-full bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-white">
              <div className="aspect-square animate-pulse bg-ash/60" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-4/5 animate-pulse rounded bg-ash/70" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-ash/70" />
                <div className="h-6 w-1/3 animate-pulse rounded bg-ash" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
