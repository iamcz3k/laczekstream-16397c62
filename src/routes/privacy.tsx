import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — LACZEK STREAM" },
      { name: "description", content: "How LACZEK STREAM handles your data, cookies, analytics and third-party streaming providers." },
      { property: "og:title", content: "Privacy Policy — LACZEK STREAM" },
      { property: "og:description", content: "How LACZEK STREAM handles your data, cookies and analytics." },
      { property: "og:url", content: "https://laczekstream.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://laczekstream.lovable.app/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 22, 2026</p>

        <div className="prose prose-invert mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-bold">1. Who we are</h2>
            <p>LACZEK STREAM is a free entertainment aggregator built by LACZEK TITUS. We don't sell your data and we don't run third-party ads on the site.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">2. What we store</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Your display name</strong> (only what you type in setup) — stored on your device.</li>
              <li><strong>Preferences</strong> — theme, default tab, language, personal toggles — stored on your device.</li>
              <li><strong>Library data</strong> — watchlist, history, continue-watching, downloads index — stored on your device.</li>
              <li><strong>Anonymous session analytics</strong> — visit count, page paths, items watched, device type, and approximate country/city derived from your IP. Used so the developer can keep the service running and improve it.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold">3. What we don't collect</h2>
            <p>No email, no phone number, no password, no payment info. We never ask for it because we never need it.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">4. Third-party content</h2>
            <p>Streams (movies, TV, live sports, anime and radio) are delivered by external content delivery networks. When you press play, that network can see your IP address and basic browser information — that is how streaming works. We do not control their privacy practices.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">5. Cookies & storage</h2>
            <p>We use <code>localStorage</code> on your device for your preferences, library and a single anonymous session ID. No advertising cookies.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">6. Your choices</h2>
            <p>Clear your browser storage at any time and the local data is gone. Email <a className="text-primary underline" href="mailto:wa.me/256704232796">the developer on WhatsApp</a> to request removal of any backend record tied to your visitor session.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">7. Children</h2>
            <p>LACZEK STREAM is not directed at children under 13. If you are a parent and believe a child has used the service, contact us and we will delete any tied session data.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">8. Changes</h2>
            <p>If this policy changes materially, you'll see the updated terms screen the next time you open the app.</p>
          </section>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          See also: <Link to="/terms" className="text-primary underline">Terms of Use</Link>
        </p>
      </main>
    </div>
  );
}
