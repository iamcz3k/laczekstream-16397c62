import { useEffect, useState } from "react";

export type LogoAnimKind = "movies" | "football" | "tv" | "youtube" | "cctv" | "default";

/** Full-screen 2-second celebration overlay tied to the active tab. */
export function LogoAnimation({ kind, onDone }: { kind: LogoAnimKind; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = window.setTimeout(() => setLeaving(true), 1700);
    const t2 = window.setTimeout(onDone, 2000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center pointer-events-none ${leaving ? "opacity-0" : "opacity-100"} transition-opacity duration-300 bg-black/60 backdrop-blur-sm`}>
      <div className="relative h-full w-full overflow-hidden">
        {kind === "movies" && <PopcornBurst />}
        {kind === "football" && <BallSpin />}
        {kind === "tv" && <TvNoise />}
        {kind === "youtube" && <YouTubePulse />}
        {kind === "cctv" && <CctvScan />}
        {kind === "default" && <YouTubePulse />}
      </div>
    </div>
  );
}

function PopcornBurst() {
  const items = Array.from({ length: 24 });
  return (
    <>
      {items.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const size = 30 + Math.random() * 30;
        return (
          <span
            key={i}
            className="absolute text-white"
            style={{
              left: `${left}%`,
              bottom: "-40px",
              fontSize: `${size}px`,
              animation: `popcornUp 1.8s ease-out ${delay}s forwards`,
            }}
          >
            🍿
          </span>
        );
      })}
      <style>{`@keyframes popcornUp { 0%{transform:translateY(0) rotate(0);opacity:0} 20%{opacity:1} 100%{transform:translateY(-110vh) rotate(720deg);opacity:0} }`}</style>
    </>
  );
}

function BallSpin() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[40vh]" style={{ animation: "ballRoll 1.8s ease-in-out forwards" }}>⚽</span>
      <style>{`@keyframes ballRoll { 0%{transform:translateX(-120vw) rotate(0)} 100%{transform:translateX(120vw) rotate(2160deg)} }`}</style>
    </div>
  );
}

function TvNoise() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="rounded-3xl border-8 border-white/80 bg-black p-6" style={{ animation: "tvFlash 0.2s steps(2,end) infinite" }}>
        <div className="text-6xl text-white">📺</div>
        <div className="mt-2 text-center text-sm font-bold text-white/80">NO SIGNAL</div>
      </div>
      <style>{`@keyframes tvFlash { 0%{filter:hue-rotate(0)} 50%{filter:invert(1)} 100%{filter:hue-rotate(180deg)} }`}</style>
    </div>
  );
}

function YouTubePulse() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex h-48 w-72 items-center justify-center rounded-3xl bg-red-600 shadow-2xl" style={{ animation: "ytPulse 1.8s ease-out forwards" }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
      </div>
      <style>{`@keyframes ytPulse { 0%{transform:scale(0);opacity:0} 30%{transform:scale(1.2);opacity:1} 70%{transform:scale(1)} 100%{transform:scale(2);opacity:0} }`}</style>
    </div>
  );
}

function CctvScan() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,255,0,0.06)_50%)] bg-[length:100%_4px]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-green-500" style={{ animation: "scanLine 1.8s linear forwards" }} />
      <div className="absolute right-6 top-6 flex items-center gap-2 rounded-md bg-black/80 px-3 py-1 text-xs font-bold text-red-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> REC
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[28vh]">📹</span>
      </div>
      <style>{`@keyframes scanLine { 0%{transform:translateY(0)} 100%{transform:translateY(100vh)} }`}</style>
    </div>
  );
}