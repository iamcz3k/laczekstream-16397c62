import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Pause, Play, Radio as RadioIcon, Search, Volume2 } from "lucide-react";

export const Route = createFileRoute("/radio")({
  component: RadioPage,
  head: () => ({
    meta: [
      { title: "Radio — LACZEK STREAM" },
      { name: "description", content: "Stream thousands of free radio stations from around the world." },
    ],
  }),
});

type Station = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  url: string;
  favicon: string;
  country: string;
  countrycode: string;
  tags: string;
  bitrate: number;
  codec: string;
};

const API = "https://de1.api.radio-browser.info/json";

function RadioPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const countries = useMemo(
    () => ["", "United States", "United Kingdom", "Germany", "France", "Spain", "Italy", "Brazil", "India", "Japan", "South Africa", "Kenya", "Nigeria", "Mexico", "Australia", "Canada"],
    [],
  );

  useEffect(() => {
    setLoading(true);
    const ctrl = new AbortController();
    const params = new URLSearchParams({ limit: "120", hidebroken: "true", order: "clickcount", reverse: "true" });
    if (query) params.set("name", query);
    if (country) params.set("country", country);
    fetch(`${API}/stations/search?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: Station[]) => setStations(d.filter((s) => !!s.url_resolved)))
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [query, country]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  async function pick(s: Station) {
    setCurrent(s);
    setPlaying(true);
    // Click counter (best effort)
    fetch(`${API}/url/${s.stationuuid}`).catch(() => {});
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = s.url_resolved;
        audioRef.current.play().catch(() => setPlaying(false));
      }
    }, 0);
  }

  function toggle() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <header className="sticky top-0 z-20 border-b border-border glass">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link to="/" className="rounded-full bg-secondary p-2"><ArrowLeft className="h-4 w-4" /></Link>
          <RadioIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-black">Radio</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search station name…"
              className="w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-full border border-border bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {countries.map((c) => <option key={c} value={c}>{c || "All countries"}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stations.map((s) => (
              <button
                key={s.stationuuid}
                onClick={() => pick(s)}
                className={`glass-card flex items-center gap-3 rounded-2xl p-3 text-left transition hover:border-primary/50 ${current?.stationuuid === s.stationuuid ? "border-primary" : ""}`}
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {s.favicon ? <img src={s.favicon} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")} /> : <RadioIcon className="m-3 h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.country}{s.tags ? ` · ${s.tags.split(",")[0]}` : ""}</p>
                </div>
                {current?.stationuuid === s.stationuuid && playing && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
              </button>
            ))}
            {stations.length === 0 && <p className="col-span-full py-16 text-center text-muted-foreground">No stations found.</p>}
          </div>
        )}
      </main>

      {/* Sticky player */}
      {current && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-popover/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <button onClick={toggle} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{current.name}</p>
              <p className="truncate text-xs text-muted-foreground">{current.country} · {current.codec} {current.bitrate ? `${current.bitrate}kbps` : ""}</p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(+e.target.value)} className="w-24 accent-primary" />
            </div>
          </div>
          <audio ref={audioRef} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        </div>
      )}
    </div>
  );
}