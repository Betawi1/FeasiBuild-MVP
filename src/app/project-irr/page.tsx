"use client";

/**
 * Base Project IRR route: delegates to the full implementation in
 * `operational/preview/project-irr/page.tsx` (intact source of truth).
 *
 * `useStreamPrefix()` resolves the store stream from the URL (`/project-irr` → sale stream).
 */
export { default } from "../operational/preview/project-irr/page";
