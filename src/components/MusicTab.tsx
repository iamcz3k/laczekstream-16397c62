import { useEffect, useState } from "react";
import { Loader2, Search, Play, Radio, Music2, Video, Users, Download } from "lucide-react";
import { ytSearch, downloadLinks, FEATURED_CREATORS, type YTItem } from "@/lib/api";
import { YouTubePlayer } from "./YouTubePlayer";

type Mode = "audio" | "video" | "live" | "creators";

const MODES: { id: Mode; label: string; icon: React.ComponentType<{ className?: string }>; placeholder: string }[] = [
  { id: "audio", label: "Music Audio", icon: Music2, placeholder: "Search songs, artists…" },
  { id: "video", label: "Music Video", icon: Video, placeholder: "Search music videos…" },
  { id: "live", label: "Live Streams", icon: Radio, placeholder: "Search live streams…" },
  { id: "creators", label: "Creators", icon: Users, placeholder: "Filter creators…" },
];

export function MusicTab() {
  const [items, setItems] = useState<YTItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("audio");
  const [playing, setPlaying] = useState<{ id: string; title: string; audioOnly: boolean; isLive: boolean } | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);

  async function run(query: string, m: Mode, channelId?: string | null) {
    setLoading(true);
    try {
      if (m === "audio") {
        setItems(await ytSearch(`${query} official audio`, { videoCategoryId: "10", max: 24 }));
      } else if (m === "video") {
        setItems(await ytSearch(`${query} official music video`, { videoCategoryId: "10", max: 24 }));
      } else if (m === "live") {
        // Use a popular live-streaming query when the user hasn't typed anything
        const liveQuery = query?.trim() ? query : "live now";
        setItems(await ytSearch(liveQuery, { eventType: "live", max: 24 }));
      } else if (m === "creators") {
        if (channelId) {
          setItems(await ytSearch("", { channelId, max: 24 }));
        } else {
          setItems([]);
        }
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode === "creators") {
      if (creatorId) run("", "creators", creatorId);
      else setItems([]);
      return;
    }
    const defaults: Record<Mode, string> = {
      audio: "top hits 2025",
      video: "top music videos 2025",
      live: "live now",
      creators: "",
    };
    run(defaults[mode], mode);
  }, [mode, creatorId]);

  const currentMode = MODES.find((x) => x.id === mode)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                setQ("");
                setCreatorId(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                mode === m.id ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {mode === "creators" ? (
        <div className="flex flex-wrap gap-2">
          {FEATURED_CREATORS.map((c) => (
            <button
              key={c.channelId}
              onClick={() => setCreatorId(c.channelId)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                creatorId === c.channelId ? "bg-primary text-primary-foreground" : "glass-card text-foreground hover:border-primary"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) run(q, mode);
          }}
          className="relative max-w-xl"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={currentMode.placeholder}
            className="w-full pl-11 pr-4 py-3 rounded-full glass border-border focus:border-primary focus:outline-none"
          />
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const isLive = it.liveBroadcastContent === "live";
            return (
              <div
                key={it.videoId}
                className="group flex gap-3 p-3 rounded-xl glass-card hover:border-primary hover:shadow-[var(--shadow-glow)] transition"
              >
                <button
                  onClick={() =>
                    setPlaying({
                      id: it.videoId,
                      title: it.title,
                      audioOnly: mode === "audio",
                      isLive: mode === "live" || it.liveBroadcastContent === "live",
                    })
                  }
                  className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted"
                >
                  {it.thumbnail && <img src={it.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />}
                  {isLive && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-current animate-pulse" /> Live
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary" fill="currentColor" />
                  </div>
                </button>
                <div className="min-w-0 flex-1 py-1 flex flex-col">
                  <button
                    onClick={() =>
                      setPlaying({
                        id: it.videoId,
                        title: it.title,
                        audioOnly: mode === "audio",
                        isLive: mode === "live" || it.liveBroadcastContent === "live",
                      })
                    }
                    className="text-left"
                  >
                    <p className="text-sm font-medium line-clamp-2">{it.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{it.channelTitle}</p>
                  </button>
                  <div className="flex-1" />
                  <DownloadMenu videoId={it.videoId} />
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-20">
              {mode === "creators" && !creatorId ? "Pick a creator above to load their videos." : "Search to discover content."}
            </p>
          )}
        </div>
      )}

      {playing && (
        <YouTubePlayer
          videoId={playing.id}
          title={playing.title}
          audioOnly={playing.audioOnly}
          isLive={playing.isLive}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}

function DownloadMenu({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const links = downloadLinks(videoId);
  return (
    <div className="relative mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition"
      >
        <Download className="w-3 h-3" /> Download
      </button>
      {open && (
        <div className="absolute z-20 right-0 bottom-full mb-2 w-44 glass-card rounded-lg p-1 shadow-[var(--shadow-card)]">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-xs rounded-md hover:bg-primary hover:text-primary-foreground transition"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
