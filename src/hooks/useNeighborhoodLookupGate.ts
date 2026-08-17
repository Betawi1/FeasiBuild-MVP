"use client";

import { useEffect, useRef, useState } from "react";
import { sendOpsAlert } from "@/lib/ops-monitor";
import { REVERSE_GEOCODE_TIMEOUT_MS } from "@/lib/reverse-geocode";

/**
 * Caps the "waiting for neighborhood" research gate at 8s.
 * On timeout, callers must proceed with city/country context (subMarket unset).
 */
export function useNeighborhoodLookupGate(
  coordinates: { lat: number; lng: number } | null | undefined,
  subMarket: string | undefined
): { waitingForNeighborhood: boolean; showCityLevelNotice: boolean } {
  const [timedOut, setTimedOut] = useState(false);
  const [showCityLevelNotice, setShowCityLevelNotice] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const coordKey = coordinates
    ? `${coordinates.lat.toFixed(6)},${coordinates.lng.toFixed(6)}`
    : "";

  useEffect(() => {
    startedAtRef.current = null;
    setTimedOut(false);
    setShowCityLevelNotice(false);
  }, [coordKey]);

  const waiting = Boolean(coordinates) && !subMarket?.trim() && !timedOut;

  useEffect(() => {
    if (!waiting) return;

    if (startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }

    const remaining = Math.max(
      0,
      REVERSE_GEOCODE_TIMEOUT_MS - (Date.now() - startedAtRef.current)
    );

    const timer = window.setTimeout(() => {
      const error = new Error(
        "Map neighborhood lookup timed out after 8s; proceeding with city-level context"
      );
      console.error(error);
      void sendOpsAlert(error, { source: "Map Neighborhood Lookup" });
      setShowCityLevelNotice(true);
      setTimedOut(true);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [waiting, coordKey]);

  return { waitingForNeighborhood: waiting, showCityLevelNotice };
}
