import { useMemo, useRef } from "react";
import { X, Expand, RefreshCw } from "lucide-react";

type Provider = { id: string; label: string };

async function enterLandscapeFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try {
    if (!document.fullscreenElement) await element.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    await orientation?.lock?.("landscape");
  } catch {}
}

export function IframePlayer({
  src,
  title,
  onClose,
  providers,
  activeProvider,
  onProviderChange,
  resolutions,
  activeResolution,
  onResolutionChange,
  sidebar,
}: {
  src: string;
  title: string;
  onClose: () => void;
  providers?: Provider[];
  activeProvider?: string;
  onProviderChange?: (id: string) => void;
  resolutions?: readonly string[];
  activeResolution?: string;
  onResolutionChange?: (value: string) => void;
  sidebar?: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeProviderLabel = useMemo(
    () => providers?.find((provider) => provider.id === activeProvider)?.label ?? "Auto",
    [providers, activeProvider],
  );

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border glass">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{activeProviderLabel} · embedded player</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onProviderChange?.(providers?.[0]?.id ?? activeProvider ?? "")}
            className="hidden sm:flex items-center gap-2 px-4 h-10 rounded-full glass text-sm text-muted-foreground hover:text-foreground transition"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button
            onClick={() => enterLandscapeFullscreen(containerRef.current)}
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

      <div className="px-4 sm:px-6 py-3 border-b border-border glass flex flex-col gap-3">
        {providers && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => onProviderChange?.(provider.id)}
                className={`px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition ${
                  provider.id === activeProvider ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
                }`}
              >
                {provider.label}
              </button>
            ))}
          </div>
        )}
        {resolutions && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {resolutions.map((resolution) => (
              <button
                key={resolution}
                onClick={() => onResolutionChange?.(resolution)}
                className={`px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition ${
                  resolution === activeResolution ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
                }`}
              >
                {resolution}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 bg-black flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 min-h-[45vh] lg:min-h-0">
          <iframe
            key={`${src}-${activeResolution ?? "auto"}`}
            src={src}
            title={title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
        {sidebar ? <div className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l border-border bg-background/80 overflow-auto">{sidebar}</div> : null}
      </div>
    </div>
  );
}
