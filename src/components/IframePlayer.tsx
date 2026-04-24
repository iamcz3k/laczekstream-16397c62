import { X } from "lucide-react";

type Provider = { id: string; label: string };

export function IframePlayer({
  src,
  title,
  onClose,
  providers,
  activeProvider,
  onProviderChange,
}: {
  src: string;
  title: string;
  onClose: () => void;
  providers?: Provider[];
  activeProvider?: string;
  onProviderChange?: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border glass">
        <h3 className="font-semibold truncate">{title}</h3>
        <div className="flex items-center gap-2">
          {providers && (
            <div className="hidden sm:inline-flex glass rounded-full p-1 text-xs">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onProviderChange?.(p.id)}
                  className={`px-3 py-1 rounded-full transition ${
                    p.id === activeProvider ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
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
      <div className="flex-1 bg-black">
        <iframe
          key={src}
          src={src}
          title={title}
          className="w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        />
      </div>
    </div>
  );
}
