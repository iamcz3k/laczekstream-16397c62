import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Use — LACZEK STREAM" },
      { name: "description", content: "Terms of Use for LACZEK STREAM — free entertainment aggregator." },
      { property: "og:title", content: "Terms of Use — LACZEK STREAM" },
      { property: "og:description", content: "Rules for using LACZEK STREAM." },
      { property: "og:url", content: "https://laczekstream.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://laczekstream.lovable.app/terms" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: June 22, 2026</p>

        <div className="prose prose-invert mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-xl font-bold">1. What LACZEK STREAM is</h2>
            <p>LACZEK STREAM is a free entertainment aggregator. It does not host any video, audio, or stream — it links to third-party providers. All copyrights belong to the original rights holders.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">2. Acceptable use</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be 13 or older to use the service.</li>
              <li>Don't try to break, scrape, or overload the app.</li>
              <li>Don't use the app to harass other people in chats or comments.</li>
              <li>Don't pretend to be the developer or an admin.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-bold">3. No warranty</h2>
            <p>The service is provided "as is" with no guarantees. Streams may go down, fail, or contain errors out of our control. We're not liable for what third-party providers serve.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">4. Your account</h2>
            <p>Your "account" is just a name and preferences stored on your device. You're responsible for the device you use. Clearing storage signs you out.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">5. DMCA & content removal</h2>
            <p>If you are a rights holder and a third-party link in LACZEK STREAM points to your content, contact the developer on WhatsApp and we will remove the link from the index.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">6. Changes to these terms</h2>
            <p>We can update these terms. When we do, you'll see a one-time acceptance screen the next time you open the app.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold">7. Privacy</h2>
            <p>See our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for how we handle data.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
