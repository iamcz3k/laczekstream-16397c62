import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Radio } from "lucide-react";
import { iptvChannels } from "@/lib/api";
import { HlsPlayer } from "./HlsPlayer";

type Channel = { id: string; name: string; country: string; categories: string[]; logo?: string; url: string };

export function TVTab() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [playing, setPlaying] = useState<Channel | null>(null);

  useEffect(() => {
    iptvChannels()
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    channels.forEach((c) => c.categories.forEach((x) => s.add(x)));
    return ["all", ...Array.from(s).sort()].slice(0, 12);
  }, [channels]);

  const filtered = useMemo(() => {
    return channels
      .filter((c) => (cat === "all" ? true : c.categories.includes(cat)))
      .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
      .slice(0, 200);
  }, [channels, cat, q]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search channels…"
            className="w-full pl-11 pr-4 py-3 rounded-full bg-secondary border border-border focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition ${
                cat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setPlaying(c)}
            className="group p-4 rounded-xl bg-card border border-border hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all text-left"
          >
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-3 overflow-hidden">
              {c.logo ? (
                <img src={c.logo} alt={c.name} loading="lazy" className="max-w-[80%] max-h-[80%] object-contain" />
              ) : (
                <Radio className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.country}</p>
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">No channels.</p>}
      </div>

      {playing && <HlsPlayer src={playing.url} title={playing.name} onClose={() => setPlaying(null)} />}
    </div>
  );
}
