import { X, Download } from "lucide-react";
import { useState } from "react";
import { downloadLinks } from "@/lib/api";

export function YouTubePlayer({
  videoId,
  title,
  onClose,
  audioOnly = false,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
  audioOnly?: boolean;
}) {
  const [showDl, setShowDl] = useState(false);
  const links = downloadLinks(videoId);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border glass">
        <h3 className="font-semibold truncate">{title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDl((v) => !v)}
            className="flex items-center gap-2 px-3 sm:px-4 h-10 rounded-full bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
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

      {showDl && (
        <div className="glass border-b border-border px-4 sm:px-6 py-3 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}

      <div className={`flex-1 bg-black ${audioOnly ? "flex items-center justify-center p-6" : ""}`}>
        {audioOnly ? (
          <div className="w-full max-w-2xl">
            <div className="aspect-square rounded-2xl overflow-hidden mb-4 glass-card">
              <img
                src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
            </div>
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0`}
              title={title}
              className="w-full h-20"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        ) : (
          <iframe
            key={videoId}
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
