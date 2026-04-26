import { useRef } from "react";
import { Expand, Shield, X } from "lucide-react";

async function enterLandscapeFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try {
    if (!document.fullscreenElement) await element.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    await orientation?.lock?.("landscape");
  } catch {}
}

export function FootballStreamPlayer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const shellRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={shellRef} className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" /> External stream isolated in player
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => enterLandscapeFullscreen(shellRef.current)}
            className="flex h-10 items-center gap-2 rounded-full glass px-3 text-sm transition hover:bg-primary hover:text-primary-foreground sm:px-4"
          >
            <Expand className="h-4 w-4" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-primary hover:text-primary-foreground"
            aria-label="Close football stream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-black">
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}