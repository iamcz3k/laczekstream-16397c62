import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, AlertCircle, SkipForward, Expand } from "lucide-react";

async function enterLandscapeFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try {
    if (!document.fullscreenElement) await element.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    await orientation?.lock?.("landscape");
  } catch {}
}

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
  const shellRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const allSources = sources && sources.length > 0 ? Array.from(new Set(sources)) : [src];
  const [idx, setIdx] = useState(0);
  const current = allSources[Math.min(idx, allSources.length - 1)];

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let hls: Hls | null = null;
    setError(null);
    video.pause();
    video.removeAttribute("src");
    video.load();

    const isHlsSource = /m3u8|playlist|manifest/i.test(current);
    const tryNextSource = () => {
      if (idx + 1 < allSources.length) {
        setIdx((value) => Math.min(value + 1, allSources.length - 1));
      } else {
        setError("This channel is not responding right now. Try another one.");
      }
    };

    if (isHlsSource && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 20,
        backBufferLength: 10,
      });
      hls.loadSource(current);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          tryNextSource();
          return;
        }
        setError("This channel is not responding right now. Try another one.");
      });
    } else {
      video.src = current;
      video.play().catch(() => tryNextSource());
    }

    video.onerror = () => tryNextSource();
    return () => {
      video.onerror = null;
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
    <div ref={shellRef} className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border glass gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold truncate pr-4">{title}</h3>
          {allSources.length > 1 && (
            <p className="text-xs text-muted-foreground mt-1">Source {idx + 1} of {allSources.length}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            onClick={() => enterLandscapeFullscreen(shellRef.current)}
            className="flex items-center gap-2 px-3 sm:px-4 h-10 rounded-full glass text-sm hover:bg-primary hover:text-primary-foreground transition"
          >
            <Expand className="w-4 h-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
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
