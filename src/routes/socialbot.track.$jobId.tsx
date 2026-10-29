import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bot, CheckCircle2, Clock3, PauseCircle, XCircle } from "lucide-react";
import { loadJobs, pct, type SocialJob } from "@/lib/socialbot-game";

export const Route = createFileRoute("/socialbot/track/$jobId")({ component: SocialTrack });

function SocialTrack() {
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<SocialJob | null>(null);
  useEffect(() => {
    const refresh=()=>setJob(loadJobs().find(j=>j.id===jobId)||null);
    refresh(); const t=window.setInterval(refresh,1000); return()=>window.clearInterval(t);
  },[jobId]);

  if(!job) return <div className="min-h-screen bg-background p-8 text-center"><h1 className="text-2xl font-black">Tracking job not found</h1><p className="mt-2 text-sm text-muted-foreground">This game state exists only in the browser that created it.</p><Link to="/socialbot" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground">Back to Lab</Link></div>;
  const Icon=job.status==="completed"?CheckCircle2:job.status==="paused"?PauseCircle:job.status==="stopped"?XCircle:Clock3;

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4"><Link to="/socialbot" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4"/> SocialBot Lab</Link><span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><Bot className="h-3.5 w-3.5"/> SIMULATION</span></div></header>
    <main className="mx-auto max-w-3xl px-4 py-10"><div className="rounded-3xl border border-border bg-card p-6">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tracking {job.id}</p><h1 className="mt-2 text-3xl font-black">{job.platform} {job.metric}</h1><p className="mt-1 text-muted-foreground">{job.target}</p>
      <div className="mt-8 flex items-center gap-3"><Icon className="h-7 w-7 text-primary"/><div><b className="capitalize">{job.status}</b><p className="text-sm text-muted-foreground">{job.statusMessage}</p></div></div>
      <div className="mt-7 h-4 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:pct(job)+"%"}}/></div>
      <div className="mt-2 flex justify-between font-bold"><span>{job.progress.toLocaleString()}</span><span>{pct(job)}%</span><span>{job.amount.toLocaleString()}</span></div>
      <div className="mt-8 rounded-2xl bg-secondary/60 p-4"><h2 className="font-bold">Activity history</h2><div className="mt-3 space-y-2">{job.history.slice().reverse().map((h,i)=><div key={i} className="flex justify-between gap-3 text-sm"><span>{h.message}</span><span className="shrink-0 text-xs text-muted-foreground">{new Date(h.at).toLocaleTimeString()}</span></div>)}</div></div>
    </div></main>
  </div>;
}