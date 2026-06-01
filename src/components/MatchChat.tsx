import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPrefs, setPrefs } from "@/lib/preferences";

type ChatMsg = {
  id: string;
  match_id: string;
  name: string;
  message: string;
  created_at: string;
};

export function MatchChat({ matchId }: { matchId: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState<string>(() => getPrefs().name || "");
  const [askName, setAskName] = useState(!getPrefs().name);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("match_chats")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (mounted && data) setMsgs(data as ChatMsg[]);
    })();

    const channel = supabase
      .channel(`match-chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_chats", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMsgs((prev) => [...prev, payload.new as ChatMsg]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    let who = name.trim();
    if (!who) {
      who = prompt("Your name for chat?")?.trim() || "Guest";
      setName(who);
      setPrefs({ name: who });
      setAskName(false);
    }
    setSending(true);
    setText("");
    const { error } = await supabase.from("match_chats").insert({
      match_id: matchId,
      name: who.slice(0, 40),
      message: t.slice(0, 500),
    });
    if (error) {
      console.error("chat send failed", error);
      setText(t);
    }
    setSending(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[22px] border border-border bg-card/60">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Live chat</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">{msgs.length} msg</span>
      </div>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" style={{ maxHeight: 360 }}>
        {msgs.length === 0 && <p className="text-center text-xs text-muted-foreground">No messages yet — say hi 👋</p>}
        {msgs.map((m) => (
          <div key={m.id} className="rounded-xl bg-secondary/60 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-primary">{m.name}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="mt-1 break-words leading-snug">{m.message}</p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
        {askName && (
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