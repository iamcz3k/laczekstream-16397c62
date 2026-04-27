import { Film, Tv, Trophy, Music2 } from "lucide-react";

export type TabKey = "movies" | "tv" | "football" | "music";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "movies", label: "Movies", icon: Film },
  { key: "tv", label: "TV", icon: Tv },
  { key: "football", label: "Football", icon: Trophy },
  { key: "music", label: "Music", icon: Music2 },
];

export function Header({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border rounded-none supports-[backdrop-filter]:bg-card/55">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[14px] bg-primary flex items-center justify-center font-black text-primary-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,white_25%,transparent)]">L</div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">LACZEK STREAM</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">free · clean · no ads</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 glass rounded-full p-1 shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)]">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
