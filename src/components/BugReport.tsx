import { useState } from "react";
import { Bug, Send } from "lucide-react";

const WHATSAPP = "256704232796";

export function BugReport({ trigger = "fab" }: { trigger?: "fab" | "inline" } = {}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function send() {
    const msg = text.trim() || "Hi LACZEK, I'd like to report:";
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
    setText("");
  }

  return (
    <>
      {trigger === "fab" ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Report bug or request feature"
          className="fixed bottom-4 left-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition hover:scale-110 active:scale-95"
        >
          <Bug className="h-5 w-5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-secondary"
        >
          <Bug className="h-4 w-4" />
          <span className="flex-1">Report bug / suggest feature</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-4 backdrop-blur-xl sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-border bg-popover text-popover-foreground p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-lg font-bold">Report bug / suggest feature</h3>
            <p className="mb-3 text-xs text-muted-foreground">Sends directly to the developer on WhatsApp.</p>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Describe the bug or feature you'd like…"
              className="w-full rounded-2xl border border-border bg-secondary p-3 text-sm focus:border-primary focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-full bg-secondary px-4 py-2 text-sm">Cancel</button>
              <button onClick={send} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}