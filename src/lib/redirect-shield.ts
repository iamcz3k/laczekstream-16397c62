// Redirect Shield — protection against malicious popups and scripted top-level
// redirects from third-party players. We intentionally DO NOT sandbox iframes,
// because most stream providers refuse to play inside a sandboxed frame.
//
// What it still blocks (without breaking players):
//   • window.open() outside a real user-gesture window (popunders, scripted popups).
//   • <a> clicks pointing to known ad/redirect hosts.
//   • Scripted top-level navigation (location.assign/replace) to a foreign
//     origin without a recent user gesture.

const ALLOWED_TOP_HOSTS = [
  /(^|\.)laczekstream\.lovable\.app$/i,
  /(^|\.)lovable\.app$/i,
  /(^|\.)lovable\.dev$/i,
  /(^|\.)laczekstream\.com$/i,
];

const HARD_BLOCK_HOSTS = [
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)googlesyndication\.com$/i,
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
  /(^|\.)clickadu\.com$/i,
  /(^|\.)juicyads\.com$/i,
  /(^|\.)trafficstars\.com$/i,
  /(^|\.)bidvertiser\.com$/i,
  /(^|\.)highperformanceformat\.com$/i,
  /(^|\.)profitableratecpm\.com$/i,
  /(^|\.)displaynetwork-pro\.com$/i,
  /(^|\.)tsyndicate\.com$/i,
  /(^|\.)adskeeper\.com$/i,
];

const GESTURE_WINDOW_MS = 1200;
let lastGestureAt = 0;

function hostnameOf(value: string): string | null {
  try {
    return new URL(value, location.href).hostname || null;
  } catch {
    return null;
  }
}

function isHardBlocked(href: string) {
  const host = hostnameOf(href);
  if (!host) return false;
  return HARD_BLOCK_HOSTS.some((p) => p.test(host));
}

function hasRecentGesture() {
  return Date.now() - lastGestureAt < GESTURE_WINDOW_MS;
}

// Actively strip the sandbox attribute from iframes so legacy/cached code or
// third-party scripts can't lock down a player.
function unsandboxIframe(el: HTMLIFrameElement) {
  try {
    if (el.hasAttribute("sandbox")) el.removeAttribute("sandbox");
  } catch {
    /* noop */
  }
}

function installIframeUnshield() {
  document.querySelectorAll("iframe").forEach((n) => unsandboxIframe(n as HTMLIFrameElement));
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLIFrameElement) unsandboxIframe(node);
        else if (node instanceof HTMLElement) {
          node.querySelectorAll?.("iframe").forEach((n) => unsandboxIframe(n as HTMLIFrameElement));
        }
      });
      if (
        m.type === "attributes" &&
        m.attributeName === "sandbox" &&
        m.target instanceof HTMLIFrameElement
      ) {
        unsandboxIframe(m.target);
      }
    }
  });
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["sandbox"],
  });
}

function installWindowOpenShield() {
  const original = window.open?.bind(window);
  if (!original) return;
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = typeof url === "string" ? url : url?.toString() ?? "";
    if (isHardBlocked(href)) return null;
    if (!hasRecentGesture()) return null;
    return original(url as string, target, features);
  }) as typeof window.open;
}

function installClickShield() {
  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      if (isHardBlocked(href)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}

function isSameOrigin(href: string) {
  try {
    const u = new URL(href, location.href);
    if (u.origin === location.origin) return true;
    return ALLOWED_TOP_HOSTS.some((p) => p.test(u.hostname));
  } catch {
    return true;
  }
}

function installLocationShield() {
  try {
    const origAssign = window.location.assign.bind(window.location);
    const origReplace = window.location.replace.bind(window.location);
    window.location.assign = ((url: string | URL) => {
      const href = url?.toString() ?? "";
      if (isHardBlocked(href)) return;
      if (!hasRecentGesture() && !isSameOrigin(href)) return;
      return origAssign(url as string);
    }) as typeof window.location.assign;
    window.location.replace = ((url: string | URL) => {
      const href = url?.toString() ?? "";
      if (isHardBlocked(href)) return;
      if (!hasRecentGesture() && !isSameOrigin(href)) return;
      return origReplace(url as string);
    }) as typeof window.location.replace;
  } catch {
    /* noop */
  }
}

function installGestureTracker() {
  const mark = () => {
    lastGestureAt = Date.now();
  };
  ["pointerdown", "mousedown", "touchstart", "keydown"].forEach((ev) =>
    window.addEventListener(ev, mark, { capture: true, passive: true }),
  );
}

export function installRedirectShield() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __laczekRedirectShield?: boolean };
  if (w.__laczekRedirectShield) return;
  w.__laczekRedirectShield = true;

  installGestureTracker();
  installIframeUnshield();
  installWindowOpenShield();
  installClickShield();
  installLocationShield();
}
