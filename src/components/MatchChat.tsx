import { useEffect, useRef, useState } from "react";
import { linkify } from "@/components/Linkify";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs, setPrefs } from "@/lib/preferences";

type ChatMsg = {
  id: string;
  name: string;
  message: string;
  created_at: string;
  source: "aiscore" | "local";
};

export function MatchChat({ matchId, home, away }: { matchId: string; home?: string; away?: string }) {
  const [mirror, setMirror] = useState<ChatMsg[]>([]);
  const [local, setLocal] = useState<ChatMsg[]>([]);
  const [mirrorSource, setMirrorSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [text, setText] = useState("");
  const [name, setName] = useState<string>(() => getPrefs().name || "");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Poll aiscore mirror — no DB dependency.
  useEffect(() => {
    if (!home || !away) {
      setLoading(false);
      setStatus("Missing team names");
      return;
    }
    let cancelled = false;
    async function pull() {
      try {
        const r = await fetch(
          `/api/public/aiscore-chat?home=${encodeURIComponent(home!)}&away=${encodeURIComponent(away!)}`,
        );
        const j = await r.json();
        if (cancelled) return;
        if (!j?.ok) {
          setStatus(j?.error || "Mirror unavailable");
        } else {
          setMirrorSource(j.sourceUrl || null);
          const mapped: ChatMsg[] = (j.messages || []).map((m: { id: string; name: string; message: string; created_at: string }) => ({
            id: `as-${m.id}`,
            name: m.name,
            message: m.message,
            created_at: m.created_at,
            source: "aiscore" as const,
          }));
          setMirror(mapped);
          setStatus(
            mapped.length === 0
              ? j.sourceUrl
                ? "No messages on AiScore yet"
                : "No AiScore match found"
              : "",
          );
        }
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error ? e.message : "Mirror error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    pull();
    const t = window.setInterval(pull, 3_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [home, away]);

  // Best-effort local chat — non-blocking if DB is down.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("match_chats")
          .select("*")
          .eq("match_id", matchId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (mounted && data) {
          setLocal(
            data.map((m) => ({
              id: `lc-${m.id}`,
              name: m.name,
              message: m.message,
              created_at: m.created_at,
              source: "local" as const,
            })),
          );
        }
      } catch {}
    })();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`match-chat-${matchId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "match_chats", filter: `match_id=eq.${matchId}` },
          (payload: { new: { id: string; name: string; message: string; created_at: string } }) => {
            setLocal((prev) => [
              ...prev,
              {
                id: `lc-${payload.new.id}`,
                name: payload.new.name,
                message: payload.new.message,
                created_at: payload.new.created_at,
                source: "local" as const,
              },
            ]);
          },
        )
        .subscribe();
    } catch {}
    return () => {
      mounted = false;
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [matchId]);

  const allMsgs = [...mirror, ...local];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [allMsgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    let who = name.trim();
    if (!who) {
      who = prompt("Your name for chat?")?.trim() || "Guest";
      setName(who);
      setPrefs({ name: who });
    }
    setSending(true);
    setText("");
    try {
      const { error } = await supabase.from("match_chats").insert({
        match_id: matchId,
        name: who.slice(0, 40),
        message: t.slice(0, 500),
      });
      if (error) {
        // Show optimistic locally even if DB write failed
        setLocal((prev) => [
          ...prev,
          {
            id: `lc-tmp-${Date.now()}`,
            name: who,
            message: t,
            created_at: new Date().toISOString(),
            source: "local",
          },
        ]);
      }
    } catch {
      setLocal((prev) => [
        ...prev,
        {
          id: `lc-tmp-${Date.now()}`,
          name: who,
          message: t,
          created_at: new Date().toISOString(),
          source: "local",
        },
      ]);
    }
    setSending(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Live chat</h3>
        {mirrorSource && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
            AiScore
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {allMsgs.length} msg
        </span>
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" style={{ maxHeight: 360 }}>
        {loading && allMsgs.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading chat from AiScore…
          </div>
        )}
        {!loading && allMsgs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">{status || "No messages yet — say hi 👋"}</p>
        )}
        {allMsgs.map((m) => {
          const isMirror = m.source === "aiscore";
          return (
            <div
              key={m.id}
              className={`rounded-xl px-3 py-2 ${isMirror ? "bg-secondary/30 border border-dashed border-border" : "bg-secondary/60"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-bold text-primary">
                  {m.name}
                  {isMirror && <span className="ml-1 text-[9px] font-normal text-muted-foreground">· aiscore</span>}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-1 break-words leading-snug">{linkify(m.message)}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
        {!name && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="w-24 rounded-full bg-secondary px-3 py-2 text-xs focus:outline-none"
          />
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={name ? `Message as ${name}…` : "Type a message…"}
          maxLength={500}
          className="flex-1 rounded-full bg-secondary px-3 py-2 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
