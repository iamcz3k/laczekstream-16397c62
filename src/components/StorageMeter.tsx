import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { getStorageEstimate } from "@/lib/downloads";
import { Progress } from "@/components/ui/progress";

function fmt(bytes: number) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}

export function StorageMeter() {
  const [{ usage, quota }, setEst] = useState({ usage: 0, quota: 0 });
  useEffect(() => {
    const refresh = () => getStorageEstimate().then(setEst);
    refresh();
    const t = window.setInterval(refresh, 5000);
    return () => window.clearInterval(t);
  }, []);
  const pct = quota ? Math.round((usage / quota) * 100) : 0;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <HardDrive className="h-3.5 w-3.5" />
          <span>Device storage</span>
        </div>
        <span className="tabular-nums">
          {fmt(usage)} / {fmt(quota)} ({pct}%)
        </span>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" />
    </div>
  );
}

export { fmt as formatBytes };
