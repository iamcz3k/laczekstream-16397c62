import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { socialPublicCreate } from "@/lib/social.functions";
import { SOCIAL_PLATFORMS, SOCIAL_SERVICES } from "@/lib/social-shared";

export const Route = createFileRoute("/social")({
  head: () => ({
    meta: [
      { title: "LACZEK SOCIAL — Campaign Requests" },
      { name: "description", content: "Create a social campaign request and receive a public progress tracking link." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SocialPage,
});

const input = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm";

function SocialPage() {
  const create = useServerFn(socialPublicCreate);
  const [form, setForm] = useState({ platform: "TikTok", service: "Followers", target_url: "", quantity: 100 });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const order = await create({ data: { ...form, quantity: Number(form.quantity) } });
      setResult(order);
      toast.success("Request created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create request");
    } finally {
      setBusy(false);
    }
  }

  const trackingUrl = result && typeof window !== "undefined"
    ? `${window.location.origin}/socialtrack/${result.code}`
    : "";

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">LACZEK SOCIAL</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Social campaign requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Submit a target URL and requested metric. You will receive a unique public tracking link.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-5 rounded-3xl border border-border bg-card p-5 shadow-xl">
          <div>
            <label className="mb-2 block text-sm font-semibold">Platform</label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {SOCIAL_PLATFORMS.map((platform) => (
                <button key={platform} type="button" onClick={() => setForm({ ...form, platform })}
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold ${form.platform === platform ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  {platform}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-semibold">
            Metric
            <select className={`${input} mt-2`} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
              {SOCIAL_SERVICES.map((service) => <option key={service}>{service}</option>)}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Target URL
            <input required type="url" className={`${input} mt-2`} value={form.target_url}
              onChange={(e) => setForm({ ...form, target_url: e.target.value })}
              placeholder="https://www.tiktok.com/@account/video/..." />
          </label>

          <label className="block text-sm font-semibold">
            Requested amount
            <input required type="number" min={1} max={10000000} className={`${input} mt-2`} value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          </label>

          <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">
            {busy ? "Creating…" : "Create request"}
          </button>
        </form>

        {result && (
          <section className="mt-5 rounded-3xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 font-bold"><Check className="h-5 w-5 text-primary" /> Request created</div>
            <p className="mt-2 text-sm text-muted-foreground">Tracking code: <strong>{result.code}</strong></p>
            <div className="mt-4 flex gap-2">
              <input readOnly value={trackingUrl} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs" />
              <button type="button" onClick={() => { navigator.clipboard?.writeText(trackingUrl); toast.success("Tracking link copied"); }}
                className="rounded-xl border border-border px-3"><Copy className="h-4 w-4" /></button>
            </div>
            <a href={`/socialtrack/${result.code}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Open public tracker <ArrowUpRight className="h-4 w-4" />
            </a>
          </section>
        )}

        <div className="mt-7 flex gap-3 rounded-2xl border border-border bg-card/50 p-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <p>This module records requests and progress. It does not automate platform accounts or create artificial engagement.</p>
        </div>
      </div>
    </main>
  );
}
