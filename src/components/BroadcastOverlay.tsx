import { useEffect, useRef, useState } from "react";
import { linkify } from "@/components/Linkify";
import { X, Star, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listMyBroadcasts, respondBroadcast } from "@/lib/broadcasts.functions";
import { getPrefs } from "@/lib/preferences";

type Item = {
  id: string;
  kind: "notification" | "question" | "review";
  message: string;
  target_name: string | null;
  image_url?: string | null;
  image_path?: string | null;
  created_at: string;
};

const SESSION_KEY_LS = "laczek:visitor:key";

function getSessionKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let k = localStorage.getItem(SESSION_KEY_LS);
    if (!k) {
      k = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(SESSION_KEY_LS, k);
    }
    return k;
  } catch {
    return null;
  }
}

export function BroadcastOverlay() {
  const list = useServerFn(listMyBroadcasts);
  const respond = useServerFn(respondBroadcast);
  const [items, setItems] = useState<Item[]>([]);
  const [answer, setAnswer] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<number | null>(null);

  async function poll() {
    const sk = getSessionKey();
    if (!sk) return;
    try {
      const name = getPrefs().name || null;
      const r = await list({ data: { session_key: sk, name } });
      setItems(r.items as Item[]);
    } catch {
      // Poll again shortly; popups should not break the current page.
    }
  }

  useEffect(() => {
    poll();
    pollRef.current = window.setInterval(poll, 2000);
    window.addEventListener("focus", poll);
    document.addEventListener("visibilitychange", poll);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      window.removeEventListener("focus", poll);
      document.removeEventListener("visibilitychange", poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = items[0];

  // reset per-popup state on item change
  useEffect(() => {
    setAnswer("");
    setRating(0);
    setHoverRating(0);
    setError(null);
    if (current?.id && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [current?.id]);

  if (!current) return null;

  const sk = getSessionKey();
  if (!sk) return null;
  const name = getPrefs().name || null;

  async function submit(opts: { dismissed?: boolean; text?: string; stars?: number }) {
    if (!current || !sk) return;
    setSending(true);
    try {
      await respond({
        data: {
          broadcast_id: current.id,
          session_key: sk,
          name,
          response_text: opts.text,
          rating: opts.stars,
          dismissed: opts.dismissed,
        },
      });
      // optimistically remove
      setItems((arr) => arr.filter((i) => i.id !== current.id));
    } catch (e) {
      setError((e as Error).message || "Could not send");
    } finally {
      setSending(false);
    }
  }

  const canClose = current.kind === "notification";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={canClose ? () => submit({ dismissed: true }) : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
      >
        {canClose && (
          <button
            aria-label="Dismiss"
            onClick={() => submit({ dismissed: true })}
            className="absolute right-3 top-3 rounded-full bg-secondary p-2 hover:bg-secondary/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-3">
          <span className="inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {current.kind === "notification"
              ? "Announcement"
              : current.kind === "question"
                ? "Quick question"
                : "Leave a review"}
          </span>
        </div>

        {current.image_url && (
          <img
            src={current.image_url}
            alt=""
            className="mb-3 max-h-64 w-full rounded-2xl object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        )}

        <p className="whitespace-pre-wrap text-base font-semibold leading-snug text-foreground">
          {linkify(current.message)}
        </p>

        {current.kind === "notification" && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={() => submit({ dismissed: true })}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Got it
            </button>
          </div>
        )}

        {current.kind === "question" && (
          <div className="mt-4 space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer…"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              disabled={sending || answer.trim().length === 0}
              onClick={() => submit({ text: answer.trim() })}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Send answer
            </button>
          </div>
        )}

        {current.kind === "review" && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hoverRating || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    className="p-1"
                  >
                    <Star
                      className={`h-8 w-8 transition ${filled ? "fill-yellow-400 stroke-yellow-400" : "stroke-muted-foreground"}`}
                    />
                  </button>
                );
              })}
            </div>
            <textarea
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Write your review (minimum 20 characters)…"
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {answer.trim().length}/20 characters
            </p>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              disabled={sending}
              onClick={() => {
                if (rating < 1) {
                  setError("Please pick a star rating.");
                  return;
                }
                if (answer.trim().length < 20) {
                  setError("Review must be at least 20 characters.");
                  return;
                }
                submit({ text: answer.trim(), stars: rating });
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Send review
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              This popup cannot be closed until your review is sent.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
