import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  subAdminOverview,
  subCreateCode,
  subDeleteCode,
  subDeletePayment,
  subRevokeDevice,
  subSavePayment,
  subToggleCode,
} from "@/lib/subscription.functions";
import { planName, WHATSAPP_NUMBER } from "@/lib/subscription-shared";

export const Route = createFileRoute("/adminsub")({
  head: () => ({
    meta: [
      { title: "Subscriptions console — LACZEK STREAM" },
      { name: "description", content: "Issue activation codes and track subscription payments for LACZEK STREAM." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Subscriptions console — LACZEK STREAM" },
      { property: "og:description", content: "Issue activation codes and track subscription payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSub,
});

type Overview = Awaited<ReturnType<typeof subAdminOverview>>;

function AdminSub() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"codes" | "devices" | "payments">("codes");

  async function load(pw = password) {
    setBusy(true);
    setErr(null);
    try {
      const res = await subAdminOverview({ data: { password: pw } });
      setData(res);
      setAuthed(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setAuthed(false);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("laczek:subpw");
    if (saved) {
      setPassword(saved);
      void load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem("laczek:subpw", password);
            void load();
          }}
          className="w-full max-w-sm space-y-3 rounded-3xl border border-border bg-card p-6"
        >
          <h1 className="text-lg font-black">Subscriptions console</h1>
          <p className="text-xs text-muted-foreground">Enter the admin password to manage codes and payments.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button disabled={busy} className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  const t = data?.totals;

  return (
    <div className="min-h-screen bg-background p-4 pb-16 text-foreground">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Subscriptions</h1>
            <p className="text-xs text-muted-foreground">Codes, devices and payments · WhatsApp {WHATSAPP_NUMBER}</p>
          </div>
          <button onClick={() => void load()} className="rounded-full bg-secondary px-4 py-2 text-xs font-bold">
            Refresh
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Codes" value={String(t?.codes ?? 0)} />
          <Stat label="Active" value={String(t?.activeCodes ?? 0)} />
          <Stat label="Devices" value={String(t?.devices ?? 0)} />
          <Stat label="Collected" value={`$${(t?.paid ?? 0).toFixed(2)}`} />
          <Stat label="Pending" value={String(t?.pending ?? 0)} />
        </div>

        <div className="flex gap-2">
          {(["codes", "devices", "payments"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {tab === "codes" && <CodesTab data={data} password={password} reload={() => void load()} />}
        {tab === "devices" && <DevicesTab data={data} password={password} reload={() => void load()} />}
        {tab === "payments" && <PaymentsTab data={data} password={password} reload={() => void load()} />}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function CodesTab({ data, password, reload }: { data: Overview | null; password: string; reload: () => void }) {
  const [plan, setPlan] = useState<"noads" | "allaccess">("noads");
  const [days, setDays] = useState(30);
  const [devices, setDevices] = useState(3);
  const [qty, setQty] = useState(1);
  const [buyer, setBuyer] = useState("");
  const [contact, setContact] = useState("");
  const [made, setMade] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data?.redemptions ?? []) map.set(r.code_id, (map.get(r.code_id) ?? 0) + 1);
    return map;
  }, [data]);

  async function create() {
    setBusy(true);
    try {
      const res = await subCreateCode({
        data: {
          password,
          plan,
          duration_days: days,
          max_devices: devices,
          quantity: qty,
          buyer_name: buyer || undefined,
          buyer_contact: contact || undefined,
        },
      });
      setMade(res.codes);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-black">Generate activation codes</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Plan
            <select value={plan} onChange={(e) => setPlan(e.target.value as "noads" | "allaccess")} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground">
              <option value="noads">No Ads · $2</option>
              <option value="allaccess">All Access · $4.99</option>
            </select>
          </label>
          <Num label="Days (0 = never)" value={days} onChange={setDays} />
          <Num label="Max devices" value={devices} onChange={setDevices} />
          <Num label="Quantity" value={qty} onChange={setQty} />
          <Text label="Buyer name" value={buyer} onChange={setBuyer} />
          <Text label="Contact" value={contact} onChange={setContact} />
        </div>
        <button onClick={create} disabled={busy} className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "Generating…" : "Generate"}
        </button>
        {made.length > 0 && (
          <div className="mt-3 rounded-xl bg-secondary/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">New codes — send on WhatsApp</p>
            {made.map((c) => (
              <div key={c} className="flex items-center justify-between gap-2 py-1">
                <code className="text-sm font-bold">{c}</code>
                <button onClick={() => navigator.clipboard?.writeText(c)} className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold">Copy</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {(data?.codes ?? []).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">
                <code>{c.code}</code>{" "}
                <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px]">{planName(c.plan)}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {c.duration_days === 0 ? "Never expires" : `${c.duration_days} days`} · {usage.get(c.id) ?? 0}/{c.max_devices} devices
                {c.buyer_name ? ` · ${c.buyer_name}` : ""}
                {c.buyer_contact ? ` · ${c.buyer_contact}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await subToggleCode({ data: { password, id: c.id, active: !c.active } });
                  reload();
                }}
                className={`rounded-full px-3 py-1 text-[10px] font-bold ${c.active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
              >
                {c.active ? "Active" : "Disabled"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Delete ${c.code}?`)) return;
                  await subDeleteCode({ data: { password, id: c.id } });
                  reload();
                }}
                className="rounded-full bg-destructive/20 px-3 py-1 text-[10px] font-bold text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DevicesTab({ data, password, reload }: { data: Overview | null; password: string; reload: () => void }) {
  const codeById = new Map((data?.codes ?? []).map((c) => [c.id, c]));
  return (
    <div className="space-y-2">
      {(data?.redemptions ?? []).length === 0 && <p className="text-xs text-muted-foreground">No devices activated yet.</p>}
      {(data?.redemptions ?? []).map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
          <div>
            <p className="text-sm font-bold">
              <code>{codeById.get(r.code_id)?.code ?? "—"}</code> · {r.device_label ?? "Device"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {r.device_id} · activated {new Date(r.activated_at).toLocaleDateString()} ·{" "}
              {r.expires_at ? `expires ${new Date(r.expires_at).toLocaleDateString()}` : "never expires"}
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Free up this device slot?")) return;
              await subRevokeDevice({ data: { password, id: r.id } });
              reload();
            }}
            className="rounded-full bg-destructive/20 px-3 py-1 text-[10px] font-bold text-destructive"
          >
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab({ data, password, reload }: { data: Overview | null; password: string; reload: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [plan, setPlan] = useState<"noads" | "allaccess">("noads");
  const [amount, setAmount] = useState(2);
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState("MTN MoMo");
  const [status, setStatus] = useState<"pending" | "paid" | "refunded" | "failed">("paid");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-black">Record a payment</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Text label="Buyer" value={name} onChange={setName} />
          <Text label="Contact" value={contact} onChange={setContact} />
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Plan
            <select value={plan} onChange={(e) => setPlan(e.target.value as "noads" | "allaccess")} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground">
              <option value="noads">No Ads</option>
              <option value="allaccess">All Access</option>
            </select>
          </label>
          <Num label="Amount" value={amount} onChange={setAmount} />
          <Text label="Currency" value={currency} onChange={setCurrency} />
          <Text label="Method" value={method} onChange={setMethod} />
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground">
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </label>
        </div>
        <button
          onClick={async () => {
            await subSavePayment({
              data: {
                password,
                buyer_name: name || undefined,
                buyer_contact: contact || undefined,
                plan,
                amount,
                currency,
                method,
                status,
              },
            });
            setName("");
            setContact("");
            reload();
          }}
          className="mt-3 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground"
        >
          Save payment
        </button>
      </div>

      <div className="space-y-2">
        {(data?.payments ?? []).map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-bold">
                {p.currency} {Number(p.amount).toFixed(2)} · {planName(p.plan)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {p.buyer_name ?? "Anonymous"} {p.buyer_contact ? `· ${p.buyer_contact}` : ""} · {p.method ?? "—"} ·{" "}
                {new Date(p.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${p.status === "paid" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {p.status}
              </span>
              <button
                onClick={async () => {
                  if (!confirm("Delete this payment record?")) return;
                  await subDeletePayment({ data: { password, id: p.id } });
                  reload();
                }}
                className="rounded-full bg-destructive/20 px-3 py-1 text-[10px] font-bold text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
      />
    </label>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground"
      />
    </label>
  );
}
