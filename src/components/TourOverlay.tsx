import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { tourForPath, TOURS, type Tour, type TourStep } from "@/lib/tour/tours";

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 10;
const TOOLTIP_W = 320;
const TOOLTIP_OFFSET = 16;

export function TourOverlay() {
  const [tour, setTour] = useState<Tour | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [, force] = useState(0);
  const targetRef = useRef<Element | null>(null);
  const navigate = useNavigate();
  const router = useRouterState({ select: (s) => s.location.pathname });

  // Listen for tour-start events dispatched from anywhere in the app.
  useEffect(() => {
    function onStart(e: Event) {
      const detail = (e as CustomEvent<{ tour?: string }>).detail || {};
      const id = detail.tour;
      const next = id && TOURS[id] ? TOURS[id] : tourForPath(window.location.pathname);
      setTour(next);
      setStepIdx(0);
    }
    window.addEventListener("laczek:tour:start", onStart as EventListener);
    return () => window.removeEventListener("laczek:tour:start", onStart as EventListener);
  }, []);

  const step: TourStep | null = tour && tour.steps[stepIdx] ? tour.steps[stepIdx] : null;

  // Resolve target rect for the current step. Re-resolve on resize and after
  // route transitions.
  useEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let attempt = 0;

    async function go() {
      // Navigate first if the step asks for a specific route.
      if (step!.route && window.location.pathname !== step!.route) {
        try { await navigate({ to: step!.route as never }); } catch {}
      }
      if (!step!.target) {
        if (!cancelled) { targetRef.current = null; setRect(null); }
        return;
      }
      // Try a few times — the target might not be mounted yet.
      const tick = () => {
        if (cancelled) return;
        attempt += 1;
        const el = document.querySelector(step!.target!);
        if (el) {
          targetRef.current = el;
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          window.setTimeout(() => {
            if (cancelled) return;
            const r = el.getBoundingClientRect();
            setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          }, 320);
        } else if (attempt < 20) {
          window.setTimeout(tick, 150);
        } else {
          targetRef.current = null;
          setRect(null);
        }
      };
      window.setTimeout(tick, step!.delay ?? 50);
    }

    go();

    function onResize() {
      if (!targetRef.current) return;
      const r = targetRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      force((n) => n + 1);
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [step, navigate, router]);

  const tooltipPos = useMemo(() => {
    if (!rect) {
      // Centered intro / outro
      const w = typeof window !== "undefined" ? window.innerWidth : 360;
      const h = typeof window !== "undefined" ? window.innerHeight : 640;
      return { top: h / 2 - 90, left: Math.max(12, w / 2 - TOOLTIP_W / 2), width: Math.min(TOOLTIP_W, w - 24) };
    }
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const below = rect.top + rect.height + TOOLTIP_OFFSET;
    const above = rect.top - TOOLTIP_OFFSET - 220;
    const useBelow = below + 220 < winH || above < 12;
    const top = Math.max(12, Math.min(winH - 240, useBelow ? below : Math.max(12, above)));
    const w = Math.min(TOOLTIP_W, winW - 24);
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, winW - w - 12));
    return { top, left, width: w };
  }, [rect]);

  if (!tour || !step) return null;

  function close() { setTour(null); setStepIdx(0); }
  function next() {
    if (!tour) return;
    if (stepIdx + 1 >= tour.steps.length) close();
    else setStepIdx((i) => i + 1);
  }
  function back() { setStepIdx((i) => Math.max(0, i - 1)); }

  const cutout = rect
    ? {
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[300]" aria-live="polite">
      {/* Dim layer — only shown when there's no target cutout (intro/outro
       * steps). When a cutout exists, the ring's huge box-shadow already
       * paints the dim layer everywhere except the ring. */}
      {!cutout && (
        <div className="absolute inset-0 bg-black/70" onClick={close} />
      )}
      {cutout && (
        <>
          <div
            className="pointer-events-auto absolute inset-0"
            onClick={close}
          />
          <div
            className="pointer-events-none absolute rounded-2xl ring-4 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.72)] transition-all duration-300"
            style={{ top: cutout.top, left: cutout.left, width: cutout.width, height: cutout.height }}
          />
        </>
      )}

      {/* Tooltip card */}
      <div
        className="absolute rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: tooltipPos.width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{tour.label}</span>
            <span className="opacity-60">· {stepIdx + 1}/{tour.steps.length}</span>
          </div>
          <button onClick={close} aria-label="Close tour" className="rounded-full p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3">
          <h4 className="mb-1 text-base font-black">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <button
            onClick={close}
            className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={back}
              disabled={stepIdx === 0}
              className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground"
            >
              {stepIdx + 1 >= tour.steps.length ? "Done" : "Next"} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
