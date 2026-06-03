import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Link2, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/party")({
  component: PartyLanding,
  head: () => ({
    meta: [
      { title: "Watch Party — LACZEK STREAM" },
      { name: "description", content: "Create a synced room and watch movies, shows, or live sports with friends." },
    ],
  }),
});

function randomId(len = 6) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function PartyLanding() {
  const navigate = useNavigate();
  const [src, setSrc] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");

  function host() {
    const url = src.trim();
    if (!url) return;
    const id = randomId();
    navigate({
      to: "/party/$roomId",
      params: { roomId: id },
      search: { src: url, title: title.trim() || "Watch Party" } as any,
    });
  }

  function join() {
    const id = code.trim().toLowerCase();
    if (!id) return;
    navigate({ to: "/party/$roomId", params: { roomId: id } });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <BrandMark />
          <a href="/" className="text-xs font-bold text-muted-foreground hover:text-foreground">← Back</a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-black sm:text-4xl">Watch Party</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create a room, share the link, and watch together with live chat.</p>

        <section className="mt-8 rounded-2xl border border-border bg-secondary/40 p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Host a room</h2>
          <label className="mt-3 block text-xs font-bold text-muted-foreground">Content URL or path</label>
          <input
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder="/watch/movie/603 or https://… embed URL"
            className="mt-1 w-full rounded-full border border-border bg-background py-3 px-4 text-sm outline-none focus:border-primary"
          />
          <label className="mt-3 block text-xs font-bold text-muted-foreground">Room title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Friday Movie Night"
            className="mt-1 w-full rounded-full border border-border bg-background py-3 px-4 text-sm outline-none focus:border-primary"
          />
          <button onClick={host} disabled={!src.trim()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50">
            <Users className="h-4 w-4" /> Create party <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Join with code</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Room code (e.g. ab2x9k)"
              className="flex-1 rounded-full border border-border bg-background py-3 px-4 text-sm outline-none focus:border-primary"
            />
            <button onClick={join} disabled={!code.trim()} className="rounded-full bg-secondary px-5 py-2.5 text-sm font-black disabled:opacity-50">
              <Link2 className="inline h-4 w-4" /> Join
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Or open the link the host shared with you.</p>
        </section>
      </main>
    </div>
  );
}