import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  onFocus,
  placeholder = "Search…",
  className = "",
}: SearchInputProps) {
  const input = (
    <>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary ${className}`}
      />
    </>
  );

  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} className="relative">
        {input}
      </form>
    );
  }

  return <div className="relative">{input}</div>;
}
