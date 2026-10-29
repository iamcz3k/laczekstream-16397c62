import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { COUNTRIES, flagUrl } from "@/lib/countries";

export function FlagPicker({ value, onChange, placeholder = "Country / flag" }: {
  value?: string | null;
  onChange: (code: string | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = useMemo(() => COUNTRIES.find((c) => c.code === value) || null, [value]);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES.slice(0, 40);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.code.includes(s)).slice(0, 60);
  }, [q]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-xl bg-background px-3 py-2 text-left text-sm"
      >
        {selected ? (
          <>
            <img src={flagUrl(selected.code, 40)!} alt="" className="h-4 w-6 rounded-sm object-cover" />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        {selected && (
          <X className="ml-auto h-3.5 w-3.5 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onChange(null); }} />
        )}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country…"
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto">
            {matches.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); setQ(""); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-secondary"
                >
                  <img src={flagUrl(c.code, 40)!} alt="" className="h-4 w-6 rounded-sm object-cover" />
                  <span>{c.name}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">{c.code}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">No match</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
