import { useEffect, useState } from "react";
import { Globe, Pause, Play, Radio as RadioIcon, Volume2 } from "lucide-react";
import { LoadingSpinner, EmptyState, SearchInput, CountryPickerModal } from "@/components/shared";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

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
  const [countries, setCountries] = useState<string[]>([""]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const audio = useAudioPlayer();

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
    const params = new URLSearchParams({
      limit: "120",
      hidebroken: "true",
      order: "clickcount",
      reverse: "true",
    });
    if (query) params.set("name", query);
    if (country) params.set("country", country);
    fetch(`${API}/stations/search?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: Station[]) => setStations(d.filter((s) => !!s.url_resolved)))
      .catch(() => setStations([]))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [query, country]);

  function pick(s: Station) {
    setCurrent(s);
    audio.play(s.url_resolved);
    fetch(`${API}/url/${s.stationuuid}`).catch(() => {});
  }

  return (
    <div className="pb-32">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Search station name…" />
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-3 text-sm font-medium hover:border-primary"
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>{country || "🌍 All countries"}</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((s) => (
            <button
              key={s.stationuuid}
              onClick={() => pick(s)}
              className={`glass-card flex items-center gap-3 rounded-2xl p-3 text-left transition hover:border-primary/50 ${current?.stationuuid === s.stationuuid ? "border-primary" : ""}`}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {s.favicon ? (
                  <img
                    src={s.favicon}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0")}
                  />
                ) : (
                  <RadioIcon className="m-3 h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.country}
                  {s.tags ? ` · ${s.tags.split(",")[0]}` : ""}
                </p>
              </div>
              {current?.stationuuid === s.stationuuid && audio.playing && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              )}
            </button>
          ))}
          {stations.length === 0 && <EmptyState message="No stations found." className="py-16" />}
        </div>
      )}

      {current && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-popover/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <button
              onClick={audio.toggle}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              {audio.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{current.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {current.country} · {current.codec}{" "}
                {current.bitrate ? `${current.bitrate}kbps` : ""}
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={audio.volume}
                onChange={(e) => audio.setVolume(+e.target.value)}
                className="w-24 accent-primary"
              />
            </div>
          </div>
        </div>
      )}

      <CountryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        countries={countries.filter((c) => !!c).map((c) => ({ code: c, label: c }))}
        selected={country}
        onSelect={setCountry}
      />
    </div>
  );
}
