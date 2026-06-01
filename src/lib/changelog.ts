export type ChangeKind = "new" | "fix" | "improved" | "soon";
export type ChangeEntry = { date: string; kind: ChangeKind; title: string; detail?: string };

export const CHANGELOG: ChangeEntry[] = [
  { date: "2026-05-05", kind: "new", title: "DEV OPTIONS panel", detail: "Real-time visitor analytics with country, time spent, current page and watch history — auto-refreshes every 5 seconds." },
  { date: "2026-05-05", kind: "new", title: "Slide-in navigation drawer", detail: "Cleaner, faster menu that slides in from the right." },
  { date: "2026-05-05", kind: "new", title: "Language selector", detail: "Pick from 70+ languages." },
  { date: "2026-05-05", kind: "new", title: "Live football search", detail: "Find a stream by team or league." },
  { date: "2026-05-05", kind: "new", title: "What's New page", detail: "See everything that ships." },
  { date: "2026-05-05", kind: "improved", title: "Auto-switch broken servers", detail: "If a stream doesn't start within 30s, the next server is loaded automatically." },
  { date: "2026-05-05", kind: "fix", title: "Visitor tracking now works", detail: "All sessions, page views and searches are saved in the cloud." },
  { date: "2026-05-04", kind: "new", title: "Silent ad / popup blocker", detail: "Direct-link redirects from streams are blocked transparently." },
  { date: "2026-05-03", kind: "new", title: "Live match chat", detail: "Real-time chat panel inside every football live stream." },
  { date: "2026-05-02", kind: "fix", title: "Football streams audio restored" },
  { date: "2026-05-02", kind: "improved", title: "Notify-me for upcoming matches" },
  { date: "—", kind: "soon", title: "Full UI translations", detail: "Wiring the language picker into every label." },
  { date: "—", kind: "soon", title: "User accounts & cloud watchlist", detail: "Sync your library across devices." },
  { date: "—", kind: "soon", title: "PiP & Cast support" },
];