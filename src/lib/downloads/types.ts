export type DownloadStatus =
  | "queued"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type DownloadMeta = {
  id: string;                // title_id (uuid)
  title: string;
  kind: "movie" | "tv" | "anime";
  season?: number | null;
  episode?: number | null;
  poster_url?: string | null;
  storage_path: string;
  size_bytes: number;        // total expected
  bytes_downloaded: number;  // resumable offset
  mime: string;
  status: DownloadStatus;
  error?: string | null;
  created_at: number;
  updated_at: number;
};

export type DownloadProgress = {
  id: string;
  loaded: number;
  total: number;
  speedBps: number;
  etaSec: number;
  status: DownloadStatus;
  error?: string | null;
};
