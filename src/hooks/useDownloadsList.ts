import { useEffect, useState } from "react";
import { downloadsDB, onDownloadProgress } from "@/lib/downloads";
import type { DownloadMeta } from "@/lib/downloads";

export function useDownloadsList() {
  const [items, setItems] = useState<DownloadMeta[]>([]);
  useEffect(() => {
    let cancelled = false;
    const refresh = () => downloadsDB.listMeta().then((m) => !cancelled && setItems(m));
    refresh();
    const off = onDownloadProgress(() => refresh());
    return () => {
      cancelled = true;
      off();
    };
  }, []);
  return items;
}
