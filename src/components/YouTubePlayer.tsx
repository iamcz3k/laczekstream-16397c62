import { X, Download, MessageSquare } from "lucide-react";
import { useState } from "react";
import { downloadLinks, youtubeLiveChatUrl } from "@/lib/api";

export function YouTubePlayer({
  videoId,
  title,
  onClose,
  audioOnly = false,
  isLive = false,
}: {
  videoId: string;
  title: string;
  onClose: () => void;
  audioOnly?: boolean;
  isLive?: boolean;
}) {
  const [showDl, setShowDl] = useState(false);
  const [showChat, setShowChat] = useState(isLive);
  const links = downloadLinks(videoId);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // youtube.com (not -nocookie) is required for live broadcasts to play reliably
  const playerHost = isLive ? "https://www.youtube.com" : "https://www.youtube-nocookie.com";
  const embedSrc = `${playerHost}/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border glass">
        <h3 className="font-semibold truncate flex items-center gap-2">
          {isLive && (
            <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" /> Live
            </span>
          )}
          {title}
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <button
              onClick={() => setShowChat((v) => !v)}
              className={`hidden md:flex items-center gap-2 h-10 px-4 rounded-full text-sm font-medium transition ${
                showChat ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
            </button>
          )}
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

      <div className="flex-1 bg-black flex flex-col md:flex-row min-h-0">
        <div className={`${audioOnly ? "flex items-center justify-center p-6" : ""} flex-1 min-w-0`}>
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
                src={embedSrc}
                title={title}
                className="w-full h-20"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          ) : (
            <iframe
              key={videoId + (isLive ? "-live" : "")}
              src={embedSrc}
              title={title}
              className="w-full h-full min-h-[40vh]"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>
        {isLive && showChat && (
          <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-border bg-background flex flex-col h-[50vh] md:h-auto">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Live Chat
            </div>
            <iframe
              key={`chat-${videoId}`}
              src={youtubeLiveChatUrl(videoId)}
              title="Live chat"
              className="flex-1 w-full bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
