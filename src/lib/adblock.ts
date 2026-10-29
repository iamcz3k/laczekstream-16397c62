// Pop-under / click-under blocker. Smart mode: allows real user-gesture
// links/popups, blocks unsolicited window.open + known ad domains.
// Gated by admin feature flag `block_popups` (off by default).
import { supabase } from "@/integrations/supabase/client";

const blockedHostPatterns = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)adnxs\.com$/i,
  /(^|\.)popads\.net$/i,
  /(^|\.)popcash\.net$/i,
  /(^|\.)propellerads\.com$/i,
  /(^|\.)onclickads\.net$/i,
  /(^|\.)exoclick\.com$/i,
  /(^|\.)trafficjunky\.net$/i,
  /(^|\.)taboola\.com$/i,
  /(^|\.)outbrain\.com$/i,
  /(^|\.)hilltopads\.com$/i,
  /(^|\.)adcash\.com$/i,
  /(^|\.)adsterra\.com$/i,
  /(^|\.)mgid\.com$/i,
  /(^|\.)revcontent\.com$/i,
  /(^|\.)zedo\.com$/i,
  /(^|\.)clickadu\.com$/i,
  /(^|\.)juicyads\.com$/i,
  /(^|\.)trafficstars\.com$/i,
  /(^|\.)bidvertiser\.com$/i,
  /(^|\.)smartadserver\.com$/i,
  /(^|\.)yieldmo\.com$/i,
  /(^|\.)criteo\.com$/i,
  /(^|\.)popmyads\.com$/i,
  /(^|\.)adsnative\.com$/i,
  /(^|\.)adskeeper\.com$/i,
  /(^|\.)adsupply\.com$/i,
  /(^|\.)tsyndicate\.com$/i,
  /(^|\.)highperformanceformat\.com$/i,
  /(^|\.)profitableratecpm\.com$/i,
  /(^|\.)displaynetwork-pro\.com$/i,
];

const blockedPathPatterns = [
  /\/popunder/i,
  /\/popup/i,
  /\/vast(\?|\/|$)/i,
  /[?&](popup|popunder|pu_id|popunder_id)=/i,
  /\/click\.php/i,
  /\/redirect\.php/i,
  /\/track\.php/i,
];

function isBlockedAdUrl(value: string) {
  try {
    const url = new URL(
      value,
      typeof window !== "undefined" ? window.location.href : "https://laczekstream.local",
    );
    if (blockedHostPatterns.some((p) => p.test(url.hostname))) return true;
    if (blockedPathPatterns.some((p) => p.test(`${url.pathname}${url.search}`))) return true;
    return false;
  } catch {
    return false;
  }
}

// Track the last real user gesture; popups outside this window are unsolicited.
let lastGestureAt = 0;
const GESTURE_WINDOW_MS = 1000;

function installGestureTracker() {
  const mark = () => {
    lastGestureAt = Date.now();
  };
  ["pointerdown", "mousedown", "touchstart", "keydown"].forEach((ev) =>
    window.addEventListener(ev, mark, { capture: true, passive: true }),
  );
}

export function installSilentAdBlock() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __laczekAdBlock?: boolean };
  if (w.__laczekAdBlock) return;
  w.__laczekAdBlock = true;

  installGestureTracker();

  // Check admin flag; off by default. Re-check every 30s so toggle propagates.
  let enabled = false;
  const refresh = async () => {
    try {
      const { data } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("key", "block_popups")
        .maybeSingle();
      enabled = !!data?.enabled;
    } catch {
      // keep last value
    }
  };
  refresh();
  setInterval(refresh, 30_000);

  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (!enabled) return originalOpen(url as string, target, features);
    const href = typeof url === "string" ? url : url?.toString() ?? "";
    const hasGesture = Date.now() - lastGestureAt < GESTURE_WINDOW_MS;
    // Block if no user gesture (pop-under) OR known ad domain
    if (!hasGesture || isBlockedAdUrl(href)) return null;
    return originalOpen(url as string, target, features);
  }) as typeof window.open;

  document.addEventListener(
    "click",
    (event) => {
      if (!enabled) return;
      const link = (event.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!link) return;
      if (isBlockedAdUrl(link.href || "")) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}
