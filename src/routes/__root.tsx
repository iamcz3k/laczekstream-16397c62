import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
      { title: "LACZEK STREAM — Free Movies, TV, Football & Music" },
      { name: "description", content: "LACZEK STREAM: stream free movies, live TV, football and music — sleek, clean, no ads." },
      { name: "author", content: "LACZEK STREAM" },
      { property: "og:title", content: "LACZEK STREAM — Free Movies, TV, Football & Music" },
      { property: "og:description", content: "LACZEK STREAM: stream free movies, live TV, football and music — sleek, clean, no ads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "LACZEK STREAM — Free Movies, TV, Football & Music" },
      { name: "twitter:description", content: "LACZEK STREAM: stream free movies, live TV, football and music — sleek, clean, no ads." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ff1d4406-0346-47ec-9265-4c87ecf2d141/id-preview-1615ea0b--aa00440a-8748-4fa2-aefa-2305913f75e2.lovable.app-1777046110384.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ff1d4406-0346-47ec-9265-4c87ecf2d141/id-preview-1615ea0b--aa00440a-8748-4fa2-aefa-2305913f75e2.lovable.app-1777046110384.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
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
    import("@/lib/notifications").then((m) => m.ensureSW()).catch(() => {});
    // Silent ad / direct-link blocker
    import("@/lib/adblock").then((m) => m.installSilentAdBlock()).catch(() => {});
    // Visitor analytics tracker (V3 admin panel)
    import("@/lib/tracker").then((m) => m.startTracking()).catch(() => {});

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
      <Outlet />
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
