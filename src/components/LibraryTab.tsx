import { useEffect, useState } from "react";
import { Bookmark, Clock, History as HistoryIcon, Trash2 } from "lucide-react";
import {
  clearLibrary,
  getContinueWatching,
  getHistory,
  getWatchlist,
  onLibraryChange,
  removeFromContinue,
  toggleWatchlist,
  type LibraryEntry,
} from "@/lib/library";
import { MediaCard } from "./MediaCard";

type Section = "continue" | "watchlist" | "history";

const SECTIONS: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "continue", label: "Continue Watching", icon: Clock },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "history", label: "History", icon: HistoryIcon },
];

export function LibraryTab({ initial = "continue" as Section }: { initial?: Section }) {
  const [section, setSection] = useState<Section>(initial);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);

  useEffect(() => setSection(initial), [initial]);

  useEffect(() => {
    const refresh = () => {
      if (section === "continue") setEntries(getContinueWatching());
      else if (section === "watchlist") setEntries(getWatchlist());
      else setEntries(getHistory());
    };
    refresh();
    return onLibraryChange(refresh);
  }, [section]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex glass rounded-full p-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = s.id === section;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => clearLibrary(section)}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear {section}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-sm">Nothing here yet.</p>
          <p className="mt-1 text-xs">Start watching something to fill your {section}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {entries.map((entry) => (
            <MediaCard
              key={`${entry.kind}-${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`}
              entry={entry}
              showProgress={section === "continue"}
              onRemove={() => {
                if (section === "continue") removeFromContinue(entry);
                else if (section === "watchlist") toggleWatchlist(entry);
                else {
                  // history: clear-only via the button above; remove individually by overwriting
                  const next = getHistory().filter((e) => !(e.id === entry.id && e.kind === entry.kind && e.season === entry.season && e.episode === entry.episode));
                  window.localStorage.setItem("laczek:history", JSON.stringify(next));
                  window.dispatchEvent(new CustomEvent("laczek:library-changed"));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}