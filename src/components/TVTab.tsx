import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Radio, Globe } from "lucide-react";
import { iptvChannels, countryName, countryFlag, type Channel } from "@/lib/api";
import { HlsPlayer } from "./HlsPlayer";

export function TVTab() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string>("US");
  const [cat, setCat] = useState<string>("all");
  const [playing, setPlaying] = useState<Channel | null>(null);

  useEffect(() => {
    iptvChannels()
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, []);

  const countries = useMemo(() => {
    const counts = new Map<string, number>();
    channels.forEach((c) => counts.set(c.country, (counts.get(c.country) ?? 0) + 1));
    return Array.from(counts.entries())
      .filter(([c]) => c && c.length === 2)
      .sort((a, b) => b[1] - a[1]);
  }, [channels]);

  const inCountry = useMemo(
    () => channels.filter((c) => c.country === country),
    [channels, country],
  );

  const categories = useMemo(() => {
    const s = new Set<string>();
    inCountry.forEach((c) => c.categories.forEach((x) => s.add(x)));
    return ["all", ...Array.from(s).sort()];
  }, [inCountry]);

  const filtered = useMemo(() => {
    return inCountry
      .filter((c) => (cat === "all" ? true : c.categories.includes(cat)))
      .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
      .slice(0, 300);
  }, [inCountry, cat, q]);

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
            className="w-full pl-11 pr-4 py-3 rounded-full glass border-border focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 glass rounded-full pl-4 pr-1 py-1">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setCat("all");
            }}
            className="bg-transparent py-2 pr-3 text-sm font-medium focus:outline-none cursor-pointer"
          >
            {countries.map(([c, n]) => (
              <option key={c} value={c} className="bg-background">
                {countryFlag(c)} {countryName(c)} ({n})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition ${
              cat === c ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setPlaying(c)}
            className="group p-4 rounded-xl glass-card hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all text-left"
          >
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center mb-3 overflow-hidden">
              {c.logo ? (
                <img
                  src={c.logo}
                  alt={c.name}
                  loading="lazy"
                  className="max-w-[85%] max-h-[85%] object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Radio className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {countryFlag(c.country)} {c.categories[0] ?? "general"}
            </p>
          </button>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">No channels in this country.</p>}
      </div>

      {playing && (
        <HlsPlayer
          src={playing.url}
          sources={playing.streams ?? [playing.url]}
          title={playing.name}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
