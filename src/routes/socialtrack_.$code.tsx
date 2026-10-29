import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { socialTrack } from "@/lib/social.functions";
import { ProgressBar, StatusBadge } from "@/components/SocialProgress";

export const Route = createFileRoute("/socialtrack_/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.code} — Social Tracker` },
      { name: "description", content: `Live delivery progress for order ${params.code}.` },
      { property: "og:title", content: `Order ${params.code} — live progress` },
      { property: "og:description", content: "See delivered count, status and network for this order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { code } = Route.useParams();
  const fn = useServerFn(socialTrack);
  const q = useQuery({
    queryKey: ["socialtrack", code],
    queryFn: () => fn({ data: { code } }),
    refetchInterval: 15000,
  });
  const o = q.data;
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-lg space-y-4">
        <Link to="/socialtrack" className="text-sm text-muted-foreground">← Track another</Link>
        {q.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !o ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h1 className="text-lg font-bold">Order not found</h1>
            <p className="text-sm text-muted-foreground">Check the code {code} and try again.</p>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Order {o.code}</p>
                <h1 className="text-xl font-bold">
                  {o.platform} {o.service}
                </h1>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <a href={o.target_url} target="_blank" rel="noreferrer" className="block break-all text-sm text-primary underline">
              {o.target_url}
            </a>
            <ProgressBar delivered={o.delivered} quantity={o.quantity} />
            {o.reason && o.status !== "completed" && (
              <div className="rounded-lg border border-border bg-muted p-3 text-sm">
                <span className="font-semibold">Update: </span>
                {o.reason}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Network</dt><dd>{o.network || "Global"}</dd></div>
              <div><dt className="text-muted-foreground">Last update</dt><dd>{new Date(o.updated_at).toLocaleString()}</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">This page refreshes automatically.</p>
          </div>
        )}
      </div>
    </main>
  );
}
