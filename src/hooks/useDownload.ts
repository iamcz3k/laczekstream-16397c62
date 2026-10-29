import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { downloadEngine, downloadsDB, onDownloadProgress, requestPersistent } from "@/lib/downloads";
import type { DownloadMeta, DownloadProgress } from "@/lib/downloads";
import { getSignedDownloadUrl, markDownloadComplete } from "@/lib/downloads.functions";
import { supabase } from "@/integrations/supabase/client";

// Initialize once.
let booted = false;
function bootEngine() {
  if (booted) return;
  booted = true;
  const fetchSigned = async (titleId: string) => {
    const res = await getSignedDownloadUrl({ data: { title_id: titleId } });
    return res.url;
  };
  const markComplete = async (id: string) => {
    try {
      const m = await downloadsDB.getMeta(id);
      if (m) await markDownloadComplete({ data: { title_id: id, bytes: m.bytes_downloaded } });
      toast.success(`Download complete: ${m?.title ?? id}`);
    } catch (e) {
      // not signed in or offline; ignore
    }
  };
  downloadEngine.configure({ getSignedUrl: fetchSigned, onComplete: markComplete });
  void downloadEngine.boot();
}

export function useDownload(titleId: string) {
  const [meta, setMeta] = useState<DownloadMeta | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    bootEngine();
    let cancelled = false;
    downloadsDB.getMeta(titleId).then((m) => !cancelled && setMeta(m ?? null));
    const off = onDownloadProgress((p) => {
      if (p.id !== titleId) return;
      setProgress(p);
      downloadsDB.getMeta(titleId).then((m) => !cancelled && setMeta(m ?? null));
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [titleId]);

  const start = async (info: Omit<DownloadMeta, "bytes_downloaded" | "status" | "created_at" | "updated_at">) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      toast.error("Please sign in to download");
      return;
    }
    await requestPersistent();
    await downloadEngine.enqueue(info);
  };

  return {
    meta,
    progress,
    start,
    pause: () => downloadEngine.pause(titleId),
    resume: () => downloadEngine.resume(titleId),
    retry: () => downloadEngine.retry(titleId),
    cancel: () => downloadEngine.cancel(titleId),
  };
}
