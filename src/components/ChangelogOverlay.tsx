import { useEffect, useState } from "react";
import { linkify } from "@/components/Linkify";
import { X, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listChangelog } from "@/lib/changelog-admin.functions";

type Item = {
  id: string;
  kind: "new" | "fix" | "improved" | "soon";
  title: string;
  detail: string | null;
  image_url?: string | null;
  published_at: string;
};

const SEEN_KEY = "laczek:changelog:seen";

function getSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveSeen(set: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set).slice(-200)));
  } catch {}
}

const KIND_STYLES: Record<Item["kind"], { label: string; cls: string }> = {
  new: { label: "NEW", cls: "bg-primary text-primary-foreground" },
  fix: { label: "FIX", cls: "bg-emerald-500 text-white" },
  improved: { label: "IMPROVED", cls: "bg-blue-500 text-white" },
  soon: { label: "SOON", cls: "bg-amber-500 text-white" },
};

export function ChangelogOverlay() {
  const fetcher = useServerFn(listChangelog);
  const [unseen, setUnseen] = useState<Item[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetcher();
        if (cancelled) return;
        const seen = getSeen();
        const fresh = (res.items as Item[]).filter((i) => !seen.has(i.id));
        setUnseen(fresh);
      } catch {}
    }
    // Short delay so it doesn't fight the first-paint of the home screen.
    const t = window.setTimeout(run, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [fetcher]);

  if (dismissed || unseen.length === 0) return null;

  function close() {
    const seen = getSeen();
    unseen.forEach((i) => seen.add(i.id));
    saveSeen(seen);
    setDismissed(true);
  }

  return (
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <button
          aria-label="Dismiss"
          onClick={close}
          className="absolute right-3 top-3 z-10 rounded-full bg-secondary p-2 transition hover:bg-primary hover:text-primary-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight">What's new</h3>
              <p className="text-[11px] text-muted-foreground">
                {unseen.length} update{unseen.length === 1 ? "" : "s"} you haven't seen
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {unseen.map((c) => {
            const style = KIND_STYLES[c.kind] ?? KIND_STYLES.new;
            return (
              <div key={c.id} className="overflow-hidden rounded-2xl border border-border bg-secondary/40">
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt=""
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="block max-h-64 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${style.cls}`}>
                      {style.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-bold">{linkify(c.title)}</p>
                  {c.detail && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{linkify(c.detail)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={close}
            className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
