import { useEffect, useState } from "react";
import { Mail, User as UserIcon, Lock, Loader2, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setPrefs } from "@/lib/preferences";

type Mode = "signin" | "signup";

export function AuthPopup({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateSignup(): string | null {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (username.trim().length < 5) return "Username must be at least 5 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) return "Username can only contain letters, numbers, and underscores";
    const fn = fullName.trim();
    const parts = fn.split(/\s+/);
    if (parts.length < 2 || parts.some((p) => !/^[A-Za-z-]+$/.test(p))) return "Enter your full name (e.g. John Doe)";
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const v = validateSignup();
        if (v) { setError(v); return; }
        const cleanUsername = username.trim();
        const cleanFullName = fullName.trim().replace(/\s+/g, " ");
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { username: cleanUsername, full_name: cleanFullName } },
        });
        if (signErr) throw signErr;
        const userId = data.user?.id;
        if (!userId) throw new Error("Sign up did not return a user");

        // Insert profile (auto-confirm is on, so session should exist)
        const { error: profErr } = await supabase.from("profiles").insert({
          id: userId,
          email: email.trim(),
          username: cleanUsername,
          full_name: cleanFullName,
        });
        if (profErr) {
          if (profErr.code === "23505") throw new Error("Username is already taken");
          throw profErr;
        }
        setPrefs({ name: cleanFullName.split(" ")[0], onboardedName: true });
        onAuthed();
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) throw signErr;
        onAuthed();
      }
    } catch (e) {
      setError((e as Error).message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-3xl">
            {mode === "signup" ? "✨" : "👋"}
          </div>
          <h2 className="text-2xl font-black tracking-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Join LACZEK STREAMs in seconds — no email verification." : "Sign in to continue streaming."}
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-2xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none" />
          </div>
          {mode === "signup" && (
            <>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (min 5 chars)" maxLength={32} className="w-full rounded-2xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name (e.g. John Doe)" maxLength={64} className="w-full rounded-2xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none" />
              </div>
            </>
          )}
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-2xl border border-border bg-secondary py-3 pl-10 pr-4 text-sm focus:border-primary focus:outline-none" />
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">{error}</p>}

        <button type="submit" disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        <button type="button" onClick={() => { setError(null); setMode(mode === "signup" ? "signin" : "signup"); }} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary">
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}

export function useAuthGate() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ? { id: data.session.user.id, email: data.session.user.email ?? undefined } : null);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return { user, loaded };
}