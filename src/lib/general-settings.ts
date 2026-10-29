// Local-only personal toggles. Stored in localStorage, applied as classes on
// <html> so the rest of the app + CSS can react. Never synced to the server.
import { useEffect, useState } from "react";

export type GeneralSettingKey =
  | "lightMode"
  | "reduceMotion"
  | "compactCards"
  | "hideFeaturedBanner"
  | "hideContinueWatching"
  | "hideRecommendedRow"
  | "hideFireBadges"
  | "hideWatchParty"
  | "hideDownloads"
  | "hideMatchChat"
  | "hideSurpriseMe"
  | "muteByDefault"
  | "soundEffects"
  | "autoplayNext"
  | "confirmDeletes";

export type GeneralSetting = {
  key: GeneralSettingKey;
  label: string;
  description: string;
  default: boolean;
};

export const GENERAL_SETTINGS: GeneralSetting[] = [
  { key: "lightMode", label: "Light mode", description: "Switch to a brighter color scheme", default: false },
  { key: "reduceMotion", label: "Reduce motion", description: "Disable animations and transitions", default: false },
  { key: "compactCards", label: "Compact cards", description: "Smaller posters, denser grid", default: false },
  { key: "hideFeaturedBanner", label: "Hide featured banner", description: "Remove the top banner on home", default: false },
  { key: "hideContinueWatching", label: "Hide Continue Watching", description: "Hide the resume strip", default: false },
  { key: "hideRecommendedRow", label: "Hide Recommended row", description: "Hide hand-picked picks on home", default: false },
  { key: "hideFireBadges", label: "Hide 🔥 Recommended badges", description: "Stop marking admin-recommended servers", default: false },
  { key: "hideWatchParty", label: "Hide Watch Party", description: "Hide the watch party menu entry", default: false },
  { key: "hideDownloads", label: "Hide Downloads", description: "Hide downloads entry & buttons", default: false },
  { key: "hideMatchChat", label: "Hide match chat", description: "Hide the chat tab on live sports", default: false },
  { key: "hideSurpriseMe", label: "Hide Surprise me", description: "Remove the random pick button", default: false },
  { key: "muteByDefault", label: "Mute players by default", description: "Start every player muted", default: false },
  { key: "soundEffects", label: "UI sound effects", description: "Tiny clicks and toasts", default: true },
  { key: "autoplayNext", label: "Auto-play next episode", description: "Continue to next when an episode ends", default: true },
  { key: "confirmDeletes", label: "Confirm before deleting", description: "Ask before clearing library/data", default: true },
];

const STORAGE_KEY = "laczek:general";

type State = Partial<Record<GeneralSettingKey, boolean>>;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getGeneralSettings(): Record<GeneralSettingKey, boolean> {
  const out = {} as Record<GeneralSettingKey, boolean>;
  for (const s of GENERAL_SETTINGS) out[s.key] = s.default;
  if (!isBrowser()) return out;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      for (const s of GENERAL_SETTINGS) {
        if (typeof parsed[s.key] === "boolean") out[s.key] = parsed[s.key] as boolean;
      }
    }
  } catch {}
  return out;
}

export function setGeneralSetting(key: GeneralSettingKey, value: boolean) {
  if (!isBrowser()) return;
  const next = { ...getGeneralSettings(), [key]: value };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyGeneralSettings();
  window.dispatchEvent(new CustomEvent("laczek:general-changed", { detail: next }));
}

export function resetGeneralSettings() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  applyGeneralSettings();
  window.dispatchEvent(new CustomEvent("laczek:general-changed", { detail: getGeneralSettings() }));
}

export function applyGeneralSettings() {
  if (typeof document === "undefined") return;
  const s = getGeneralSettings();
  const html = document.documentElement;
  const map: Record<GeneralSettingKey, string> = {
    lightMode: "gs-light",
    reduceMotion: "gs-reduce-motion",
    compactCards: "gs-compact",
    hideFeaturedBanner: "gs-hide-featured",
    hideContinueWatching: "gs-hide-continue",
    hideRecommendedRow: "gs-hide-recommended",
    hideFireBadges: "gs-hide-fire",
    hideWatchParty: "gs-hide-watchparty",
    hideDownloads: "gs-hide-downloads",
    hideMatchChat: "gs-hide-chat",
    hideSurpriseMe: "gs-hide-surprise",
    muteByDefault: "gs-mute-default",
    soundEffects: "gs-sound-on",
    autoplayNext: "gs-autoplay-next",
    confirmDeletes: "gs-confirm-deletes",
  };
  for (const k of Object.keys(map) as GeneralSettingKey[]) {
    html.classList.toggle(map[k], !!s[k]);
  }
}

export function useGeneralSettings() {
  const [state, setState] = useState<Record<GeneralSettingKey, boolean>>(() => getGeneralSettings());
  useEffect(() => {
    const handler = () => setState(getGeneralSettings());
    window.addEventListener("laczek:general-changed", handler);
    return () => window.removeEventListener("laczek:general-changed", handler);
  }, []);
  return state;
}

export function useGeneralSetting(key: GeneralSettingKey): boolean {
  return useGeneralSettings()[key];
}
