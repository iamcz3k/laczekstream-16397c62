import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, AlertCircle, SkipForward } from "lucide-react";

export function HlsPlayer({
  src,
  sources,
  title,
  onClose,
}: {
  src: string;
  sources?: string[];
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const allSources = sources && sources.length > 0 ? sources : [src];
  const [idx, setIdx] = useState(0);
  const current = allSources[Math.min(idx, allSources.length - 1)];

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setError(null);
    let hls: Hls | null = null;

    const isM3u8 = current.includes(".m3u8");

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 30 });
      hls.loadSource(current);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          // Auto-advance to next source if available
          if (idx + 1 < allSources.length) {
            setIdx(idx + 1);
          } else {
            setError(
              "All available stream URLs failed for this channel. It may be geo-blocked from your region or temporarily offline.",
            );
          }
        }
      });
    } else if (isM3u8 && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = current;
    } else {
      video.src = current;
    }
    video.play().catch(() => {});
    return () => {
      hls?.destroy();
    };
  }, [current, idx, allSources]);

  const tryNext = () => {
    if (idx + 1 < allSources.length) {
      setIdx(idx + 1);
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border glass">
        <h3 className="font-semibold truncate pr-4">
          {title}
          {allSources.length > 1 && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              Source {idx + 1}/{allSources.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {allSources.length > 1 && (
            <button
              onClick={tryNext}
              disabled={idx + 1 >= allSources.length}
              className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-full glass text-sm hover:bg-primary hover:text-primary-foreground disabled:opacity-40 transition"
            >
              <SkipForward className="w-4 h-4" /> Next source
            </button>
          )}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
            aria-label="Close player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 bg-black flex items-center justify-center relative">
        <video ref={ref} controls autoPlay playsInline className="w-full h-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center px-6">
              <AlertCircle className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground max-w-sm mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium"
              >
                Pick another channel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
