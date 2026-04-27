import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { installSilentAdBlock } from "@/lib/adblock";

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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    installSilentAdBlock();
  }, []);

  return <Outlet />;
}
