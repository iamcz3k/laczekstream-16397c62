export type SocialPlatform = "TikTok" | "Instagram" | "X" | "YouTube";
export type SocialMetric = "Followers" | "Likes" | "Comments" | "Views";
export type JobStatus = "queued" | "running" | "paused" | "completed" | "stopped" | "error";

export type SocialJob = {
  id: string;
  platform: SocialPlatform;
  metric: SocialMetric;
  target: string;
  amount: number;
  progress: number;
  status: JobStatus;
  statusMessage: string;
  createdAt: string;
  updatedAt: string;
  speed: number;
  history: { at: string; message: string }[];
};

const KEY = "laczek_socialbot_game_jobs_v1";

const statuses = [
  "Simulation queued",
  "Preparing virtual workers",
  "Checking simulated network",
  "Allocating game capacity",
  "Worker pool is busy",
  "Temporary network instability",
  "Queue congestion simulated",
  "Waiting for virtual capacity",
  "Retry scheduled",
  "Progress checkpoint reached",
  "Worker heartbeat received",
  "Provider response simulated",
  "Background tick completed",
  "Game engine throttled",
  "Low simulated bandwidth",
  "High simulated demand",
  "Manual hold",
  "Resuming simulation",
  "Finalizing progress",
  "Simulation completed",
  "Simulation stopped",
  "Simulation error",
  "Target validation passed",
  "Target validation failed",
];

export function loadJobs(): SocialJob[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SocialJob[];
  } catch {
    return [];
  }
}

export function saveJobs(jobs: SocialJob[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(jobs.slice(0, 100)));
}

export function makeId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase();
}

export function createJob(input: Pick<SocialJob, "platform" | "metric" | "target" | "amount">): SocialJob {
  const now = new Date().toISOString();
  return {
    ...input,
    id: makeId(),
    progress: 0,
    status: "queued",
    statusMessage: "Simulation queued",
    createdAt: now,
    updatedAt: now,
    speed: 1,
    history: [{ at: now, message: "Simulation queued" }],
  };
}

export function tickJob(job: SocialJob): SocialJob {
  if (job.status !== "running") return job;
  const next = Math.min(job.amount, job.progress + Math.max(1, Math.round(job.amount * 0.025 * job.speed)));
  const complete = next >= job.amount;
  const now = new Date().toISOString();
  const message = complete ? "Simulation completed" : statuses[Math.floor(Math.random() * 19)];
  return {
    ...job,
    progress: next,
    status: complete ? "completed" : "running",
    statusMessage: message,
    updatedAt: now,
    history: [...job.history.slice(-19), { at: now, message }],
  };
}

export function pct(job: SocialJob) {
  return job.amount > 0 ? Math.min(100, Math.round((job.progress / job.amount) * 100)) : 0;
}

export { statuses };
