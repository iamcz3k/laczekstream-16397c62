import { useEffect, useState } from "react";
import { Loader2, Search, Play } from "lucide-react";
import { ytSearch } from "@/lib/api";
import { YouTubePlayer } from "./YouTubePlayer";

type Item = { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium: { url: string } } } };

export function MusicTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"music" | "video">("music");
  const [playing, setPlaying] = useState<{ id: string; title: string } | null>(null);

  async function run(query: string, m: "music" | "video") {
    setLoading(true);
    try {
      const r = await ytSearch(query, m);
      setItems(r);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run("top hits 2024", "music");
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) run(q, mode);
          }}
          className="relative flex-1 max-w-xl"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === "music" ? "Search songs, artists…" : "Search music videos…"}
            className="w-full pl-11 pr-4 py-3 rounded-full bg-secondary border border-border focus:border-primary focus:outline-none"
          />
        </form>
        <div className="inline-flex bg-secondary rounded-full p-1 border border-border">
          {(["music", "video"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                run(q || "top hits 2024", m);
              }}
              className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <button
              key={it.id.videoId}
              onClick={() => setPlaying({ id: it.id.videoId, title: it.snippet.title })}
              className="group text-left flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary hover:shadow-[var(--shadow-glow)] transition"
            >
              <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                <img src={it.snippet.thumbnails.medium.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary" fill="currentColor" />
                </div>
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="text-sm font-medium line-clamp-2">{it.snippet.title}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{it.snippet.channelTitle}</p>
              </div>
            </button>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">Search to discover music.</p>}
        </div>
      )}

      {playing && <YouTubePlayer videoId={playing.id} title={playing.title} onClose={() => setPlaying(null)} />}
    </div>
  );
}
