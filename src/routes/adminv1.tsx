import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  BookOpen,
  Check,
  Copy,
  Key,
  Lock,
  Play,
  Plus,
  RefreshCcw,
  Server,
  Trash2,
  X,
} from "lucide-react";
import {
  apiAdminOverview,
  apiCreateKey,
  apiDeleteEndpoint,
  apiDeleteKey,
  apiSaveEndpoint,
  apiToggleEndpoint,
  apiToggleKey,
} from "@/lib/api-admin.functions";

export const Route = createFileRoute("/adminv1")({
  head: () => ({
    meta: [
      { title: "API Console — LaCzek Stream" },
      { name: "description", content: "Admin console for the LaCzek Stream public API: keys, custom endpoints, playground and documentation." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "API Console — LaCzek Stream" },
      { property: "og:description", content: "Manage API keys, custom endpoints and read the LaCzek Stream API docs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminV1Page,
});

type Overview = Awaited<ReturnType<typeof apiAdminOverview>>;
type Tab = "overview" | "keys" | "endpoints" | "playground" | "docs";

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setDone(true);
        window.setTimeout(() => setDone(false), 1200);
      }}
      className="rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground"
      aria-label="Copy"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-popover p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AdminV1Page() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Overview | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [origin, setOrigin] = useState("https://laczekstream.lovable.app");

  const overviewFn = useServerFn(apiAdminOverview);
  const createKeyFn = useServerFn(apiCreateKey);
  const toggleKeyFn = useServerFn(apiToggleKey);
  const deleteKeyFn = useServerFn(apiDeleteKey);
  const saveEndpointFn = useServerFn(apiSaveEndpoint);
  const toggleEndpointFn = useServerFn(apiToggleEndpoint);
  const deleteEndpointFn = useServerFn(apiDeleteEndpoint);

  useEffect(() => setOrigin(window.location.origin), []);

  async function load(pw = password) {
    setLoading(true);
    setError(null);
    try {
      const res = await overviewFn({ data: { password: pw } });
      setData(res);
      setAuthed(true);
    } catch (e) {
      setError((e as Error).message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const base = `${origin}/api/public/v1`;

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
          className="w-full max-w-sm rounded-3xl border border-border bg-popover p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">API CONSOLE</h1>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Restricted. Manage API keys, custom endpoints and documentation.
          </p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          <h1 className="text-base font-bold">API CONSOLE</h1>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            v1
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="rounded-full bg-secondary p-2">
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button onClick={() => window.history.back()} className="rounded-full bg-secondary p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-popover/60 px-2 py-2">
        {(
          [
            ["overview", "Overview"],
            ["keys", "API Keys"],
            ["endpoints", "Custom APIs"],
            ["playground", "Playground"],
            ["docs", "Documentation"],
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-4xl p-4 pb-24">
        {error && (
          <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </p>
        )}

        {tab === "overview" && data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="API keys" value={data.totals.keys} />
              <Stat label="Active keys" value={data.totals.activeKeys} />
              <Stat label="Custom APIs" value={data.totals.endpoints} />
              <Stat label="Requests" value={data.totals.requests} />
            </div>
            <div className="rounded-2xl border border-border bg-popover p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Base URL</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="break-all text-sm text-primary">{base}</code>
                <CopyBtn value={base} />
              </div>
            </div>
            <section className="rounded-2xl border border-border bg-popover p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Activity className="h-4 w-4 text-primary" /> Recent requests
              </h2>
              {data.logs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No API traffic yet.</p>
              ) : (
                <ul className="divide-y divide-border text-xs">
                  {data.logs.slice(0, 25).map((l) => (
                    <li key={l.id} className="flex justify-between py-2">
                      <span className="font-mono">{l.path}</span>
                      <span className="text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {tab === "keys" && data && (
          <KeysTab
            data={data}
            onCreate={async (label, owner, limit) => {
              await createKeyFn({ data: { password, label, owner, limit } });
              await load();
            }}
            onToggle={async (id, active) => {
              await toggleKeyFn({ data: { password, id, active } });
              await load();
            }}
            onDelete={async (id) => {
              await deleteKeyFn({ data: { password, id } });
              await load();
            }}
          />
        )}

        {tab === "endpoints" && data && (
          <EndpointsTab
            data={data}
            base={base}
            onSave={async (payload) => {
              await saveEndpointFn({ data: { password, ...payload } });
              await load();
            }}
            onToggle={async (id, active) => {
              await toggleEndpointFn({ data: { password, id, active } });
              await load();
            }}
            onDelete={async (id) => {
              await deleteEndpointFn({ data: { password, id } });
              await load();
            }}
          />
        )}

        {tab === "playground" && <Playground base={base} keys={data?.keys ?? []} />}
        {tab === "docs" && <Docs base={base} sampleKey={data?.keys?.[0]?.key ?? "YOUR_API_KEY"} />}
      </main>
    </div>
  );
}

function KeysTab({
  data,
  onCreate,
  onToggle,
  onDelete,
}: {
  data: Overview;
  onCreate: (label: string, owner: string, limit: number) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [owner, setOwner] = useState("");
  const [limit, setLimit] = useState(1000);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!label.trim()) return;
          setBusy(true);
          await onCreate(label.trim(), owner.trim(), limit);
          setLabel("");
          setOwner("");
          setBusy(false);
        }}
        className="rounded-2xl border border-border bg-popover p-4"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Issue a new API key
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Partner site)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner (optional)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 1000)}
            placeholder="Requests / hour"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          disabled={busy}
          className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Creating…" : "Generate key"}
        </button>
      </form>

      <div className="space-y-2">
        {data.keys.length === 0 && (
          <p className="text-xs text-muted-foreground">No keys yet — generate one above.</p>
        )}
        {data.keys.map((k) => (
          <div key={k.id} className="rounded-2xl border border-border bg-popover p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Key className="h-4 w-4 text-primary" /> {k.label}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="truncate text-xs text-muted-foreground">{k.key}</code>
                  <CopyBtn value={k.key} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {k.owner_name || "—"} · {k.request_count} requests · {k.rate_limit_per_hour}/h
                  {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => void onToggle(k.id, !k.active)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    k.active ? "bg-emerald-500/15 text-emerald-500" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {k.active ? "Active" : "Disabled"}
                </button>
                <button onClick={() => void onDelete(k.id)} className="rounded-full bg-secondary p-2">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndpointsTab({
  data,
  base,
  onSave,
  onToggle,
  onDelete,
}: {
  data: Overview;
  base: string;
  onSave: (p: {
    slug: string;
    description?: string;
    upstream_url: string;
    upstream_header_name?: string;
    upstream_header_value?: string;
  }) => Promise<void>;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [upstream, setUpstream] = useState("");
  const [headerName, setHeaderName] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setBusy(true);
          try {
            await onSave({
              slug: slug.trim().toLowerCase(),
              description,
              upstream_url: upstream.trim(),
              upstream_header_name: headerName.trim(),
              upstream_header_value: headerValue.trim(),
            });
            setSlug("");
            setDescription("");
            setUpstream("");
            setHeaderName("");
            setHeaderValue("");
          } catch (e2) {
            setErr((e2 as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-2xl border border-border bg-popover p-4"
      >
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Build your own API
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Point a slug at any upstream API you own a key for. The key stays server-side — callers
          only ever see your LaCzek endpoint.
        </p>
        <div className="grid gap-2">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug (e.g. weather)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={upstream}
            onChange={(e) => setUpstream(e.target.value)}
            placeholder="https://api.example.com/v1/data"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={headerName}
              onChange={(e) => setHeaderName(e.target.value)}
              placeholder="Upstream header name (e.g. Authorization)"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              value={headerValue}
              onChange={(e) => setHeaderValue(e.target.value)}
              placeholder="Upstream header value (their API key)"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        <button
          disabled={busy}
          className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Publish endpoint"}
        </button>
      </form>

      <div className="space-y-2">
        {data.endpoints.length === 0 && (
          <p className="text-xs text-muted-foreground">No custom endpoints yet.</p>
        )}
        {data.endpoints.map((ep) => (
          <div key={ep.id} className="rounded-2xl border border-border bg-popover p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">/custom/{ep.slug}</p>
                <p className="truncate text-xs text-muted-foreground">{ep.upstream_url}</p>
                {ep.description && <p className="text-[11px] text-muted-foreground">{ep.description}</p>}
                <div className="mt-1 flex items-center gap-2">
                  <code className="truncate text-[11px] text-primary">{`${base}/custom/${ep.slug}?key=YOUR_KEY`}</code>
                  <CopyBtn value={`${base}/custom/${ep.slug}?key=YOUR_KEY`} />
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => void onToggle(ep.id, !ep.active)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    ep.active ? "bg-emerald-500/15 text-emerald-500" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {ep.active ? "Live" : "Paused"}
                </button>
                <button onClick={() => void onDelete(ep.id)} className="rounded-full bg-secondary p-2">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PRESETS = [
  "/status",
  "/docs",
  "/movies/trending",
  "/movies/search?q=friday",
  "/tv/trending",
  "/search?q=avatar",
  "/sports/matches",
  "/sports/live",
];

function Playground({ base, keys }: { base: string; keys: Overview["keys"] }) {
  const [path, setPath] = useState("/movies/trending");
  const [key, setKey] = useState(keys[0]?.key ?? "");
  const [out, setOut] = useState("");
  const [status, setStatus] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setOut("");
    try {
      const sep = path.includes("?") ? "&" : "?";
      const r = await fetch(`${base}${path}${key ? `${sep}key=${encodeURIComponent(key)}` : ""}`);
      setStatus(r.status);
      setOut(await r.text());
    } catch (e) {
      setOut(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-popover p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPath(p)}
              className="rounded-full bg-secondary px-3 py-1 text-[11px] font-mono"
            >
              {p}
            </button>
          ))}
        </div>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
        <select
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">No key (public endpoints only)</option>
          {keys.map((k) => (
            <option key={k.id} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => void run()}
          disabled={busy}
          className="mt-3 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> {busy ? "Running…" : "Send request"}
        </button>
      </div>
      {status !== null && (
        <div className="rounded-2xl border border-border bg-popover p-4">
          <p className="mb-2 text-xs font-bold">
            HTTP <span className={status < 400 ? "text-emerald-500" : "text-destructive"}>{status}</span>
          </p>
          <pre className="max-h-96 overflow-auto rounded-xl bg-background p-3 text-[11px] leading-relaxed">
            {out}
          </pre>
        </div>
      )}
    </div>
  );
}

function Docs({ base, sampleKey }: { base: string; sampleKey: string }) {
  const rows: Array<[string, string, string]> = [
    ["GET /status", "No", "Health check — returns service name, version and time."],
    ["GET /docs", "No", "Machine-readable list of every endpoint."],
    ["GET /movies/trending", "Yes", "Trending movies of the week."],
    ["GET /movies/popular?page=1", "Yes", "Paginated popular movies."],
    ["GET /movies/search?q=", "Yes", "Search movies by title."],
    ["GET /tv/trending", "Yes", "Trending TV series."],
    ["GET /tv/search?q=", "Yes", "Search TV series."],
    ["GET /search?q=", "Yes", "Multi-search across movies and series."],
    ["GET /sports/matches", "Yes", "Today's sport fixtures with teams and kick-off."],
    ["GET /sports/live", "Yes", "Matches that are live right now."],
    ["GET /custom/{slug}", "Yes", "Your own endpoint, proxied to an upstream API."],
  ];

  const snippet = `fetch("${base}/movies/trending?key=${sampleKey}")
  .then((r) => r.json())
  .then(({ results }) => {
    results.forEach((m) => console.log(m.title, m.year, m.poster));
  });`;

  return (
    <div className="space-y-4 text-sm">
      <section className="rounded-2xl border border-border bg-popover p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <BookOpen className="h-4 w-4 text-primary" /> Getting started
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Every request goes to <code className="text-primary">{base}</code>. Authenticate with{" "}
          <code className="text-primary">?key=YOUR_KEY</code> or the{" "}
          <code className="text-primary">X-Api-Key</code> header. Responses are JSON and CORS is open,
          so the API can be called straight from any website.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-popover">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/60 text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Endpoint</th>
              <th className="p-3">Key</th>
              <th className="p-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(([e, a, d]) => (
              <tr key={e}>
                <td className="p-3 font-mono text-primary">{e}</td>
                <td className="p-3">{a}</td>
                <td className="p-3 text-muted-foreground">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-border bg-popover p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">JavaScript example</h2>
          <CopyBtn value={snippet} />
        </div>
        <pre className="overflow-auto rounded-xl bg-background p-3 text-[11px] leading-relaxed">
          {snippet}
        </pre>
      </section>

      <section className="rounded-2xl border border-border bg-popover p-4">
        <h2 className="text-sm font-bold">Errors</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li><code className="text-primary">401</code> — missing API key.</li>
          <li><code className="text-primary">403</code> — invalid or disabled key.</li>
          <li><code className="text-primary">404</code> — unknown endpoint or custom slug.</li>
          <li><code className="text-primary">502</code> — upstream provider failed.</li>
        </ul>
      </section>
    </div>
  );
}
