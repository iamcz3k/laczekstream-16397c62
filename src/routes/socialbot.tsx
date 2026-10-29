import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Bot, Copy, Gamepad2, Pause, Play, RotateCcw, Square } from "lucide-react";
import { createJob, loadJobs, pct, saveJobs, tickJob, type SocialJob, type SocialMetric, type SocialPlatform } from "@/lib/socialbot-game";

export const Route = createFileRoute("/socialbot")({ component: SocialBotGame });

function SocialBotGame() {
  const [jobs, setJobs] = useState<SocialJob[]>(() => loadJobs());
  const [platform, setPlatform] = useState<SocialPlatform>("TikTok");
  const [metric, setMetric] = useState<SocialMetric>("Followers");
  const [target, setTarget] = useState("@demo_creator");
  const [amount, setAmount] = useState("1000");
  const [copied, setCopied] = useState("");

  useEffect(() => saveJobs(jobs), [jobs]);
  useEffect(() => {
    const t = window.setInterval(() => setJobs(current => current.map(tickJob)), 1800);
    return () => window.clearInterval(t);
  }, []);

  const active = useMemo(() => jobs.filter(j => j.status === "running" || j.status === "queued").length, [jobs]);
  const mutate = (id: string, fn: (j: SocialJob) => SocialJob) => setJobs(xs => xs.map(j => j.id === id ? fn(j) : j));

  function start() {
    const n = Math.max(1, Math.min(1000000, Number(amount) || 1));
    const job = createJob({ platform, metric, target: target.trim() || "@demo_creator", amount: n });
    job.status = "running";
    job.statusMessage = "Simulation started";
    job.history.push({ at: new Date().toISOString(), message: "Simulation started" });
    setJobs(xs => [job, ...xs]);
  }

  function share(id: string) {
    const url = window.location.origin + "/socialbot/track/" + id;
    navigator.clipboard?.writeText(url).then(() => setCopied(id)).catch(() => setCopied(url));
    window.setTimeout(() => setCopied(""), 1800);
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
      <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm"><ArrowLeft className="h-4 w-4"/> LACZEK</Link>
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Gamepad2 className="h-4 w-4"/> LAB MODE</span>
    </div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"><Bot className="h-3.5 w-3.5"/> SIMULATION GAME</div>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">SocialBot Lab</h1><p className="mt-1 text-sm text-muted-foreground">A private architecture game for jobs, workers, progress and failures.</p></div><div className="rounded-2xl bg-secondary px-4 py-3 text-right"><b className="text-2xl">{active}</b><div className="text-xs text-muted-foreground">active jobs</div></div></div>
      </section>
      <section className="grid gap-3 md:grid-cols-4">
        <select value={platform} onChange={e=>setPlatform(e.target.value as SocialPlatform)} className="rounded-2xl border border-border bg-secondary px-4 py-3">{["TikTok","Instagram","X","YouTube"].map(x=><option key={x}>{x}</option>)}</select>
        <select value={metric} onChange={e=>setMetric(e.target.value as SocialMetric)} className="rounded-2xl border border-border bg-secondary px-4 py-3">{["Followers","Likes","Comments","Views"].map(x=><option key={x}>{x}</option>)}</select>
        <input value={target} onChange={e=>setTarget(e.target.value)} className="rounded-2xl border border-border bg-secondary px-4 py-3" placeholder="@demo_creator"/>
        <div className="flex gap-2"><input value={amount} onChange={e=>setAmount(e.target.value.replace(/\D/g,""))} className="min-w-0 flex-1 rounded-2xl border border-border bg-secondary px-4 py-3" inputMode="numeric"/><button onClick={start} className="rounded-2xl bg-primary px-4 font-bold text-primary-foreground"><Play className="inline h-4 w-4"/> Start</button></div>
      </section>
      <section className="space-y-4">
        {jobs.map(job=><article key={job.id} className="rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><b className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>{job.platform} · {job.metric}</b><p className="text-sm text-muted-foreground">{job.target} · {job.id}</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase">{job.status}</span></div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{width:pct(job)+"%"}}/></div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{job.progress.toLocaleString()} / {job.amount.toLocaleString()}</span><span>{pct(job)}%</span></div>
          <div className="mt-4 rounded-2xl bg-secondary/60 p-3 text-sm">{job.statusMessage}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {job.status !== "completed" && job.status !== "stopped" && <button onClick={()=>mutate(job.id,j=>({...j,status:j.status==="paused"?"running":"paused",statusMessage:j.status==="paused"?"Resuming simulation":"Manual hold"}))} className="rounded-xl bg-secondary px-3 py-2 text-sm">{job.status==="paused"?<Play className="inline h-4 w-4"/>:<Pause className="inline h-4 w-4"/>} {job.status==="paused"?"Resume":"Pause"}</button>}
            {job.status !== "completed" && <button onClick={()=>mutate(job.id,j=>({...j,status:"stopped",statusMessage:"Simulation stopped"}))} className="rounded-xl bg-secondary px-3 py-2 text-sm"><Square className="inline h-4 w-4"/> Stop</button>}
            <button onClick={()=>mutate(job.id,j=>({...j,progress:0,status:"running",statusMessage:"Simulation restarted"}))} className="rounded-xl bg-secondary px-3 py-2 text-sm"><RotateCcw className="inline h-4 w-4"/> Restart</button>
            <button onClick={()=>share(job.id)} className="rounded-xl bg-secondary px-3 py-2 text-sm"><Copy className="inline h-4 w-4"/> {copied===job.id?"Copied":"Track"}</button>
          </div>
        </article>)}
        {jobs.length===0 && <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">No jobs yet. Humanity has temporarily run out of imaginary followers.</div>}
      </section>
    </main>
  </div>;
}