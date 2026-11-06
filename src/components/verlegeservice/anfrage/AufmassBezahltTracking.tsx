'use client'

import { useEffect, useRef } from 'react'
import { trackAufmassBezahlt, type AufmassBezahlt } from '@/lib/tracking/verlegeservice-events'

/**
 * Feuert „Aufmaß gebucht" einmal pro Seitenaufruf. Die Seite rendert das nur,
 * wenn der Server die Zahlung bestätigt hat und es keine Testbestellung ist.
 */
export default function AufmassBezahltTracking(props: AufmassBezahlt) {
  const gesendet = useRef(false)
  useEffect(() => {
    if (gesendet.current) return
    gesendet.current = true
    trackAufmassBezahlt(props)
  }, [props])
  return null
}
