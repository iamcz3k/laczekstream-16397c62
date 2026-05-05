// User preferences stored in localStorage: name, default tab, theme, onboarding flags.
import type { TabKey } from "@/components/Header";

const KEY = "laczek:prefs";

export type Prefs = {
  name?: string;
  defaultTab?: TabKey;
  theme?: "dark" | "light";
  onboardedName?: boolean;
  onboardedTab?: boolean;
  language?: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPrefs(): Prefs {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
}

export function setPrefs(patch: Partial<Prefs>) {
  if (!isBrowser()) return;
  const next = { ...getPrefs(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("laczek:prefs-changed", { detail: next }));
}

export function onPrefsChange(cb: (p: Prefs) => void) {
  if (!isBrowser()) return () => {};
  const handler = () => cb(getPrefs());
  window.addEventListener("laczek:prefs-changed", handler);
  return () => window.removeEventListener("laczek:prefs-changed", handler);
}