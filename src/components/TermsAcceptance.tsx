import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { acceptTerms, hasAcceptedCurrent, TERMS_VERSION } from "@/lib/terms";

/** Blocks the app with a one-time Terms + Privacy modal. Re-appears when
 *  TERMS_VERSION bumps so existing users see the new policy. */
export function TermsAcceptance() {
  const [needs, setNeeds] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setNeeds(!hasAcceptedCurrent());
  }, []);

  if (!needs) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-black">Welcome to LACZEK STREAM</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Before you continue, please read and accept our{" "}
          <Link to="/terms" className="text-primary underline" target="_blank">Terms of Use</Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-primary underline" target="_blank">Privacy Policy</Link>.
          We don't sell your data and we never ask for an email or password — we just want you to know how it all works.
        </p>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-3 text-sm cursor-pointer hover:border-primary">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            I have read and I accept the <strong>Terms of Use</strong> and the <strong>Privacy Policy</strong>.
          </span>
        </label>

        <button
          disabled={!checked}
          onClick={() => {
            acceptTerms();
            setNeeds(false);
          }}
          className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Accept & continue
        </button>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Version {TERMS_VERSION}. You'll only see this once unless we update the terms.
        </p>
      </div>
    </div>
  );
}
