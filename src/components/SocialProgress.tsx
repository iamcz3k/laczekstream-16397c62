const STATUS_TONE: Record<string, string> = {
  completed: "bg-primary text-primary-foreground",
  processing: "bg-secondary text-secondary-foreground",
  pending: "bg-muted text-muted-foreground",
  paused: "bg-accent text-accent-foreground",
  stopped: "bg-destructive text-destructive-foreground",
  refunded: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${STATUS_TONE[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}

export function ProgressBar({ delivered, quantity }: { delivered: number; quantity: number }) {
  const pct = Math.min(100, Math.round((delivered / Math.max(1, quantity)) * 100));
  return (
    <div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>
          {delivered.toLocaleString()} / {quantity.toLocaleString()}
        </span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}
