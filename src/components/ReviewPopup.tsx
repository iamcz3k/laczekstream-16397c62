import { useEffect, useState } from "react";
import { Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureFlag } from "@/lib/feature-flags";
import { getPrefs } from "@/lib/preferences";

const DONE_KEY = "laczek:review:done";
const SESSION_START_KEY = "laczek:visitor:started_at";
const MIN_AGE_MS = 20 * 60 * 1000; // 20 minutes

function getOrSetStartedAt(): number {
  try {
    const raw = localStorage.getItem(SESSION_START_KEY);
    if (raw) return Number(raw) || Date.now();
    const now = Date.now();
    localStorage.setItem(SESSION_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function getSessionKey(): string {
  try { return localStorage.getItem("laczek:visitor:key") || ""; } catch { return ""; }
}

export function ReviewPopup() {
  const enabled = useFeatureFlag("reviews_enabled", true);
  const manualMode = useFeatureFlag("reviews_manual_mode", false);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DONE_KEY) === "1") return;
    const startedAt = getOrSetStartedAt();
    const sessionKey = getSessionKey();
    if (!sessionKey) return;

    let cancelled = false;
    const tryShow = async () => {
      if (cancelled) return;
      if (manualMode) {
        try {
          const { data } = await supabase
            .from("review_requests")
            .select("id")
            .eq("session_key", sessionKey)
            .eq("fulfilled", false)
            .limit(1);
          if (data?.length) setOpen(true);
        } catch {}
      } else {
        if (Date.now() - startedAt >= MIN_AGE_MS) setOpen(true);
      }
    };
    // First attempt after a short delay, then poll every 60s.
    const t1 = window.setTimeout(tryShow, 5000);
    const t2 = window.setInterval(tryShow, 60_000);
    return () => { cancelled = true; window.clearTimeout(t1); window.clearInterval(t2); };
  }, [enabled, manualMode]);

  if (!open) return null;

  async function send() {
    setError(null);
    if (rating < 1) { setError("Please pick a star rating"); return; }
    if (message.trim().length < 20) { setError("Please write at least 20 characters"); return; }
    setSubmitting(true);
    try {
      const prefs = getPrefs();
      const sessionKey = getSessionKey();
      const { error: insertError } = await supabase.from("site_reviews").insert({
        session_key: getSessionKey(),
        user_name: prefs.name || null,
        rating,
        message: message.trim(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      if (insertError) throw insertError;
      await supabase.from("review_requests").update({ fulfilled: true }).eq("session_key", sessionKey).eq("fulfilled", false);
      try { localStorage.setItem(DONE_KEY, "1"); } catch {}
      setOpen(false);
    } catch (e) {
      setError((e as Error).message || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl border border-border bg-popover p-6 shadow-2xl">
        <h3 className="text-xl font-black">Enjoying LACZEK STREAM?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Take 20 seconds to rate and review. It really helps us improve.</p>
        <div className="my-5 flex items-center justify-center gap-2">
          {[1,2,3,4,5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="transition active:scale-90"
              aria-label={`${n} stars`}
            >
              <Star className={`h-9 w-9 ${(hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Tell us what you think… (min 20 characters)"
          className="w-full resize-none rounded-2xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        <button
          onClick={send}
          disabled={submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send review"}
        </button>
        <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground">This appears once · thank you for the feedback</p>
      </div>
    </div>
  );
}