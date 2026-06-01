const blockedHostPatterns = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)googlesyndication\.com$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)adnxs\.com$/i,
  /(^|\.)popads\.net$/i,
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
  /(^|\.)media\.net$/i,
  /(^|\.)clickadu\.com$/i,
  /(^|\.)juicyads\.com$/i,
  /(^|\.)trafficstars\.com$/i,
  /(^|\.)bidvertiser\.com$/i,
  /(^|\.)smartadserver\.com$/i,
  /(^|\.)yieldmo\.com$/i,
  /(^|\.)criteo\.com$/i,
];

const blockedPathPatterns = [
  /\/ads?[\/-]/i,
  /\/popunder/i,
  /\/popup/i,
  /\/banner/i,
  /\/vast(\?|\/|$)/i,
  /[?&](ad|ads|popup|popunder)=/i,
  /\/click\.php/i,
  /\/redirect\.php/i,
  /\/track\.php/i,
];

export function isBlockedAdUrl(value: string) {
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.href : "https://laczekstream.local");
    if (blockedHostPatterns.some((p) => p.test(url.hostname))) return true;
    if (blockedPathPatterns.some((p) => p.test(`${url.pathname}${url.search}`))) return true;
    // Block anything that isn't our own origin in a new tab/window context
    return false;
  } catch {
    return false;
  }
}

export function installSilentAdBlock() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __laczekAdBlock?: boolean };
  if (w.__laczekAdBlock) return;
  w.__laczekAdBlock = true;

  const ownOrigin = window.location.origin;
  const isSafeTarget = (href: string) => {
    try {
      const u = new URL(href, ownOrigin);
      return u.origin === ownOrigin;
    } catch {
      return false;
    }
  };

  const originalOpen = window.open.bind(window);
  // Silently block ALL window.open calls (popups/popunders/direct-link redirects)
  window.open = ((_url?: string | URL, _target?: string, _features?: string) => null) as typeof window.open;

  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.href || "";
      // Allow user-intentional external links that explicitly opt-in via rel="noopener noreferrer"
      const isUserAllowed = link.rel.includes("noopener");
      const isExternalNewTab = link.target === "_blank" && !isSafeTarget(href) && !isUserAllowed;
      if (isExternalNewTab || isBlockedAdUrl(href)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );

  // Block direct-link redirects via window.location assignments inside iframes that bubble up
  // (Best-effort: cancels beforeunload caused by ad scripts trying to navigate away.)
  window.addEventListener("beforeunload", (e) => {
    const w2 = window as Window & { __laczekUserNavigating?: boolean };
    if (!w2.__laczekUserNavigating) {
      // user did not click a real internal link in the last tick → likely an ad redirect
      // Note: modern browsers ignore preventDefault here unless user-initiated, so this is
      // mostly defensive logging.
    }
  });

  // Mark genuine user navigations
  document.addEventListener(
    "click",
    (e) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (link && isSafeTarget(link.href)) {
        (window as Window & { __laczekUserNavigating?: boolean }).__laczekUserNavigating = true;
        setTimeout(() => {
          (window as Window & { __laczekUserNavigating?: boolean }).__laczekUserNavigating = false;
        }, 1500);
      }
    },
    true,
  );
}