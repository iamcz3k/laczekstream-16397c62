import { useEffect, useRef, useState } from "react";
import { Check, Globe, Loader2, Pause, Play, Radio as RadioIcon, Search, Volume2, X } from "lucide-react";

type Station = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  country: string;
  countrycode: string;
  tags: string;
  bitrate: number;
  codec: string;
};

type CountryRow = { name: string; stationcount: number };

const API = "https://de1.api.radio-browser.info/json";

export function RadioTab() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [countries, setCountries] = useState<string[]>([""]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch(`${API}/countries?hidebroken=true`)
      .then((r) => r.json())
      .then((rows: CountryRow[]) => {
        const names = rows
          .filter((r) => r.name && r.stationcount > 0)
          .map((r) => r.name)
          .sort((a, b) => a.localeCompare(b));
        setCountries(["", ...names]);
      })
      .catch(() => {});
  }, []);

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

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);

  function pick(s: Station) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setCurrent(s);
    setPlaying(false);
    const audio = new Audio();
    audio.volume = volume;
    audio.crossOrigin = "anonymous";
    audio.src = s.url_resolved;
    audio.addEventListener("playing", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("error", () => setPlaying(false));
    audioRef.current = audio;
    audio.play().catch(() => setPlaying(false));
    fetch(`${API}/url/${s.stationuuid}`).catch(() => {});
  }

  function toggle() {
    const a = audioRef.current; if (!a) return;
    if (playing) a.pause(); else a.play().catch(() => {});
  }

  return (
    <div className="pb-32">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search station name…"
            className="w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => { setPickerOpen(true); setPickerQ(""); }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-3 text-sm font-medium hover:border-primary"
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{country || "🌍 All countries"}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
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
                <input autoFocus value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} placeholder="Search countries…"
                  className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              <li>
                <button onClick={() => { setCountry(""); setPickerOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${country === "" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                  <span>🌍 All countries</span>
                  {country === "" && <Check className="h-4 w-4" />}
                </button>
              </li>
              {countries
                .filter((c) => !!c)
                .filter((c) => !pickerQ.trim() || c.toLowerCase().includes(pickerQ.toLowerCase()))
                .map((c) => (
                  <li key={c}>
                    <button onClick={() => { setCountry(c); setPickerOpen(false); }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${country === c ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary"}`}>
                      <span className="truncate">{c}</span>
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