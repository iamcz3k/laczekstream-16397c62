import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Film, ShieldCheck, Zap } from "lucide-react";

const URL = "https://laczekstream.lovable.app/unblocked-movies";

export const Route = createFileRoute("/unblocked-movies")({
  component: UnblockedMoviesPage,
  head: () => ({
    meta: [
      { title: "Unblocked Movies — Watch Free at School or Work" },
      {
        name: "description",
        content:
          "Watch unblocked movies and TV shows free on LACZEK STREAM — clean, ad-free streaming that works on school and office networks. No signup, no popups.",
      },
      { property: "og:title", content: "Unblocked Movies — Free Streaming at School or Work" },
      {
        property: "og:description",
        content:
          "Stream unblocked movies and TV shows free on LACZEK STREAM — ad-free, instant play, works behind restricted networks.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Unblocked Movies — Watch Free at School or Work",
          description:
            "How to watch unblocked movies and TV shows free, with no ads, on restricted networks.",
          url: URL,
        }),
      },
    ],
  }),
});

function UnblockedMoviesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Link to="/" aria-label="Back to home" className="rounded-full bg-secondary p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-black tracking-tight">Unblocked Movies</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <section className="space-y-4">
          <h2 className="text-3xl font-black">Watch unblocked movies, free — anywhere</h2>
          <p className="text-muted-foreground">
            LACZEK STREAM is a clean, ad-free streaming hub that loads where other movie sites get
            blocked. No popups, no signup, no payment — just open the player and watch.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="glass-card rounded-2xl p-5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-bold">Network-friendly</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Loads on school and office Wi-Fi that block traditional streaming domains.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <Zap className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-bold">Zero ads</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A built-in silent ad-blocker keeps every player page free of popups and overlays.
            </p>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <Film className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-bold">Huge library</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Movies, TV shows, anime, live sports, radio and podcasts — all in one player.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-black">How to start watching</h2>
          <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
            <li>Open the homepage — no signup required.</li>
            <li>Pick a movie, series or live channel from the trending list.</li>
            <li>Tap a poster to launch the matte-black player.</li>
            <li>If a stream is slow, swap to another source from the side panel.</li>
          </ol>
        </section>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Start watching free →
          </Link>
        </div>
      </main>
    </div>
  );
}
