import { useEffect, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Trash2,
  X,
  PlayCircle,
  AlertCircle,
  Check,
  Loader2,
  CloudDownload,
  ExternalLink,
  Film,
} from "lucide-react";
import { useDownloadsList } from "@/hooks/useDownloadsList";
import { downloadEngine, onDownloadProgress } from "@/lib/downloads";
import type { DownloadProgress, DownloadStatus } from "@/lib/downloads";
import { StorageMeter, formatBytes } from "./StorageMeter";
import { Progress } from "@/components/ui/progress";
import { downloadHistory, type DownloadHistoryItem } from "@/lib/download-history";

function fmtSpeed(bps: number) {
  return `${formatBytes(bps)}/s`;
}
function fmtEta(s: number) {
  if (!s || !isFinite(s)) return "—";
  if (s < 60) return `${Math.ceil(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

const STATUS_LABEL: Record<DownloadStatus, { label: string; tone: string }> = {
  queued: { label: "Queued", tone: "text-muted-foreground" },
  downloading: { label: "Downloading", tone: "text-primary" },
  paused: { label: "Paused", tone: "text-amber-400" },
  completed: { label: "Completed", tone: "text-emerald-400" },
  failed: { label: "Failed", tone: "text-destructive" },
  cancelled: { label: "Cancelled", tone: "text-muted-foreground" },
};

function BrowserDownloads({ history }: { history: DownloadHistoryItem[] }) {
  const browserControl = (action: "Pause" | "Resume") => {
    window.alert(`${action} this from your browser downloads panel.`);
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent downloads
        </h3>
        <button
          onClick={() => downloadHistory.clear()}
          className="text-[11px] font-semibold text-muted-foreground hover:text-destructive"
        >
          Clear
        </button>
      </div>
      <ul className="space-y-2">
        {history.map((h) => {
          const statusText =
            h.status === "completed"
              ? "Saved to device"
              : h.status === "started"
                ? "Started in browser"
                : h.status === "opened"
                  ? "Opened in browser"
                  : "Failed";

          return (
            <li key={h.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              {h.poster ? (
                <img
                  src={h.poster}
                  alt=""
                  className="h-16 w-12 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Film className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{h.title}</p>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {h.kind}
                  {h.season ? ` · S${h.season}` : ""}
                  {h.episode ? `E${h.episode}` : ""}
                  {" · "}
                  {new Date(h.created_at).toLocaleDateString()}
                </p>
                <p
                  className={`mt-0.5 text-[11px] font-semibold ${
                    h.status === "failed" ? "text-destructive" : "text-emerald-400"
                  }`}
                >
                  {statusText}
                </p>
                {h.size_bytes ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatBytes(h.size_bytes)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                {h.status === "started" && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => browserControl("Pause")}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1.5 text-[11px] font-semibold"
                      title="Pause in browser"
                    >
                      <Pause className="h-3 w-3" /> Pause
                    </button>
                    <button
                      onClick={() => browserControl("Resume")}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1.5 text-[11px] font-semibold"
                      title="Resume in browser"
                    >
                      <Play className="h-3 w-3" /> Resume
                    </button>
                  </div>
                )}
                <a
                  href={h.url}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                >
                  <ExternalLink className="h-3 w-3" /> Download
                </a>
                <button
                  onClick={() => downloadHistory.remove(h.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DownloadsTab() {
  const items = useDownloadsList();
  const [progressMap, setProgressMap] = useState<Record<string, DownloadProgress>>({});
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);

  useEffect(
    () =>
      onDownloadProgress((p) => {
        setProgressMap((prev) => ({ ...prev, [p.id]: p }));
      }),
    [],
  );

  useEffect(() => {
    const refresh = () => setHistory(downloadHistory.list());
    refresh();
    const onChange = () => refresh();
    window.addEventListener("laczek:download-history-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("laczek:download-history-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const playOffline = async (id: string) => {
    const url = await downloadEngine.getOfflineUrl(id);
    if (!url) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.title = "Offline playback";
    win.document.body.style.margin = "0";
    win.document.body.style.background = "#000";
    const v = win.document.createElement("video");
    v.src = url;
    v.controls = true;
    v.autoplay = true;
    v.style.width = "100vw";
    v.style.height = "100vh";
    win.document.body.appendChild(v);
  };

  const groups: Record<string, typeof items> = {
    Active: items.filter((i) => i.status === "downloading" || i.status === "queued"),
    Paused: items.filter((i) => i.status === "paused"),
    Failed: items.filter((i) => i.status === "failed"),
    Completed: items.filter((i) => i.status === "completed"),
  };

  return (
    <div className="space-y-5">
      <StorageMeter />

      {history.length > 0 && <BrowserDownloads history={history} />}

      {items.length === 0 && history.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <CloudDownload className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p className="text-sm">No downloads yet</p>
          <p className="mt-1 text-xs">Tap the download button on any title.</p>
        </div>
      )}

      {Object.entries(groups).map(([label, list]) =>
        list.length === 0 ? null : (
          <section key={label}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h3>
            <ul className="space-y-2">
              {list.map((m) => {
                const p = progressMap[m.id];
                const loaded = p?.loaded ?? m.bytes_downloaded;
                const total = p?.total || m.size_bytes;
                const pct = total ? Math.min(100, (loaded / total) * 100) : 0;
                const status = (p?.status ?? m.status) as DownloadStatus;
                const tone = STATUS_LABEL[status];
                return (
                  <li key={m.id} className="glass rounded-2xl p-3">
                    <div className="flex gap-3">
                      {m.poster_url ? (
                        <img
                          src={m.poster_url}
                          alt=""
                          className="h-20 w-14 flex-shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-20 w-14 flex-shrink-0 rounded-lg bg-secondary" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{m.title}</p>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {m.kind}
                              {m.season ? ` · S${m.season}` : ""}
                              {m.episode ? `E${m.episode}` : ""}
                            </p>
                          </div>
                          <span className={`text-[11px] font-bold ${tone.tone}`}>{tone.label}</span>
                        </div>

                        <Progress value={pct} className="mt-2 h-1.5" />
                        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                          <span>
                            {formatBytes(loaded)} / {formatBytes(total)}
                          </span>
                          <span>
                            {status === "downloading"
                              ? `${fmtSpeed(p?.speedBps ?? 0)} · ETA ${fmtEta(p?.etaSec ?? 0)}`
                              : `${pct.toFixed(0)}%`}
                          </span>
                        </div>
                        {status === "failed" && m.error && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                            <AlertCircle className="h-3 w-3" /> {m.error}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {status === "completed" && (
                            <button
                              onClick={() => playOffline(m.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
                            >
                              <PlayCircle className="h-3.5 w-3.5" /> Play
                            </button>
                          )}
                          {(status === "downloading" || status === "queued") && (
                            <button
                              onClick={() => downloadEngine.pause(m.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                            >
                              <Pause className="h-3.5 w-3.5" /> Pause
                            </button>
                          )}
                          {status === "paused" && (
                            <button
                              onClick={() => downloadEngine.resume(m.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                            >
                              <Play className="h-3.5 w-3.5" /> Resume
                            </button>
                          )}
                          {status === "failed" && (
                            <button
                              onClick={() => downloadEngine.retry(m.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> Retry
                            </button>
                          )}
                          {status !== "completed" && (
                            <button
                              onClick={() => downloadEngine.cancel(m.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                            >
                              <X className="h-3.5 w-3.5" /> Cancel
                            </button>
                          )}
                          {status === "completed" && (
                            <button
                              onClick={() => downloadEngine.remove(m.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          )}
                          {status === "queued" && (
                            <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                          {status === "completed" && (
                            <Check className="ml-1 h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}
    </div>
  );
}
