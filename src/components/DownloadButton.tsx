import { Download, Loader2, Pause, Play, RotateCcw, Check, X, Lock } from "lucide-react";
import { useDownload } from "@/hooks/useDownload";
import type { DownloadMeta } from "@/lib/downloads";
import { openPaywall, usePerk } from "@/lib/subscription";

export function DownloadButton({
  titleId,
  prepare,
}: {
  titleId: string;
  prepare: () => Promise<Omit<DownloadMeta, "bytes_downloaded" | "status" | "created_at" | "updated_at"> | null>;
}) {
  const { meta, progress, start, pause, resume, retry, cancel } = useDownload(titleId);
  const unlocked = usePerk("downloads");

  if (!unlocked) {
    return (
      <button
        onClick={() => openPaywall("downloads")}
        className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
      >
        <Lock className="h-3.5 w-3.5" /> Download · Premium
      </button>
    );
  }

  const pct = meta?.size_bytes
    ? Math.min(100, Math.round(((progress?.loaded ?? meta.bytes_downloaded) / meta.size_bytes) * 100))
    : 0;

  if (!meta) {
    return (
      <button
        onClick={async () => {
          const info = await prepare();
          if (info) await start(info);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
      >
        <Download className="h-3.5 w-3.5" /> Download
      </button>
    );
  }

  if (meta.status === "completed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-xs font-semibold text-primary">
        <Check className="h-3.5 w-3.5" /> Downloaded
      </span>
    );
  }
  if (meta.status === "downloading" || meta.status === "queued") {
    return (
      <button
        onClick={pause}
        className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold"
      >
        {meta.status === "queued" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
        {pct}%
      </button>
    );
  }
  if (meta.status === "paused") {
    return (
      <div className="inline-flex items-center gap-1">
        <button onClick={resume} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold">
          <Play className="h-3.5 w-3.5" /> Resume {pct}%
        </button>
        <button onClick={cancel} className="rounded-full bg-secondary p-2"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }
  if (meta.status === "failed") {
    return (
      <button onClick={retry} className="inline-flex items-center gap-2 rounded-full bg-destructive/20 px-4 py-2 text-xs font-semibold text-destructive">
        <RotateCcw className="h-3.5 w-3.5" /> Retry
      </button>
    );
  }
  return null;
}
