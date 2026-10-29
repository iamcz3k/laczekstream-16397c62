// Local-only terms & privacy acceptance state. Acceptance is mirrored to the
// backend through the existing tracker so admins can see who accepted.
import { trackEvent } from "@/lib/tracker";

// Bump this when you want all existing users to re-accept the terms.
export const TERMS_VERSION = 1;
const KEY = "laczek:terms-accepted";

export function getAcceptedVersion(): number {
  if (typeof window === "undefined") return TERMS_VERSION;
  try {
    return Number(window.localStorage.getItem(KEY) || 0);
  } catch {
    return 0;
  }
}

export function hasAcceptedCurrent(): boolean {
  return getAcceptedVersion() >= TERMS_VERSION;
}

export function acceptTerms() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, String(TERMS_VERSION));
  } catch {}
  // Mirror to backend so admin can see who accepted and when.
  try {
    void trackEvent(`Accepted Terms v${TERMS_VERSION}`, "action", { version: TERMS_VERSION });
  } catch {}
  window.dispatchEvent(new CustomEvent("laczek:terms-accepted"));
}
