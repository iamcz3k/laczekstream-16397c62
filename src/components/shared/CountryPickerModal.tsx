import { useState } from "react";
import { Check, Search, X } from "lucide-react";

export interface CountryOption {
  code: string;
  label: string;
  count?: number;
}

interface CountryPickerModalProps {
  open: boolean;
  onClose: () => void;
  countries: CountryOption[];
  selected: string;
  onSelect: (code: string) => void;
  allLabel?: string;
  allValue?: string;
}

export function CountryPickerModal({
  open,
  onClose,
  countries,
  selected,
  onSelect,
  allLabel = "🌍 All countries",
  allValue = "",
}: CountryPickerModalProps) {
  const [pickerQ, setPickerQ] = useState("");

  if (!open) return null;

  const filtered = countries.filter(
    (c) =>
      !pickerQ.trim() ||
      c.label.toLowerCase().includes(pickerQ.toLowerCase()) ||
      c.code.toLowerCase().includes(pickerQ.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-base font-black">Pick a country</h3>
          <button onClick={onClose} className="rounded-full bg-secondary p-2">
            <X className="h-4 w-4" />
          </button>
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
            <button
              onClick={() => {
                onSelect(allValue);
                onClose();
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                selected === allValue ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              <span>{allLabel}</span>
              {selected === allValue && <Check className="h-4 w-4" />}
            </button>
          </li>
          {filtered.map((c) => (
            <li key={c.code}>
              <button
                onClick={() => {
                  onSelect(c.code);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  selected === c.code
                    ? "bg-primary text-primary-foreground font-bold"
                    : "hover:bg-secondary"
                }`}
              >
                <span className="truncate">
                  {c.label}
                  {c.count != null && <span className="text-xs opacity-70"> ({c.count})</span>}
                </span>
                {selected === c.code && <Check className="h-4 w-4 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
