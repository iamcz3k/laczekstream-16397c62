export const SOCIAL_PLATFORMS = ["TikTok", "Instagram", "X", "YouTube"] as const;
export const SOCIAL_SERVICES = ["Followers", "Likes", "Comments", "Subscribers"] as const;
export const SOCIAL_STATUSES = ["pending", "processing", "paused", "stopped", "completed", "refunded"] as const;
export const SOCIAL_NETWORKS = ["Global", "Africa", "Europe", "USA", "Asia", "Uganda", "Mixed"] as const;

export const SOCIAL_REASONS = [
  "Network error — reconnecting to delivery servers",
  "High demand — request queue is busy, please wait",
  "Please wait — request is queued",
  "Platform rate limit reached — resuming when available",
  "Account is private — make it public to continue",
  "Post link is invalid or was deleted",
  "Username changed — please send the new link",
  "Server maintenance in progress",
  "Processing speed reduced temporarily",
  "Platform update detected — processing paused",
  "Verification checkpoint",
  "Payment not yet confirmed",
  "Daily processing limit reached — continues later",
  "Progress verification required",
  "Comments under moderation review",
  "Region network congestion",
  "Timeout from platform servers — retrying",
  "Duplicate request detected — waiting for the first to finish",
  "Target limit reached on this post",
  "Temporary platform restriction — cooling down",
  "Awaiting admin approval",
] as const;

export type SocialOrder = {
  id: string;
  code: string;
  platform: string;
  service: string;
  target_url: string;
  quantity: number;
  delivered: number;
  status: string;
  reason: string | null;
  network: string | null;
  customer: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function newSocialCode() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}
