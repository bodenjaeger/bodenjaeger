'use client';

import { createContext, useContext } from 'react';

/**
 * Läuft die Black-Weeks-Aktion? Der Wert kommt aus `isPromoActive()` in
 * layout.tsx (Server), weil `PROMO_END`/`PROMO_PREVIEW` im Browser fehlen.
 * Client-Komponenten wie die Produktkarte lesen ihn hier, ohne dass jede
 * Seite ihn als Prop durchreichen muss.
 */
const PromoContext = createContext(false);

export function PromoProvider({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <PromoContext.Provider value={active}>{children}</PromoContext.Provider>;
}

export function usePromoActive(): boolean {
  return useContext(PromoContext);
}
