import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Crown, Lock, ShieldCheck, Sparkles, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { PERK_LABELS, PLANS, whatsappLink, type PerkKey } from "@/lib/subscription-shared";
import { Button } from "@/components/ui/button";
import {
  clearEntitlement,
  daysLeft,
  deviceLabel,
  getDeviceId,
  getEntitlement,
  setEntitlement,
  useEntitlement,
} from "@/lib/subscription";
import { checkSubStatus, redeemSubCode } from "@/lib/subscription.functions";

export function PaywallSheet({ reason, onClose }: { reason?: PerkKey; onClose: () => void }) {
  const ent = useEntitlement();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const left = daysLeft(ent);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function redeem() {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await redeemSubCode({
        data: { code: code.trim(), device_id: getDeviceId(), device_label: deviceLabel() },
      });
      setEntitlement({
        plan: res.plan as typeof ent.plan,
        code: res.code,
        expiresAt: res.expires_at,
        activatedAt: new Date().toISOString(),
      });
      toast.success(`Unlocked! ${res.devices_used}/${res.max_devices} devices used on this code.`);
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not activate that code");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl sm:rounded-lg sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Crown className="h-5 w-5 text-primary" /> LACZEK Premium
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {reason ? `${PERK_LABELS[reason]} is locked. Choose a plan to unlock it.` : "Compare every feature and choose your plan."}
            </p>
          </div>
          <Button onClick={onClose} aria-label="Close" variant="secondary" size="icon" className="rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {ent.plan !== "free" && (
          <div className="mb-4 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-xs">
            <p className="font-bold text-primary">
              Active: {PLANS.find((p) => p.id === ent.plan)?.name}
            </p>
            <p className="text-muted-foreground">
              {left === null ? "Never expires" : `${left} day${left === 1 ? "" : "s"} left`} · code {ent.code}
            </p>
            <Button
              onClick={() => {
                clearEntitlement();
                toast("Subscription removed from this device");
              }}
              variant="secondary"
              size="sm"
              className="mt-2 rounded-full"
            >
              Remove from this device
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {PLANS.map((plan) => {
            const active = ent.plan === plan.id || (plan.id === "free" && ent.plan === "free");
            return (
              <div
                key={plan.id}
                className={`rounded-lg border p-4 ${plan.highlight ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-base font-black">
                      {plan.name}{" "}
                      {active && <span className="ml-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">Current</span>}
                      {plan.highlight && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">Everything unlocked</span>}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black">{plan.price}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{plan.period}</p>
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase text-muted-foreground">Everything included</p>
                <ul className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.id !== "free" && (
                  <Button asChild className="mt-4 w-full rounded-full font-bold">
                    <a href={whatsappLink(plan)} target="_blank" rel="noopener">Subscribe</a>
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-border bg-secondary/40 p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Ticket className="h-4 w-4 text-primary" /> Have an activation code?
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Each code works on up to 3 devices and the time starts counting from activation.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LCZ-XXXXX-XXXXX"
              className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2 text-xs outline-none focus:border-primary"
            />
            <Button
              onClick={redeem}
              disabled={busy}
              className="rounded-full px-4 text-xs font-bold"
            >
              {busy ? "Checking…" : "Activate"}
            </Button>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Subscribe securely, then activate your code · {" "}
          <Sparkles className="h-3 w-3" /> instant activation
        </p>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(body, document.body) : null;
}

/** Mounted once in the root so any locked feature can open the sheet. */
export function PaywallHost() {
  const [state, setState] = useState<{ open: boolean; reason?: PerkKey }>({ open: false });
  // Re-check the stored code once per load so revoked/expired codes lock again.
  useEffect(() => {
    const ent = getEntitlement();
    if (!ent.code) return;
    checkSubStatus({ data: { code: ent.code, device_id: getDeviceId() } })
      .then((res) => {
        if (!res.valid) clearEntitlement();
        else
          setEntitlement({
            plan: res.plan as typeof ent.plan,
            code: ent.code,
            expiresAt: res.expires_at,
            activatedAt: ent.activatedAt,
          });
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: PerkKey }>).detail;
      setState({ open: true, reason: detail?.reason });
    };
    window.addEventListener("laczek:paywall", handler);
    return () => window.removeEventListener("laczek:paywall", handler);
  }, []);
  if (!state.open) return null;
  return <PaywallSheet reason={state.reason} onClose={() => setState({ open: false })} />;
}

/** Small padlock pill used on locked buttons/cards. */
export function LockPill({ label = "Premium" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
      <Lock className="h-3 w-3" /> {label}
    </span>
  );
}
