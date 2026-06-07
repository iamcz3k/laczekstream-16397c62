import { supabase } from "@/integrations/supabase/client";
import { Ban, LogOut } from "lucide-react";

export function BlockedScreen({ reason }: { reason?: string | null }) {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl border border-destructive/40 bg-popover p-6 text-center text-popover-foreground shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
          <Ban className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Account blocked</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account has been blocked by an administrator and cannot access LACZEK STREAMs.
        </p>
        {reason && (
          <div className="mt-4 rounded-2xl border border-border bg-secondary px-4 py-3 text-left text-xs">
            <p className="mb-1 font-bold uppercase text-muted-foreground">Reason</p>
            <p>{reason}</p>
          </div>
        )}
        <button onClick={signOut} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary px-4 py-2 text-sm font-bold hover:border-primary">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}