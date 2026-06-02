import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Gauge, Loader2 } from "lucide-react";

export const Route = createFileRoute("/speedtest")({
  component: SpeedTest,
  head: () => ({
    meta: [
      { title: "Internet Speed Test — LACZEK STREAM" },
      { name: "description", content: "Quickly test your internet download speed." },
    ],
  }),
});

function SpeedTest() {
  const [running, setRunning] = useState(false);
  const [mbps, setMbps] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setMbps(null);
    setLatency(null);
    try {
      // Ping (small image)
      const t0 = performance.now();
      await fetch("https://www.google.com/favicon.ico?cb=" + Date.now(), { mode: "no-cors", cache: "no-store" });
      setLatency(Math.round(performance.now() - t0));

      // Download test: ~5MB image from a fast CDN with CORS.
      const url = "https://speed.cloudflare.com/__down?bytes=5000000&cb=" + Date.now();
      const start = performance.now();
      const res = await fetch(url, { cache: "no-store" });
      const buf = await res.arrayBuffer();
      const seconds = (performance.now() - start) / 1000;
      const bits = buf.byteLength * 8;
      setMbps(+(bits / seconds / 1_000_000).toFixed(2));
    } catch (e) {
      setError("Speed test failed. Check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link to="/" className="rounded-full bg-secondary p-2"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-xl font-black">Internet Speed Test</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="glass-card rounded-3xl p-8 text-center">
          <Gauge className="mx-auto h-14 w-14 text-primary" />
          <h2 className="mt-4 text-3xl font-black">{mbps !== null ? `${mbps} Mbps` : "Ready"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {latency !== null ? `Ping ${latency} ms` : "Tap below to measure download speed"}
          </p>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button
            onClick={run}
            disabled={running}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Testing…</> : "Start test"}
          </button>
          <p className="mt-6 text-xs text-muted-foreground">
            Uses Cloudflare's public speed endpoint. Results are approximate.
          </p>
        </div>
      </main>
    </div>
  );
}