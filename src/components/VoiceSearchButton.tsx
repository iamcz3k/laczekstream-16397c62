import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

// Lightweight voice-to-text using the browser's Web Speech API.
// Drops into any search bar — calls onResult with the recognised text.
// Silently hides itself in browsers that don't support recognition.

type SR = any;

function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = false;
  r.interimResults = true;
  r.maxAlternatives = 1;
  try {
    r.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
  } catch {}
  return r;
}

export function VoiceSearchButton({
  onResult,
  onInterim,
  className = "",
  title = "Search by voice",
}: {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  className?: string;
  title?: string;
}) {
  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => {
      try { recRef.current?.stop?.(); } catch {}
      recRef.current = null;
    };
  }, []);

  function start() {
    if (listening) {
      try { recRef.current?.stop?.(); } catch {}
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    recRef.current = rec;
    let final = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim && onInterim) onInterim((final + interim).trim());
    };
    rec.onerror = () => { setListening(false); };
    rec.onend = () => {
      setListening(false);
      const text = final.trim();
      if (text) onResult(text);
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={start}
      title={title}
      aria-label={title}
      aria-pressed={listening}
      className={`inline-flex items-center justify-center rounded-full transition ${
        listening
          ? "bg-red-500 text-white animate-pulse"
          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
      } ${className}`}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
