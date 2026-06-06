import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MaintenanceSettings = {
  enabled?: boolean;
  message?: string;
};

export function MaintenanceOverlay() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const client = supabase as any;
        const { data } = await client
          .from("site_settings")
          .select("value")
          .eq("key", "maintenance_mode")
          .maybeSingle();
        const status = (data?.value || {}) as MaintenanceSettings;
        if (!cancelled) {
          setIsMaintenanceMode(status.enabled ?? false);
          setMessage(status.message ?? "The site is under maintenance. Please try again later.");
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkStatus();
    // Poll every 10 seconds to check for maintenance mode changes
    const interval = window.setInterval(checkStatus, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Check if we're on the admin panel bypass route
  const isAdminPath =
    typeof window !== "undefined" &&
    (window.location.pathname.includes("/adminv3") || window.location.pathname === "/adminv3");

  if (loading || !isMaintenanceMode || isAdminPath) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-lg">
      <div className="max-w-md rounded-3xl border border-border bg-popover p-8 text-center text-popover-foreground shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-destructive/20 p-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Under Maintenance</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        <p className="mt-4 text-xs text-muted-foreground/70">
          We'll be back soon. Thank you for your patience!
        </p>
      </div>
    </div>
  );
}