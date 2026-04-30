import { useEffect, useMemo, useState } from "react";
import { Camera, Loader2, MapPin, Play, Search, X } from "lucide-react";
import { cctvCameras, type CctvCamera } from "@/lib/api";
import { HlsPlayer } from "./HlsPlayer";

export function CctvTab() {
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<CctvCamera | null>(null);

  useEffect(() => {
    cctvCameras()
      .then(setCameras)
      .catch(() => setCameras([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return cameras
      .filter((camera) => (query ? `${camera.name} ${camera.city ?? ""} ${camera.country ?? ""} ${camera.info ?? ""}`.toLowerCase().includes(query) : true))
      .slice(0, 300);
  }, [cameras, q]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search city or camera…"
          className="w-full rounded-full border-border glass py-3 pl-11 pr-4 transition focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((camera) => (
          <button
            key={`${camera.id}-${camera.url}`}
            onClick={() => setPlaying(camera)}
            className="group overflow-hidden rounded-[22px] glass-card text-left transition-all duration-300 hover:border-primary hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/50">
              {camera.thumbnail ? (
                <img
                  src={camera.thumbnail}
                  alt={`${camera.name} banner`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary">
                  <Camera className="h-10 w-10 text-muted-foreground transition group-hover:scale-110 group-hover:text-primary" />
                </div>
              )}
              <div className="absolute left-3 top-3 rounded-full glass px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">Live CCTV</div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/45 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                </span>
              </div>
            </div>
            <div className="space-y-2 p-4">
              <p className="line-clamp-2 text-sm font-bold leading-tight">{camera.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {camera.city || camera.country || "Public camera"}
              </p>
              {camera.info && <p className="line-clamp-1 text-xs text-muted-foreground">{camera.info}</p>}
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-20 text-center text-muted-foreground">No public CCTV cameras found.</p>}
      </div>

      {playing && (playing.isStreaming || /m3u8|mpd|playlist|manifest/i.test(playing.url) ? (
        <HlsPlayer src={playing.url} sources={[playing.url]} title={playing.name} onClose={() => setPlaying(null)} />
      ) : (
        <CctvFramePlayer camera={playing} onClose={() => setPlaying(null)} />
      ))}
    </div>
  );
}

function CctvFramePlayer({ camera, onClose }: { camera: CctvCamera; onClose: () => void }) {
  const [tick, setTick] = useState(0);
  const isImage = !camera.isIframe && /\.(jpe?g|png|webp|gif|bmp)(\?|$)/i.test(camera.url);

  useEffect(() => {
    if (!isImage) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 2500);
    return () => window.clearInterval(t);
  }, [isImage]);

  const refreshedUrl = isImage ? `${camera.url}${camera.url.includes("?") ? "&" : "?"}_=${tick}` : camera.url;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 border-b border-border glass px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="truncate pr-4 font-semibold">{camera.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{camera.city || camera.country || "Live CCTV"}{isImage ? " · refreshing every 2.5s" : ""}</p>
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-primary hover:text-primary-foreground" aria-label="Close CCTV player">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center bg-black">
        {camera.isIframe ? (
          <iframe src={camera.url} title={camera.name} className="h-full w-full border-0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : (
          <img src={refreshedUrl} alt={camera.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
        )}
      </div>
    </div>
  );
}