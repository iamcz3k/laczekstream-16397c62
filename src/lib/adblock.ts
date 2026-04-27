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
];

const blockedPathPatterns = [/\/ads?[\/-]/i, /\/popunder/i, /\/banner/i, /\/vast(\?|\/|$)/i, /[?&](ad|ads|popup|popunder)=/i];

export function isBlockedAdUrl(value: string) {
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.href : "https://laczekstream.local");
    return blockedHostPatterns.some((pattern) => pattern.test(url.hostname)) || blockedPathPatterns.some((pattern) => pattern.test(`${url.pathname}${url.search}`));
  } catch {
    return false;
  }
}

export function installSilentAdBlock() {
  if (typeof window === "undefined") return;
  const w = window as Window & { __laczekAdBlock?: boolean };
  if (w.__laczekAdBlock) return;
  w.__laczekAdBlock = true;

  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = typeof url === "string" ? url : url?.toString() ?? "";
    if (!href || isBlockedAdUrl(href) || target === "_blank") return null;
    return originalOpen(href, target, features);
  }) as typeof window.open;

  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      if (link.target === "_blank" || isBlockedAdUrl(link.href)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );
}