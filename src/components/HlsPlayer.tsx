import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { X, AlertCircle } from "lucide-react";

export function HlsPlayer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setError(null);
    let hls: Hls | null = null;

    const isM3u8 = src.includes(".m3u8");

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setError("This stream is unavailable or geo-blocked. Try another channel.");
        }
      });
    } else if (isM3u8 && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
    } else {
      video.src = src;
    }
    video.play().catch(() => {});
    return () => {
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border glass">
        <h3 className="font-semibold truncate pr-4">{title}</h3>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
          aria-label="Close player"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 bg-black flex items-center justify-center relative">
        <video ref={ref} controls autoPlay playsInline className="w-full h-full" />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center px-6">
              <AlertCircle className="w-10 h-10 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
