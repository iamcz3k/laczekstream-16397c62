import { useEffect, useMemo, useState } from "react";
import { Radio, Globe } from "lucide-react";
import {
  LoadingSpinner,
  EmptyState,
  SearchInput,
  CountryPickerModal,
  type CountryOption,
} from "@/components/shared";
import {
  iptvChannels,
  countryName,
  countryFlag,
  CURATED_TV_CHANNELS,
  type Channel,
} from "@/lib/api";
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
      const rand = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
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

  const countryOptions: CountryOption[] = countries.map(([c, n]) => ({
    code: c,
    label: `${countryFlag(c)} ${countryName(c)}`,
    count: n,
  }));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 max-w-xl">
          <SearchInput value={q} onChange={setQ} placeholder="Search channels…" />
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-2 glass rounded-full pl-4 pr-4 py-2 text-sm font-medium hover:border-primary"
        >
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span>
            {country === ALL
              ? "🌍 All countries"
              : `${countryFlag(country)} ${countryName(country)}`}
          </span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
              cat === c
                ? "bg-primary text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground"
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
        {filtered.length === 0 && (
          <EmptyState message="No playable channels found for this country yet." />
        )}
      </div>

      {playing && (
        <HlsPlayer
          src={playing.url}
          sources={playing.streams ?? [playing.url]}
          title={playing.name}
          onClose={() => setPlaying(null)}
        />
      )}

      <CountryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        countries={countryOptions}
        selected={country}
        onSelect={(c) => {
          setCountry(c || ALL);
          setCat("all");
        }}
        allLabel="🌍 All countries · popular mix"
        allValue={ALL}
      />
    </div>
  );
}
