import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Radio, Globe, X, Check } from "lucide-react";
import { iptvChannels, countryName, countryFlag, CURATED_TV_CHANNELS, type Channel } from "@/lib/api";
import { HlsPlayer } from "./HlsPlayer";

const ALL = "__all__";

export function TVTab() {
  const [channels, setChannels] = useState<Channel[]>(CURATED_TV_CHANNELS);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string>(ALL);
  const [cat, setCat] = useState<string>("all");
  const [playing, setPlaying] = useState<Channel | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

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

  const inCountry = useMemo(() => {
    if (country === ALL) {
      // Random popular mix: top countries first, shuffled per render-session.
      const arr = [...channels];
      // Deterministic-ish shuffle so the order stays stable within a session.
      let s = 1;
      const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return channels.filter((c) => c.country === country);
  }, [channels, country]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    inCountry.forEach((c) => c.categories.forEach((x) => s.add(x)));
    return ["all", ...Array.from(s).sort()];
  }, [inCountry]);

  const filtered = useMemo(() => {
    return inCountry
      .filter((c) => (cat === "all" ? true : c.categories.includes(cat)))
      .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
      .slice(0, 600);
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
        <button
          onClick={() => { setPickerOpen(true); setPickerQ(""); }}
          className="flex items-center gap-2 glass rounded-full pl-4 pr-4 py-2 text-sm font-medium hover:border-primary"
        >
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span>
            {country === ALL ? "🌍 All countries" : `${countryFlag(country)} ${countryName(country)}`}
          </span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
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
            className="group p-4 rounded-[22px] glass-card hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all duration-300 active:scale-[0.98] text-left"
          >
            <div className="aspect-video bg-muted/50 rounded-[16px] flex items-center justify-center mb-3 overflow-hidden">
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
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">No playable channels found for this country yet.</p>}
      </div>

      {playing && (
        <HlsPlayer
          src={playing.url}
          sources={playing.streams ?? [playing.url]}
          title={playing.name}
          onClose={() => setPlaying(null)}
        />
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center" onClick={() => setPickerOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-base font-black">Pick a country</h3>
              <button onClick={() => setPickerOpen(false)} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
            </div>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  placeholder="Search countries…"
                  className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              <li>
                <button onClick={() => { setCountry(ALL); setCat("all"); setPickerOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${country === ALL ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                  <span>🌍 All countries · popular mix</span>
                  {country === ALL && <Check className="h-4 w-4" />}
                </button>
              </li>
              {countries
                .filter(([c]) => {
                  if (!pickerQ.trim()) return true;
                  const q = pickerQ.toLowerCase();
                  return countryName(c).toLowerCase().includes(q) || c.toLowerCase().includes(q);
                })
                .map(([c, n]) => (
                  <li key={c}>
                    <button onClick={() => { setCountry(c); setCat("all"); setPickerOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${country === c ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary"}`}>
                      <span className="truncate">{countryFlag(c)} {countryName(c)} <span className="text-xs opacity-70">({n})</span></span>
                      {country === c && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
