import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { X } from "lucide-react";

export function HlsPlayer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let hls: Hls | null = null;
    if (Hls.isSupported() && src.includes(".m3u8")) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    video.play().catch(() => {});
    return () => {
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-semibold truncate pr-4">{title}</h3>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
          aria-label="Close player"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 bg-black flex items-center justify-center">
        <video ref={ref} controls autoPlay playsInline className="w-full h-full" />
      </div>
    </div>
  );
}
