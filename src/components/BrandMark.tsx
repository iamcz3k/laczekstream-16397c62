import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";

/**
 * Brand logo with auto-rotate (1s every 5min) and click handler that triggers
 * the per-tab celebration animation via a custom event.
 */
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const [spin, setSpin] = useState(false);

  // Auto-rotate the play badge for 1 second every 5 minutes.
  useEffect(() => {
    const fire = () => {
      setSpin(true);
      window.setTimeout(() => setSpin(false), 1000);
    };
    const t = window.setInterval(fire, 5 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setSpin(true);
    window.setTimeout(() => setSpin(false), 1000);
    window.dispatchEvent(new CustomEvent("laczek:logo-click"));
  }

  return (
    <Link to="/" onClick={handleClick} className="group inline-flex items-center gap-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
      <span
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
        style={spin ? { animation: "logoSpin 1s ease-in-out" } : undefined}
      >
        <span className="absolute inset-px rounded-[15px] shadow-[inset_0_1px_0_color-mix(in_oklab,white_35%,transparent),inset_0_-10px_22px_color-mix(in_oklab,black_18%,transparent)]" />
        <Play className="relative ml-0.5 h-[18px] w-[18px]" fill="currentColor" />
      </span>
      <span className={compact ? "hidden text-left sm:block" : "text-left"}>
        <span className="block text-[15px] font-black leading-none tracking-tight text-foreground">LACZEK</span>
        <span className="block text-[10px] font-black uppercase leading-none tracking-[0.24em] text-primary">Stream</span>
      </span>
      <style>{`@keyframes logoSpin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
    </Link>
  );
}