import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BroadcastOverlay } from "@/components/BroadcastOverlay";
import { ChangelogOverlay } from "@/components/ChangelogOverlay";
import { TourOverlay } from "@/components/TourOverlay";
import { TermsAcceptance } from "@/components/TermsAcceptance";
import { PaywallHost } from "@/components/Paywall";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LACZEK STREAM — Free Movies, TV, Football & YouTube" },
      { name: "description", content: "Stream free movies, live TV channels, football, YouTube and public CCTV cameras — clean matte-black player." },
      { name: "author", content: "LACZEK STREAM" },
      { name: "google-site-verification", content: "n3mCY5uBm3AEtedpZ3D4LDe5C4WvLnVjB9m5_y-eEP8" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "theme-color", content: "#ff8a3d" },
      { name: "application-name", content: "LACZEK STREAM" },
      { name: "apple-mobile-web-app-title", content: "LACZEK STREAM" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      { name: "keywords", content: "free movies, live TV, football streaming, anime, radio, podcasts, live sports, CCTV, YouTube, streaming" },
      { property: "og:site_name", content: "LACZEK STREAM" },
      { property: "og:locale", content: "en_US" },
      { property: "og:url", content: "https://laczekstream.lovable.app" },
      { property: "og:title", content: "LACZEK STREAM — Free Movies, TV, Football & YouTube" },
      { property: "og:description", content: "Stream free movies, live TV channels, football, YouTube and public CCTV cameras — clean matte-black player." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@laczekstream" },
      { name: "twitter:title", content: "LACZEK STREAM — Free Movies, TV, Football & YouTube" },
      { name: "twitter:description", content: "Stream free movies, live TV channels, football, YouTube and public CCTV cameras — clean matte-black player." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-192.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "LACZEK STREAM",
            alternateName: ["LaCzek Stream", "LaCzek", "Laczek Stream", "LACZEK"],
            url: "https://laczekstream.lovable.app/",
            inLanguage: "en",
            description: "Free movies, TV, football, anime, radio, podcasts & live CCTV.",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://laczekstream.lovable.app/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "LACZEK STREAM",
            alternateName: ["LaCzek Stream", "LaCzek"],
            url: "https://laczekstream.lovable.app/",
            logo: "https://laczekstream.lovable.app/icon-512.png",
          },
        ]),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.classList.remove('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [alert, setAlert] = useState<{ title: string; url: string } | null>(null);
  // Apply persisted theme + register the SW for match notifications (no-op in preview).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("laczek:prefs");
      const parsed = raw ? JSON.parse(raw) : {};
      const lang = parsed?.language;
      if (lang) document.documentElement.lang = lang;
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("light");
    } catch {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("light");
    }
    // Smart TV detection: large screens that match known TV UA tokens get a
    // dedicated "10-foot UI" treatment — bigger type, larger tap targets,
    // visible focus rings for D-pad navigation.
    try {
      const ua = navigator.userAgent || "";
      const tvUA = /SmartTV|SMART-TV|GoogleTV|Google TV|AppleTV|Apple TV|HbbTV|NetCast|VIERA|Tizen|Web0S|webOS|BRAVIA|AFT[A-Z0-9]|AFTS|AFTM|AFTT|AFTB|Roku|PlayStation|Xbox|Nintendo|DTV|InettvBrowser/i.test(ua);
      const bigScreen = typeof window !== "undefined" && window.innerWidth >= 1280 && window.matchMedia?.("(pointer: coarse), (pointer: none)").matches;
      const forced = new URLSearchParams(window.location.search).get("tv") === "1";
      if (tvUA || bigScreen || forced) document.documentElement.classList.add("tv-mode");
    } catch {}
    import("@/lib/notifications").then((m) => m.ensureSW()).catch(() => {});
    import("@/lib/adblock").then((m) => m.installSilentAdBlock()).catch(() => {});
    import("@/lib/redirect-shield").then((m) => m.installRedirectShield()).catch(() => {});
    import("@/lib/tracker").then((m) => m.startTracking()).catch(() => {});
    import("@/lib/general-settings").then((m) => m.applyGeneralSettings()).catch(() => {});
    import("@/lib/admin-v2-global").then((m) => m.hydrateGlobalOnce()).catch(() => {});

    function onAlert(e: Event) {
      const detail = (e as CustomEvent<{ title: string; url: string }>).detail;
      setAlert(detail);
      window.setTimeout(() => setAlert(null), 15000);
    }
    window.addEventListener("laczek:match-alert", onAlert as EventListener);
    // Auto language change handler
    function onLang(e: Event) {
      const detail = (e as CustomEvent<{ language: string }>).detail;
      if (detail?.language) {
        document.documentElement.lang = detail.language;
        // Hint the browser to translate the page (Chrome/Safari translate UI keys off lang).
        // Many embedded auto-translators read this attribute.
      }
    }
    window.addEventListener("laczek:prefs-changed", onLang as EventListener);
    return () => {
      window.removeEventListener("laczek:match-alert", onAlert as EventListener);
      window.removeEventListener("laczek:prefs-changed", onLang as EventListener);
    };
  }, []);
  return (
    <>
      <div role="status" aria-live="polite" className="w-full border-b border-white/10 bg-red-700 px-3 py-1.5 text-center text-xs font-medium leading-snug text-white">
        We are currently upgrading our platform and performing maintenance. Some features may be temporarily unavailable.
      </div>
      <Outlet />
      <BroadcastOverlay />
      <ChangelogOverlay />
      <TourOverlay />
      <TermsAcceptance />
      <PaywallHost />
      <Toaster />
      {null}
      {alert && (
        <div className="fixed bottom-4 left-1/2 z-[200] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-primary/40 bg-primary text-primary-foreground shadow-2xl">
          <a href={alert.url} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-sm">
              <p className="font-bold">⚽ {alert.title}</p>
              <p className="text-xs opacity-90">Match is starting now — tap to watch.</p>
            </div>
            <button onClick={(e) => { e.preventDefault(); setAlert(null); }} className="rounded-full bg-black/20 px-3 py-1 text-xs">Dismiss</button>
          </a>
        </div>
      )}
    </>
  );
}
