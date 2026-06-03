import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { MatchChat } from "@/components/MatchChat";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs } from "@/lib/preferences";

type PartySearch = { src?: string; title?: string };

export const Route = createFileRoute("/party/$roomId")({
  component: PartyRoom,
  validateSearch: (s: Record<string, unknown>): PartySearch => ({
    src: typeof s.src === "string" ? s.src : undefined,
    title: typeof s.title === "string" ? s.title : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Watch Party Room — LACZEK STREAM" },
      { name: "description", content: "Synced viewing room with live chat." },
    ],
  }),
});

function buildEmbed(src: string): string {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  // App-internal path — render inside same origin
  if (src.startsWith("/")) return src;
  return `/${src}`;
}

function PartyRoom() {
  const { roomId } = Route.useParams();
  const { src, title } = Route.useSearch();
  const [presence, setPresence] = useState(1);
  const [copied, setCopied] = useState(false);
  const embed = buildEmbed(src || "");
  const chatId = `party_${roomId}`;
  const roomTitle = title || "Watch Party";

  useEffect(() => {
    const name = getPrefs().name || `Guest-${Math.random().toString(36).slice(2, 6)}`;
    const ch = supabase.channel(`presence-party-${roomId}`, { config: { presence: { key: name } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setPresence(Object.keys(state).length || 1);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  async function copyInvite() {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  if (!embed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <p className="text-lg font-black">This room has no content link yet.</p>
        <p className="text-sm text-muted-foreground">Ask the host to share the invite link, or create your own room.</p>
        <a href="/party" className="rounded-full bg-primary px-5 py-2 text-sm font-black text-primary-foreground">Create a room</a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-4">
        <a href="/party" className="rounded-full bg-secondary p-2"><ArrowLeft className="h-4 w-4" /></a>
        <BrandMark />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{roomTitle}</p>
          <p className="truncate text-[11px] text-muted-foreground">Room {roomId}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-bold"><Users className="h-3 w-3" /> {presence}</span>
        <button onClick={copyInvite} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground">
          <Copy className="h-3 w-3" /> {copied ? "Copied!" : "Invite"}
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="relative aspect-video w-full bg-black lg:flex-1 lg:aspect-auto">
          <iframe
            src={embed}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
          />
        </div>
        <aside className="flex h-[55vh] flex-col border-t border-border lg:h-auto lg:w-96 lg:border-l lg:border-t-0">
          <MatchChat matchId={chatId} />
        </aside>
      </div>
    </div>
  );
}