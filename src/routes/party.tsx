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
  const [error, setError] = useState<string | null>(null);

  function host() {
    const url = src.trim();
    if (!url) { setError("Paste a movie link first — e.g. /watch/movie/603 (The Matrix)"); return; }
    setError(null);
    const id = randomId();
    try {
      navigate({
        to: "/party/$roomId",
        params: { roomId: id },
        search: { src: url, title: title.trim() || "Watch Party" },
      });
    } catch (e) {
      setError("Could not create the room. Please try again.");
    }
  }

  function join() {
    const id = code.trim().toLowerCase();
    if (!id) { setError("Enter the room code your friend shared"); return; }
    setError(null);
    try {
      navigate({ to: "/party/$roomId", params: { roomId: id } });
    } catch (e) {
      setError("Invalid room code. Try again.");
    }
  }

  function quickHost() {
    setSrc("/watch/movie/603");
    setTitle("Movie Night — The Matrix");
    setTimeout(() => host(), 50);
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
          <button onClick={host} className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-black text-primary-foreground">
            <Users className="h-4 w-4" /> Create party <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={quickHost} className="mt-2 ml-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-xs font-bold">
            Try with a sample movie
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">Tip: open any movie or show, copy the URL path (e.g. <code>/watch/movie/603</code>) and paste it above.</p>
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
            <button onClick={join} className="rounded-full bg-secondary px-5 py-2.5 text-sm font-black">
              <Link2 className="inline h-4 w-4" /> Join
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Or open the link the host shared with you.</p>
        </section>
        {error && <p className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      </main>
    </div>
  );
}