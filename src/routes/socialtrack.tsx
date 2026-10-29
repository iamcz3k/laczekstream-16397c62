import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LockKeyhole, RefreshCw, Save } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { socialList, socialUpdate, socialDelete } from "@/lib/social.functions";
import { SOCIAL_NETWORKS, SOCIAL_REASONS, SOCIAL_STATUSES, type SocialOrder } from "@/lib/social-shared";
import { ProgressBar, StatusBadge } from "@/components/SocialProgress";

export const Route = createFileRoute("/socialtrack")({
  head: () => ({
    meta: [
      { title: "LACZEK SOCIAL — Admin Tracker" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SocialAdmin,
});

const KEY = "laczek:social-pw";
const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

function SocialAdmin() {
  const [pw, setPw] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const list = useServerFn(socialList);

  useEffect(() => setPw(sessionStorage.getItem(KEY)), []);

  if (!pw) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <form className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await list({ data: { pw: typed } });
              sessionStorage.setItem(KEY, typed);
              setPw(typed);
            } catch {
              toast.error("Wrong password");
            }
          }}>
          <LockKeyhole className="h-7 w-7 text-primary" />
          <h1 className="text-xl font-bold">Social admin</h1>
          <p className="text-sm text-muted-foreground">The main /socialtrack route is admin-only.</p>
          <input autoFocus type="password" value={typed} onChange={(e) => setTyped(e.target.value)}
            placeholder="Password" className={input} />
          <button className="w-full rounded-lg bg-primary py-2 font-semibold text-primary-foreground">Enter</button>
        </form>
      </main>
    );
  }

  return <AdminConsole pw={pw} onLock={() => { sessionStorage.removeItem(KEY); setPw(null); }} />;
}

function AdminConsole({ pw, onLock }: { pw: string; onLock: () => void }) {
  const qc = useQueryClient();
  const list = useServerFn(socialList);
  const update = useServerFn(socialUpdate);
  const del = useServerFn(socialDelete);
  const q = useQuery({ queryKey: ["social-orders"], queryFn: () => list({ data: { pw } }), refetchInterval: 15000 });
  const [filter, setFilter] = useState("all");

  const orders = (q.data ?? []).filter((o) => filter === "all" || o.status === filter);

  async function save(o: SocialOrder) {
    try {
      await update({ data: { pw, id: o.id, patch: {
        platform: o.platform, service: o.service, target_url: o.target_url,
        quantity: o.quantity, delivered: o.delivered, status: o.status,
        reason: o.reason, network: o.network, customer: o.customer, note: o.note,
      } } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["social-orders"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.25em] text-primary">LACZEK SOCIAL</p><h1 className="mt-1 text-3xl font-black">Admin tracker</h1></div>
          <div className="flex gap-2">
            <a href="/socialtrack/DEMO" className="rounded-lg border border-border px-3 py-1.5 text-sm">Public tracker format</a>
            <button onClick={() => q.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button onClick={onLock} className="rounded-lg border border-border px-3 py-1.5 text-sm">Lock</button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-7">
          {["all", ...SOCIAL_STATUSES].map((status) => {
            const count = status === "all" ? (q.data ?? []).length : (q.data ?? []).filter((o) => o.status === status).length;
            return <button key={status} onClick={() => setFilter(status)} className={`rounded-xl border p-3 text-left ${filter === status ? "border-primary" : "border-border"} bg-card`}>
              <div className="text-xs uppercase text-muted-foreground">{status}</div><div className="text-xl font-bold">{count}</div>
            </button>;
          })}
        </div>

        {q.isLoading && <p className="text-muted-foreground">Loading…</p>}
        <div className="space-y-4">
          {(orders as SocialOrder[]).map((o) => <AdminOrder key={o.id} order={o} onSave={save} onDelete={async () => { if (confirm("Delete request?")) { await del({ data: { pw, id: o.id } }); q.refetch(); } }} />)}
          {!q.isLoading && !orders.length && <p className="text-sm text-muted-foreground">No requests.</p>}
        </div>
      </div>
    </main>
  );
}

function AdminOrder({ order, onSave, onDelete }: { order: SocialOrder; onSave: (o: SocialOrder) => void; onDelete: () => void }) {
  const [o, setO] = useState(order);
  const pct = Math.min(100, Math.round((o.delivered / Math.max(1, o.quantity)) * 100));

  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="font-mono text-sm font-bold">{o.code}</span>
          <span className="ml-2 font-semibold">{o.platform} · {o.service}</span>
          <p className="mt-1 break-all text-xs text-muted-foreground">{o.target_url}</p>
        </div>
        <div className="flex gap-2"><StatusBadge status={o.status} /><button onClick={onDelete} className="rounded-md border border-destructive px-2 py-1 text-xs text-destructive">Delete</button></div>
      </div>

      <ProgressBar delivered={o.delivered} quantity={o.quantity} />

      <div className="grid gap-2 md:grid-cols-4">
        <label className="text-xs text-muted-foreground">Progress ({pct}%)
          <input className={input} type="number" min={0} max={o.quantity} value={o.delivered} onChange={(e) => setO({ ...o, delivered: Math.min(o.quantity, Math.max(0, Number(e.target.value))) })} />
        </label>
        <label className="text-xs text-muted-foreground">Requested
          <input className={input} type="number" min={1} value={o.quantity} onChange={(e) => setO({ ...o, quantity: Math.max(1, Number(e.target.value)) })} />
        </label>
        <label className="text-xs text-muted-foreground">Status
          <select className={input} value={o.status} onChange={(e) => setO({ ...o, status: e.target.value })}>
            {SOCIAL_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Network
          <select className={input} value={o.network ?? "Global"} onChange={(e) => setO({ ...o, network: e.target.value })}>
            {SOCIAL_NETWORKS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <label className="text-xs text-muted-foreground">Reason shown publicly
          <select className={input} value={SOCIAL_REASONS.includes(o.reason as never) ? o.reason ?? "" : ""} onChange={(e) => setO({ ...o, reason: e.target.value || null })}>
            <option value="">Custom reason</option>
            {SOCIAL_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">Custom reason
          <input className={input} value={SOCIAL_REASONS.includes(o.reason as never) ? "" : o.reason ?? ""} onChange={(e) => setO({ ...o, reason: e.target.value || null })} placeholder="Write the public status message" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSave(o)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Save className="mr-1 inline h-4 w-4" />Save</button>
        <button onClick={() => onSave({ ...o, status: "processing" })} className="rounded-lg border border-border px-3 py-2 text-sm">Resume</button>
        <button onClick={() => onSave({ ...o, status: "paused" })} className="rounded-lg border border-border px-3 py-2 text-sm">Pause</button>
        <button onClick={() => onSave({ ...o, status: "completed", delivered: o.quantity })} className="rounded-lg border border-border px-3 py-2 text-sm">Complete</button>
      </div>
    </article>
  );
}
