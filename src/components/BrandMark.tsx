import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-primary text-primary-foreground shadow-[var(--shadow-glow)]">
        <span className="absolute inset-px rounded-[15px] shadow-[inset_0_1px_0_color-mix(in_oklab,white_35%,transparent),inset_0_-10px_22px_color-mix(in_oklab,black_18%,transparent)]" />
        <Play className="relative ml-0.5 h-[18px] w-[18px]" fill="currentColor" />
      </span>
      <span className={compact ? "hidden text-left sm:block" : "text-left"}>
        <span className="block text-[15px] font-black leading-none tracking-tight text-foreground">LACZEK</span>
        <span className="block text-[10px] font-black uppercase leading-none tracking-[0.24em] text-primary">Stream</span>
      </span>
    </Link>
  );
}