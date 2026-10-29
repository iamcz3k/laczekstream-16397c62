import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowUpRight, Banknote, Bell, CheckCircle2,
  ChevronDown, CreditCard, DollarSign, Download, Eye, FileDown, Filter,
  Landmark, Lock, MousePointerClick, Percent, Pencil, PiggyBank, Plus,
  RefreshCcw, Save, Send, Settings, Shield, Sparkles, Target, TrendingUp,
  Trophy, Users, Wallet, X,
} from "lucide-react";

export const Route = createFileRoute("/adminv2")({
  head: () => ({
    meta: [
      { title: "Revenue Dashboard — LaCzek Stream" },
      { name: "description", content: "Fake revenue command center for LaCzek Stream + Shopify with multi-currency, transfers and analytics." },
      { name: "robots", content: "noindex,nofollow" },
      { name: "theme-color", content: "#10b981" },
      { name: "apple-mobile-web-app-title", content: "LC Revenue" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
    ],
    links: [{ rel: "manifest", href: "/revenue-manifest.json" }],
  }),
  component: RevenuePage,
});

/* -------------------- currencies (UGX per 1 unit) -------------------- */

type Currency = { code: string; name: string; symbol: string; perUgxInverse: number };
// perUgxInverse = how many UGX per 1 unit of this currency.
// UGX is base (=1). Rates are indicative and editable by admin.
const CURRENCIES: Currency[] = [
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", perUgxInverse: 1 },
  { code: "USD", name: "US Dollar", symbol: "$", perUgxInverse: 3800 },
  { code: "EUR", name: "Euro", symbol: "€", perUgxInverse: 4100 },
  { code: "GBP", name: "British Pound", symbol: "£", perUgxInverse: 4800 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", perUgxInverse: 29 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", perUgxInverse: 1.5 },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw", perUgxInverse: 2.9 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", perUgxInverse: 2.5 },
  { code: "GHS", name: "Ghana Cedi", symbol: "₵", perUgxInverse: 260 },
  { code: "ZAR", name: "South African Rand", symbol: "R", perUgxInverse: 205 },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", perUgxInverse: 78 },
  { code: "MAD", name: "Moroccan Dirham", symbol: "DH", perUgxInverse: 380 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", perUgxInverse: 2800 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", perUgxInverse: 2500 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", perUgxInverse: 2300 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", perUgxInverse: 25 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", perUgxInverse: 530 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", perUgxInverse: 485 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", perUgxInverse: 2800 },
  { code: "KRW", name: "Korean Won", symbol: "₩", perUgxInverse: 2.8 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", perUgxInverse: 45 },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", perUgxInverse: 13.5 },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", perUgxInverse: 32 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", perUgxInverse: 0.24 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", perUgxInverse: 67 },
  { code: "THB", name: "Thai Baht", symbol: "฿", perUgxInverse: 108 },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", perUgxInverse: 0.15 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", perUgxInverse: 850 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", perUgxInverse: 110 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", perUgxInverse: 1034 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", perUgxInverse: 1013 },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", perUgxInverse: 1043 },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", perUgxInverse: 1030 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", perUgxInverse: 4300 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", perUgxInverse: 360 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", perUgxInverse: 350 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", perUgxInverse: 550 },
  { code: "PLN", name: "Polish Złoty", symbol: "zł", perUgxInverse: 950 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", perUgxInverse: 165 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", perUgxInverse: 10.5 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", perUgxInverse: 820 },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", perUgxInverse: 42 },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴", perUgxInverse: 92 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", perUgxInverse: 700 },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", perUgxInverse: 195 },
  { code: "ARS", name: "Argentine Peso", symbol: "$", perUgxInverse: 4 },
  { code: "CLP", name: "Chilean Peso", symbol: "$", perUgxInverse: 4 },
  { code: "COP", name: "Colombian Peso", symbol: "$", perUgxInverse: 0.95 },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/", perUgxInverse: 1020 },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br", perUgxInverse: 33 },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA", perUgxInverse: 6.2 },
  { code: "XOF", name: "West African CFA", symbol: "CFA", perUgxInverse: 6.2 },
  { code: "MZN", name: "Mozambican Metical", symbol: "MT", perUgxInverse: 60 },
  { code: "ZMW", name: "Zambian Kwacha", symbol: "ZK", perUgxInverse: 140 },
  { code: "BWP", name: "Botswana Pula", symbol: "P", perUgxInverse: 280 },
  { code: "USDT", name: "Tether (USDT)", symbol: "₮", perUgxInverse: 3800 },
];

const KEY_ROWS = "admin_v2_revenue_v2_rows";
const KEY_STATE = "admin_v2_revenue_v2_state";
const KEY_TX = "admin_v2_revenue_v2_tx";
const KEY_PAYOUTS = "admin_v2_revenue_v2_payouts";
const KEY_PIN = "admin_v2_revenue_v2_pin";
const KEY_LOCKED = "admin_v2_revenue_v2_locked";

type Source = "laczek" | "shopify";
type Period = "daily" | "weekly" | "monthly";
type DayRow = {
  date: string;
  laczek: { revenue: number; ads: number; users: number; clicks: number; impressions: number };
  shopify: { revenue: number; orders: number; users: number; conversion: number };
};

type State = {
  currency: string;
  goalMonthlyUgx: number;
  taxRatePct: number;
  costRatePct: number;
  notifications: boolean;
  autoPayout: boolean;
  theme: "dark" | "midnight" | "emerald";
};

type Provider = "mtn" | "airtel" | "bank" | "cashapp";
type Tx = {
  id: string;
  ts: number;
  direction: "out" | "in";
  provider: Provider;
  recipient: string;
  ref: string;
  amountUgx: number;
  currency: string;
  amountDisplay: number;
  status: "pending" | "success" | "failed";
  note?: string;
};

type Payout = {
  id: string;
  ts: number;
  amountUgx: number;
  provider: Provider;
  cadence: "weekly" | "monthly";
  destination: string;
  nextRun: number;
  active: boolean;
};

/* -------------------- helpers -------------------- */

function todayIso(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function seed(): DayRow[] {
  const rows: DayRow[] = [];
  for (let i = 89; i >= 0; i--) {
    const date = todayIso(i);
    const dow = new Date(date).getDay();
    const weekend = dow === 0 || dow === 6 ? 1.18 : 1;
    const wobble = 0.85 + ((i * 9301 + 49297) % 233) / 233 * 0.35;
    const laczekRev = Math.round(22_079_280 * weekend * wobble);
    const shopifyRev = Math.round(6_450_000 * weekend * (0.8 + ((i * 131) % 200) / 200 * 0.5));
    rows.push({
      date,
      laczek: {
        revenue: laczekRev, ads: Math.round(148_000 * weekend * wobble),
        users: Math.round(41_320 * weekend * wobble),
        clicks: Math.round(19_800 * weekend * wobble),
        impressions: Math.round(892_000 * weekend * wobble),
      },
      shopify: {
        revenue: shopifyRev, orders: Math.round(312 * weekend * wobble),
        users: Math.round(2_140 * weekend * wobble),
        conversion: Math.round(280 + ((i * 41) % 120)) / 100,
      },
    });
  }
  return rows;
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch {}
  return fallback;
}
function saveJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

const DEFAULT_STATE: State = {
  currency: "UGX", goalMonthlyUgx: 700_000_000, taxRatePct: 30, costRatePct: 22,
  notifications: true, autoPayout: false, theme: "dark",
};

function convertFromUgx(ugx: number, code: string): number {
  const c = CURRENCIES.find((x) => x.code === code) ?? CURRENCIES[0];
  return ugx / c.perUgxInverse;
}
function convertToUgx(amount: number, code: string): number {
  const c = CURRENCIES.find((x) => x.code === code) ?? CURRENCIES[0];
  return amount * c.perUgxInverse;
}
function fmtCurrency(ugx: number, code: string): string {
  const c = CURRENCIES.find((x) => x.code === code) ?? CURRENCIES[0];
  const v = convertFromUgx(ugx, code);
  const digits = v >= 1000 || code === "UGX" ? 0 : 2;
  const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
  return `${c.code} ${n}`;
}
function fmtBig(n: number): string { return new Intl.NumberFormat("en-US").format(Math.round(n)); }

function shortId(): string { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

const PROVIDERS: Record<Provider, { name: string; color: string; logo: React.ReactNode; note: string }> = {
  mtn: {
    name: "MTN MoMo", color: "#ffcc00", note: "Mobile Money · Uganda",
    logo: <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ffcc00] text-[10px] font-black text-black">MTN</div>,
  },
  airtel: {
    name: "Airtel Money", color: "#e60000", note: "Mobile Money · Uganda",
    logo: <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e60000] text-[9px] font-black text-white">Airtel</div>,
  },
  bank: {
    name: "Bank Transfer", color: "#0ea5e9", note: "IBAN / Account number",
    logo: <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0ea5e9] text-white"><Landmark className="h-4 w-4" /></div>,
  },
  cashapp: {
    name: "Cash App", color: "#00d64f", note: "$Cashtag",
    logo: <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00d64f] text-white"><DollarSign className="h-5 w-5" /></div>,
  },
};

/* -------------------- page -------------------- */

type Tab = "dashboard" | "send" | "tx" | "payouts" | "activity" | "settings";

function RevenuePage() {
  const [rows, setRows] = useState<DayRow[]>(() => loadJSON<DayRow[]>(KEY_ROWS, seed()));
  const [state, setState] = useState<State>(() => loadJSON<State>(KEY_STATE, DEFAULT_STATE));
  const [tx, setTx] = useState<Tx[]>(() => loadJSON<Tx[]>(KEY_TX, []));
  const [payouts, setPayouts] = useState<Payout[]>(() => loadJSON<Payout[]>(KEY_PAYOUTS, []));
  const [tab, setTab] = useState<Tab>("dashboard");
  const [editing, setEditing] = useState<DayRow | null>(null);
  const [locked, setLocked] = useState(() => {
    if (typeof window === "undefined") return false;
    const pin = localStorage.getItem(KEY_PIN);
    if (!pin) return false;
    return localStorage.getItem(KEY_LOCKED) !== "0";
  });

  useEffect(() => saveJSON(KEY_ROWS, rows), [rows]);
  useEffect(() => saveJSON(KEY_STATE, state), [state]);
  useEffect(() => saveJSON(KEY_TX, tx), [tx]);
  useEffect(() => saveJSON(KEY_PAYOUTS, payouts), [payouts]);

  if (locked) return <PinLock onUnlock={() => { localStorage.setItem(KEY_LOCKED, "0"); setLocked(false); }} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground">
      <TopBar
        state={state}
        setState={setState}
        onLock={() => { localStorage.setItem(KEY_LOCKED, "1"); setLocked(true); }}
      />
      <TabsBar tab={tab} setTab={setTab} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-4">
        {tab === "dashboard" && <Dashboard rows={rows} setRows={setRows} state={state} onEdit={setEditing} tx={tx} />}
        {tab === "send" && <SendMoney state={state} onSend={(t) => setTx((prev) => [t, ...prev])} />}
        {tab === "tx" && <TransactionsTab tx={tx} setTx={setTx} state={state} />}
        {tab === "payouts" && <PayoutsTab payouts={payouts} setPayouts={setPayouts} state={state} />}
        {tab === "activity" && <ActivityTab tx={tx} payouts={payouts} state={state} />}
        {tab === "settings" && <SettingsTab state={state} setState={setState} rows={rows} setRows={setRows} />}
      </main>

      {editing && (
        <EditModal row={editing} onClose={() => setEditing(null)} onSave={(next) => {
          setRows((prev) => prev.map((r) => (r.date === next.date ? next : r)));
          setEditing(null);
        }} />
      )}
    </div>
  );
}

/* -------------------- top bar / tabs -------------------- */

function TopBar({ state, setState, onLock }: { state: State; setState: (s: State) => void; onLock: () => void }) {
  const [openCcy, setOpenCcy] = useState(false);
  const [q, setQ] = useState("");
  const [installable, setInstallable] = useState<{ prompt: () => Promise<void> } | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      const be = e as unknown as { prompt: () => Promise<void> };
      setInstallable(be);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const filtered = useMemo(() => CURRENCIES.filter((c) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s);
  }), [q]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-[#0a0a0a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="rounded-full bg-secondary p-2 hover:bg-emerald-500 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Revenue</h1>
            <p className="text-[11px] text-muted-foreground">LaCzek Stream + Shopify · fake data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setOpenCcy((v) => !v)} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-emerald-500 hover:text-white">
              {state.currency} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {openCcy && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl">
                <input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search 55+ currencies…"
                  className="mb-2 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs outline-none focus:border-emerald-500"
                />
                <div className="max-h-72 overflow-y-auto">
                  {filtered.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setState({ ...state, currency: c.code }); setOpenCcy(false); }}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary ${state.currency === c.code ? "bg-emerald-500/15 text-emerald-400" : ""}`}
                    >
                      <span className="font-bold">{c.code}</span>
                      <span className="ml-2 flex-1 truncate text-muted-foreground">{c.name}</span>
                      <span className="text-muted-foreground">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {installable && (
            <button
              onClick={() => { void installable.prompt(); setInstallable(null); }}
              className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Install
            </button>
          )}
          <button onClick={onLock} className="rounded-full bg-secondary p-2 hover:bg-emerald-500 hover:text-white" aria-label="Lock">
            <Lock className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function TabsBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { k: Tab; l: string; i: React.ComponentType<{ className?: string }> }[] = [
    { k: "dashboard", l: "Dashboard", i: TrendingUp },
    { k: "send", l: "Send", i: Send },
    { k: "tx", l: "Transactions", i: Wallet },
    { k: "payouts", l: "Payouts", i: PiggyBank },
    { k: "activity", l: "Activity", i: Bell },
    { k: "settings", l: "Settings", i: Settings },
  ];
  return (
    <nav className="sticky top-[65px] z-10 border-b border-border/60 bg-[#0a0a0a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-2 no-scrollbar">
        {items.map(({ k, l, i: Icon }) => {
          const active = k === tab;
          return (
            <button key={k} onClick={() => setTab(k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                active ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* -------------------- dashboard -------------------- */

type Bucket = {
  label: string; laczekRevenue: number; shopifyRevenue: number;
  ads: number; laczekUsers: number; shopifyUsers: number; orders: number;
};
function aggregate(rows: DayRow[], period: Period): Bucket[] {
  if (period === "daily") return rows.slice(-30).map((r) => ({
    label: r.date.slice(5),
    laczekRevenue: r.laczek.revenue, shopifyRevenue: r.shopify.revenue,
    ads: r.laczek.ads, laczekUsers: r.laczek.users,
    shopifyUsers: r.shopify.users, orders: r.shopify.orders,
  }));
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    let key: string;
    if (period === "weekly") {
      const d = new Date(r.date); const wk = new Date(d);
      wk.setDate(d.getDate() - d.getDay()); key = wk.toISOString().slice(0, 10);
    } else key = r.date.slice(0, 7);
    const cur = map.get(key) ?? { label: key, laczekRevenue: 0, shopifyRevenue: 0, ads: 0, laczekUsers: 0, shopifyUsers: 0, orders: 0 };
    cur.laczekRevenue += r.laczek.revenue; cur.shopifyRevenue += r.shopify.revenue;
    cur.ads += r.laczek.ads; cur.laczekUsers += r.laczek.users;
    cur.shopifyUsers += r.shopify.users; cur.orders += r.shopify.orders;
    map.set(key, cur);
  }
  return Array.from(map.values());
}

function Dashboard({ rows, setRows, state, onEdit, tx }: {
  rows: DayRow[]; setRows: (r: DayRow[]) => void; state: State;
  onEdit: (r: DayRow) => void; tx: Tx[];
}) {
  const [period, setPeriod] = useState<Period>("daily");
  const [source, setSource] = useState<Source | "all">("all");
  const buckets = useMemo(() => aggregate(rows, period), [rows, period]);
  const chartValues = useMemo(() => buckets.map((b) =>
    source === "laczek" ? b.laczekRevenue : source === "shopify" ? b.shopifyRevenue : b.laczekRevenue + b.shopifyRevenue
  ), [buckets, source]);

  const totals = useMemo(() => {
    const last = buckets[buckets.length - 1]; const prev = buckets[buckets.length - 2];
    function pick(b: Bucket | undefined) {
      if (!b) return { revenue: 0, ads: 0, users: 0, orders: 0 };
      if (source === "laczek") return { revenue: b.laczekRevenue, ads: b.ads, users: b.laczekUsers, orders: 0 };
      if (source === "shopify") return { revenue: b.shopifyRevenue, ads: 0, users: b.shopifyUsers, orders: b.orders };
      return { revenue: b.laczekRevenue + b.shopifyRevenue, ads: b.ads, users: b.laczekUsers + b.shopifyUsers, orders: b.orders };
    }
    const t = pick(last); const p = pick(prev);
    return { ...t, delta: p.revenue ? ((t.revenue - p.revenue) / p.revenue) * 100 : 0 };
  }, [buckets, source]);

  // financials
  const monthUgx = useMemo(() => {
    const m = todayIso(0).slice(0, 7);
    return rows.filter((r) => r.date.startsWith(m)).reduce((a, r) => a + r.laczek.revenue + r.shopify.revenue, 0);
  }, [rows]);
  const goalPct = state.goalMonthlyUgx ? Math.min(100, (monthUgx / state.goalMonthlyUgx) * 100) : 0;
  const taxUgx = monthUgx * (state.taxRatePct / 100);
  const costUgx = monthUgx * (state.costRatePct / 100);
  const netUgx = monthUgx - taxUgx - costUgx;
  const marginPct = monthUgx ? (netUgx / monthUgx) * 100 : 0;
  const bestDay = useMemo(() => rows.slice().sort((a, b) => (b.laczek.revenue + b.shopify.revenue) - (a.laczek.revenue + a.shopify.revenue))[0], [rows]);
  const balanceUgx = useMemo(() => netUgx - tx.filter((t) => t.status === "success" && t.direction === "out").reduce((a, t) => a + t.amountUgx, 0), [netUgx, tx]);

  function addToday() {
    const date = todayIso(0); if (rows.some((r) => r.date === date)) return;
    const last = rows[rows.length - 1]; setRows([...rows, { ...last, date }]);
  }
  function reseed() {
    if (!confirm("Reset revenue to fresh fake seed data?")) return;
    setRows(seed());
  }

  return (
    <>
      {/* Balance card */}
      <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Available Balance</p>
        <p className="mt-1 text-3xl font-black tracking-tight">{fmtCurrency(balanceUgx, state.currency)}</p>
        <p className="text-[11px] text-muted-foreground">Net after tax {state.taxRatePct}% · costs {state.costRatePct}% · minus sent transfers</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={addToday} className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-black text-white hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> Add today
          </button>
          <button onClick={reseed} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-emerald-500 hover:text-white">
            <RefreshCcw className="h-3.5 w-3.5" /> Reseed
          </button>
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={period} onChange={(v) => setPeriod(v as Period)} options={[
          { v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }, { v: "monthly", l: "Monthly" },
        ]} />
        <span className="mx-2 h-6 w-px bg-border" />
        <Tabs value={source} onChange={(v) => setSource(v as Source | "all")} options={[
          { v: "all", l: "All" }, { v: "laczek", l: "LaCzek" }, { v: "shopify", l: "Shopify" },
        ]} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Revenue" value={fmtCurrency(totals.revenue, state.currency)} icon={DollarSign} delta={totals.delta} />
        <Kpi label="Ads Served" value={fmtBig(totals.ads)} icon={MousePointerClick} />
        <Kpi label="Users" value={fmtBig(totals.users)} icon={Users} />
        <Kpi label={source === "shopify" ? "Orders" : "Impr/Orders"} value={fmtBig(source === "shopify" ? totals.orders : totals.orders || Math.round(totals.ads * 5.5))} icon={Eye} />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Est. Tax" value={fmtCurrency(taxUgx, state.currency)} icon={Percent} />
        <Kpi label="Est. Costs" value={fmtCurrency(costUgx, state.currency)} icon={CreditCard} />
        <Kpi label="Net Profit" value={fmtCurrency(netUgx, state.currency)} icon={PiggyBank} />
        <Kpi label="Margin" value={`${marginPct.toFixed(1)}%`} icon={TrendingUp} />
      </div>

      {/* Goal */}
      <section className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-black">Monthly goal</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">{fmtCurrency(monthUgx, state.currency)} / {fmtCurrency(state.goalMonthlyUgx, state.currency)}</p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${goalPct}%` }} />
        </div>
        <p className="mt-2 text-[11px] font-bold text-emerald-400">{goalPct.toFixed(1)}% of goal</p>
      </section>

      {/* Chart */}
      <section className="rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black">Revenue trend</h2>
            <p className="text-[11px] text-muted-foreground">{period[0].toUpperCase() + period.slice(1)} · {source === "all" ? "Combined" : source === "laczek" ? "LaCzek" : "Shopify"}</p>
          </div>
          {bestDay && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-400">
              <Trophy className="h-3 w-3" /> Best: {bestDay.date.slice(5)}
            </div>
          )}
        </div>
        <Chart values={chartValues} labels={buckets.map((b) => b.label)} formatter={(v) => fmtCurrency(v, state.currency)} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <SourceCard title="LaCzek Stream" tone="bg-emerald-500/15 text-emerald-400" rows={buckets} pick={(b) => b.laczekRevenue} extra={(b) => `${fmtBig(b.ads)} ads · ${fmtBig(b.laczekUsers)} users`} state={state} />
        <SourceCard title="Shopify" tone="bg-sky-500/15 text-sky-400" rows={buckets} pick={(b) => b.shopifyRevenue} extra={(b) => `${fmtBig(b.orders)} orders · ${fmtBig(b.shopifyUsers)} users`} state={state} />
      </section>

      {/* Daily breakdown */}
      <section className="rounded-2xl border border-border bg-secondary/30">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-black">Daily breakdown</h2>
          <p className="text-[11px] text-muted-foreground">{rows.length} days · pencil to edit</p>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-secondary/80 backdrop-blur">
              <tr className="text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">LaCzek</th>
                <th className="px-3 py-2">Shopify</th>
                <th className="px-3 py-2">Ads</th>
                <th className="px-3 py-2">Users</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.date} className="border-t border-border/50 hover:bg-secondary/50">
                  <td className="px-3 py-2 font-mono">{r.date}</td>
                  <td className="px-3 py-2">{fmtCurrency(r.laczek.revenue, state.currency)}</td>
                  <td className="px-3 py-2">{fmtCurrency(r.shopify.revenue, state.currency)}</td>
                  <td className="px-3 py-2">{fmtBig(r.laczek.ads)}</td>
                  <td className="px-3 py-2">{fmtBig(r.laczek.users + r.shopify.users)}</td>
                  <td className="px-3 py-2 text-right font-bold">{fmtCurrency(r.laczek.revenue + r.shopify.revenue, state.currency)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => onEdit(r)} className="rounded-full bg-secondary p-1.5 hover:bg-emerald-500 hover:text-white" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* -------------------- send money -------------------- */

function SendMoney({ state, onSend }: { state: State; onSend: (t: Tx) => void }) {
  const [provider, setProvider] = useState<Provider>("mtn");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>(state.currency);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [pendingTx, setPendingTx] = useState<Tx | null>(null);

  useEffect(() => setCurrency(state.currency), [state.currency]);

  const placeholders: Record<Provider, string> = {
    mtn: "07XX XXX XXX (MTN)",
    airtel: "07XX XXX XXX (Airtel)",
    bank: "Bank name · Account number",
    cashapp: "$Cashtag",
  };

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !recipient.trim()) return;
    const ugx = convertToUgx(amt, currency);
    const t: Tx = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      ts: Date.now(), direction: "out", provider, recipient: recipient.trim(),
      ref: shortId() + shortId(), amountUgx: ugx, currency, amountDisplay: amt,
      status: "pending", note: note.trim() || undefined,
    };
    setPendingTx(t); setStep("processing");
    setTimeout(() => {
      const done: Tx = { ...t, status: "success" };
      onSend(done); setPendingTx(done); setStep("success");
    }, 1600);
  }
  function reset() {
    setRecipient(""); setAmount(""); setNote(""); setPendingTx(null); setStep("form");
  }

  if (step === "processing") {
    return (
      <section className="mt-10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-secondary/30 p-10 text-center">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500" />
        <p className="text-sm font-bold">Sending {fmtCurrency(convertToUgx(parseFloat(amount) || 0, currency), currency)}…</p>
        <p className="text-[11px] text-muted-foreground">Contacting {PROVIDERS[provider].name}</p>
      </section>
    );
  }
  if (step === "success" && pendingTx) return <SuccessScreen tx={pendingTx} onDone={reset} />;

  return (
    <>
      <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Send money</p>
        <p className="mt-1 text-sm text-muted-foreground">Fake transfers with real-looking receipts. Nothing leaves your device.</p>
      </section>

      <section>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Payment method</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(Object.keys(PROVIDERS) as Provider[]).map((p) => {
            const info = PROVIDERS[p]; const active = p === provider;
            return (
              <button key={p} onClick={() => setProvider(p)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-secondary/40 hover:border-emerald-500/60"}`}>
                {info.logo}
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{info.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{info.note}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
        <Label>Recipient
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder={placeholders[provider]}
            className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </Label>
        <div className="flex gap-2">
          <Label className="flex-1">Amount
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-lg font-black outline-none focus:border-emerald-500" />
          </Label>
          <Label className="w-32">Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-2 py-2.5 text-sm outline-none focus:border-emerald-500">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </Label>
        </div>
        {amount && parseFloat(amount) > 0 && currency !== "UGX" && (
          <p className="text-[11px] text-muted-foreground">≈ {fmtCurrency(convertToUgx(parseFloat(amount), currency), "UGX")}</p>
        )}
        <Label>Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="For services rendered"
            className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
        </Label>
        <button onClick={submit} disabled={!amount || !recipient}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-40">
          <Send className="h-4 w-4" /> Send {amount ? fmtCurrency(convertToUgx(parseFloat(amount) || 0, currency), currency) : ""}
        </button>
      </section>
    </>
  );
}

function SuccessScreen({ tx, onDone }: { tx: Tx; onDone: () => void }) {
  const p = PROVIDERS[tx.provider];
  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-transparent">
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-lg font-black">Payment Successful</p>
        <p className="text-4xl font-black tracking-tight">{fmtCurrency(tx.amountUgx, tx.currency)}</p>
        <p className="text-xs text-muted-foreground">to {tx.recipient}</p>
      </div>
      <div className="mx-4 rounded-2xl bg-secondary/60 p-4 text-xs">
        <Row2 label="Recipient" value={tx.recipient} />
        <Row2 label="Method" value={<span className="flex items-center gap-2">{p.logo}<span className="font-bold">{p.name}</span></span>} />
        <Row2 label="Reference" value={<span className="font-mono">{tx.ref}</span>} />
        <Row2 label="Time" value={new Date(tx.ts).toLocaleString()} />
        <Row2 label="Currency" value={`${tx.currency} (${tx.amountDisplay})`} />
        {tx.note && <Row2 label="Note" value={tx.note} />}
        <Row2 label="Status" value={<span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-400">SUCCESS</span>} last />
      </div>
      <div className="mx-4 mb-4 mt-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 p-3 text-[11px]">
        <span className="font-black text-emerald-400">Cashback</span>
        <span className="ml-2 text-muted-foreground">Earn 0.5% back on your next transfer.</span>
      </div>
      <div className="flex gap-2 p-4">
        <button onClick={onDone} className="flex-1 rounded-full bg-secondary py-3 text-sm font-bold hover:bg-emerald-500 hover:text-white">Send another</button>
      </div>
    </section>
  );
}
function Row2({ label, value, last }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-border/60"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right">{value}</span>
    </div>
  );
}

/* -------------------- transactions -------------------- */

function TransactionsTab({ tx, setTx, state }: { tx: Tx[]; setTx: (t: Tx[]) => void; state: State }) {
  const [q, setQ] = useState(""); const [filter, setFilter] = useState<"all" | Provider>("all");
  const filtered = useMemo(() => tx.filter((t) => {
    if (filter !== "all" && t.provider !== filter) return false;
    const s = q.trim().toLowerCase(); if (!s) return true;
    return t.recipient.toLowerCase().includes(s) || t.ref.toLowerCase().includes(s);
  }), [tx, q, filter]);

  function exportCsv() {
    const header = "id,time,provider,direction,recipient,ref,amount_ugx,currency,amount_display,status,note\n";
    const body = filtered.map((t) =>
      [t.id, new Date(t.ts).toISOString(), t.provider, t.direction, `"${t.recipient}"`, t.ref, t.amountUgx, t.currency, t.amountDisplay, t.status, `"${(t.note ?? "").replace(/"/g, '""')}"`].join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `revenue-transactions-${todayIso(0)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function refund(id: string) {
    if (!confirm("Mark this transaction as refunded (adds an incoming entry)?")) return;
    const orig = tx.find((t) => t.id === id); if (!orig) return;
    const ref: Tx = { ...orig, id: crypto.randomUUID?.() ?? String(Date.now()), direction: "in", status: "success", ts: Date.now(), ref: "R-" + orig.ref, note: "Refund of " + orig.ref };
    setTx([ref, ...tx]);
  }

  return (
    <>
      <section className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipient / ref…"
          className="flex-1 min-w-40 rounded-full border border-border bg-secondary/50 px-4 py-2 text-xs outline-none focus:border-emerald-500" />
        <div className="inline-flex rounded-full bg-secondary p-1 text-xs">
          {(["all", "mtn", "airtel", "bank", "cashapp"] as const).map((v) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-full px-3 py-1 font-bold ${filter === v ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {v === "all" ? "All" : PROVIDERS[v].name}
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-bold hover:bg-emerald-500 hover:text-white">
          <FileDown className="h-3.5 w-3.5" /> Export CSV
        </button>
      </section>

      <section className="divide-y divide-border rounded-2xl border border-border bg-secondary/30">
        {filtered.length === 0 && <p className="p-6 text-center text-xs text-muted-foreground">No transactions yet.</p>}
        {filtered.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3">
            <div>{PROVIDERS[t.provider].logo}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">{t.recipient}</p>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase ${
                  t.status === "success" ? "bg-emerald-500/20 text-emerald-400" :
                  t.status === "failed" ? "bg-destructive/20 text-destructive" : "bg-yellow-500/20 text-yellow-400"
                }`}>{t.status}</span>
              </div>
              <p className="truncate text-[10px] text-muted-foreground">{new Date(t.ts).toLocaleString()} · {t.ref}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-black ${t.direction === "out" ? "text-destructive" : "text-emerald-400"}`}>
                {t.direction === "out" ? "-" : "+"}{fmtCurrency(t.amountUgx, state.currency)}
              </p>
              {t.direction === "out" && t.status === "success" && (
                <button onClick={() => refund(t.id)} className="mt-1 text-[10px] font-bold text-muted-foreground hover:text-emerald-400">Refund</button>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

/* -------------------- payouts -------------------- */

function PayoutsTab({ payouts, setPayouts, state }: { payouts: Payout[]; setPayouts: (p: Payout[]) => void; state: State }) {
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState<Provider>("bank");
  const [destination, setDestination] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");

  function schedule() {
    const amt = parseFloat(amount); if (!amt || !destination.trim()) return;
    const p: Payout = {
      id: crypto.randomUUID?.() ?? String(Date.now()), ts: Date.now(),
      amountUgx: convertToUgx(amt, state.currency), provider, cadence,
      destination: destination.trim(),
      nextRun: Date.now() + (cadence === "weekly" ? 7 : 30) * 24 * 3600 * 1000, active: true,
    };
    setPayouts([p, ...payouts]); setAmount(""); setDestination("");
  }
  function toggle(id: string) { setPayouts(payouts.map((p) => p.id === id ? { ...p, active: !p.active } : p)); }
  function remove(id: string) { setPayouts(payouts.filter((p) => p.id !== id)); }

  return (
    <>
      <section className="rounded-3xl border border-emerald-500/30 bg-secondary/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Schedule auto-payout</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Label>Amount ({state.currency})
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </Label>
          <Label>Method
            <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500">
              {(Object.keys(PROVIDERS) as Provider[]).map((p) => <option key={p} value={p}>{PROVIDERS[p].name}</option>)}
            </select>
          </Label>
          <Label>Destination
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Account / tag / number"
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </Label>
          <Label>Cadence
            <select value={cadence} onChange={(e) => setCadence(e.target.value as "weekly" | "monthly")}
              className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500">
              <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
          </Label>
        </div>
        <button onClick={schedule} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-sm font-black text-white">
          <PiggyBank className="h-4 w-4" /> Schedule payout
        </button>
      </section>

      <section className="divide-y divide-border rounded-2xl border border-border bg-secondary/30">
        {payouts.length === 0 && <p className="p-6 text-center text-xs text-muted-foreground">No scheduled payouts.</p>}
        {payouts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            {PROVIDERS[p.provider].logo}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{p.destination}</p>
              <p className="truncate text-[10px] text-muted-foreground">{p.cadence} · next {new Date(p.nextRun).toLocaleDateString()}</p>
            </div>
            <p className="text-sm font-black text-emerald-400">{fmtCurrency(p.amountUgx, state.currency)}</p>
            <button onClick={() => toggle(p.id)} className={`rounded-full px-2 py-1 text-[10px] font-black ${p.active ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
              {p.active ? "ACTIVE" : "PAUSED"}
            </button>
            <button onClick={() => remove(p.id)} className="rounded-full bg-secondary p-1.5 hover:bg-destructive hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </section>
    </>
  );
}

/* -------------------- activity -------------------- */

function ActivityTab({ tx, payouts, state }: { tx: Tx[]; payouts: Payout[]; state: State }) {
  const items = useMemo(() => {
    const events: { ts: number; icon: React.ComponentType<{ className?: string }>; title: string; sub: string; tone: string }[] = [];
    for (const t of tx) events.push({
      ts: t.ts, icon: t.direction === "out" ? ArrowUpRight : ArrowDownRight,
      title: `${t.direction === "out" ? "Sent" : "Received"} ${fmtCurrency(t.amountUgx, state.currency)}`,
      sub: `${PROVIDERS[t.provider].name} · ${t.recipient} · ${t.status}`,
      tone: t.direction === "out" ? "text-destructive" : "text-emerald-400",
    });
    for (const p of payouts) events.push({
      ts: p.ts, icon: PiggyBank, title: `Payout scheduled ${fmtCurrency(p.amountUgx, state.currency)}`,
      sub: `${p.cadence} · ${p.destination}`, tone: "text-emerald-400",
    });
    return events.sort((a, b) => b.ts - a.ts);
  }, [tx, payouts, state.currency]);

  if (items.length === 0) return <p className="mt-10 text-center text-xs text-muted-foreground">No activity yet — send money or schedule a payout.</p>;
  return (
    <ol className="space-y-2">
      {items.map((e, i) => (
        <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
          <div className={`rounded-full bg-secondary p-2 ${e.tone}`}><e.icon className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{e.title}</p>
            <p className="truncate text-[10px] text-muted-foreground">{e.sub}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">{new Date(e.ts).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}

/* -------------------- settings -------------------- */

function SettingsTab({ state, setState, rows, setRows }: { state: State; setState: (s: State) => void; rows: DayRow[]; setRows: (r: DayRow[]) => void }) {
  const [pin, setPin] = useState("");
  const [hasPin, setHasPin] = useState<boolean>(() => typeof window !== "undefined" && !!localStorage.getItem(KEY_PIN));

  function savePin() {
    if (!/^\d{4,8}$/.test(pin)) { alert("PIN must be 4-8 digits."); return; }
    localStorage.setItem(KEY_PIN, pin); localStorage.setItem(KEY_LOCKED, "0"); setHasPin(true); setPin("");
  }
  function removePin() { localStorage.removeItem(KEY_PIN); localStorage.removeItem(KEY_LOCKED); setHasPin(false); }

  function exportAll() {
    const data = { rows, state, ts: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `revenue-backup-${todayIso(0)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const fileRef = useRef<HTMLInputElement>(null);
  function importAll(f: File) {
    const r = new FileReader(); r.onload = () => {
      try {
        const p = JSON.parse(String(r.result));
        if (Array.isArray(p.rows)) setRows(p.rows);
        if (p.state) setState({ ...state, ...p.state });
        alert("Imported.");
      } catch { alert("Invalid file."); }
    }; r.readAsText(f);
  }

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Financials</p>
        <Label>Monthly goal ({state.currency})
          <input value={convertFromUgx(state.goalMonthlyUgx, state.currency).toFixed(0)} onChange={(e) => setState({ ...state, goalMonthlyUgx: convertToUgx(parseFloat(e.target.value) || 0, state.currency) })}
            inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Label>Tax rate (%)
            <input value={String(state.taxRatePct)} onChange={(e) => setState({ ...state, taxRatePct: parseFloat(e.target.value) || 0 })}
              inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </Label>
          <Label>Cost rate (%)
            <input value={String(state.costRatePct)} onChange={(e) => setState({ ...state, costRatePct: parseFloat(e.target.value) || 0 })}
              inputMode="decimal" className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
          </Label>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Preferences</p>
        <Toggle label="Notifications" desc="Show revenue alerts inside the app." value={state.notifications} onChange={(v) => setState({ ...state, notifications: v })} />
        <Toggle label="Auto-run payouts" desc="Automatically process scheduled payouts (fake)." value={state.autoPayout} onChange={(v) => setState({ ...state, autoPayout: v })} />
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Security</p>
        {hasPin ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">PIN lock enabled.</p>
            <button onClick={removePin} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-destructive hover:text-white">Remove PIN</button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Label className="flex-1">Set 4-8 digit PIN
              <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={8}
                className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </Label>
            <button onClick={savePin} className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-black text-white"><Shield className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Backup</p>
        <div className="flex gap-2">
          <button onClick={exportAll} className="flex-1 flex items-center justify-center gap-1 rounded-full bg-secondary py-2 text-xs font-bold hover:bg-emerald-500 hover:text-white">
            <FileDown className="h-3.5 w-3.5" /> Export JSON
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 flex items-center justify-center gap-1 rounded-full bg-secondary py-2 text-xs font-bold hover:bg-emerald-500 hover:text-white">
            <Filter className="h-3.5 w-3.5" /> Import JSON
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} />
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">About</p>
        <p className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Multi-currency (55+), fake CashApp-style transfers.</p>
        <p className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5 text-emerald-400" /> MTN MoMo · Airtel Money UG · Bank · Cash App.</p>
        <p className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-emerald-400" /> Local data only. Nothing leaves your device.</p>
      </section>
    </>
  );
}

/* -------------------- PIN lock screen -------------------- */

function PinLock({ onUnlock }: { onUnlock: () => void }) {
  const [entry, setEntry] = useState("");
  const [err, setErr] = useState(false);
  function submit() {
    const saved = localStorage.getItem(KEY_PIN) || "";
    if (entry === saved) onUnlock(); else { setErr(true); setEntry(""); setTimeout(() => setErr(false), 800); }
  }
  return (
    <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-[#0a0a0a] p-8">
      <div className="rounded-full bg-emerald-500/15 p-4 text-emerald-400"><Lock className="h-8 w-8" /></div>
      <p className="mt-4 text-lg font-black">Revenue is locked</p>
      <p className="text-xs text-muted-foreground">Enter your PIN to continue.</p>
      <input value={entry} onChange={(e) => setEntry(e.target.value)} inputMode="numeric" autoFocus maxLength={8}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className={`mt-6 w-48 rounded-2xl border-2 bg-secondary/40 px-4 py-3 text-center text-2xl font-black tracking-[0.5em] outline-none ${err ? "border-destructive animate-pulse" : "border-border focus:border-emerald-500"}`} />
      <button onClick={submit} className="mt-4 rounded-full bg-emerald-500 px-6 py-2 text-sm font-black text-white">Unlock</button>
    </div>
  );
}

/* -------------------- shared UI -------------------- */

function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${value === o.v ? "bg-emerald-500 text-white" : "text-muted-foreground hover:text-foreground"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}
function Kpi({ label, value, icon: Icon, delta }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; delta?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-base font-black tracking-tight">{value}</p>
      {typeof delta === "number" && (
        <p className={`mt-1 text-[11px] font-bold ${delta >= 0 ? "text-emerald-400" : "text-destructive"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs prev
        </p>
      )}
    </div>
  );
}
function Chart({ values, labels, formatter }: { values: number[]; labels: string[]; formatter?: (v: number) => string }) {
  const W = 720, H = 200, pad = 24;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => [pad + i * step, H - pad - (v / max) * (H - pad * 2)] as const);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1]?.[0] ?? pad},${H - pad} L${pad},${H - pad} Z`;
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#rev-fill)" />
      <path d={path} fill="none" stroke="#10b981" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="#10b981" />)}
      {last && formatter && (
        <text x={last[0]} y={Math.max(12, last[1] - 8)} fontSize="10" textAnchor="end" fill="#10b981" fontWeight="700">
          {formatter(values[values.length - 1])}
        </text>
      )}
      {labels.map((l, i) => (
        i % Math.ceil(labels.length / 6) === 0 ? (
          <text key={i} x={pad + i * step} y={H - 6} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.5">{l}</text>
        ) : null
      ))}
    </svg>
  );
}
function SourceCard({ title, tone, rows, pick, extra, state }: {
  title: string; tone: string; rows: Bucket[]; pick: (b: Bucket) => number; extra: (b: Bucket) => string; state: State;
}) {
  const total = rows.reduce((a, b) => a + pick(b), 0);
  const last = rows[rows.length - 1]; const max = Math.max(1, ...rows.map(pick));
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${tone}`}>{title}</span>
        <span className="text-[11px] text-muted-foreground">{extra(last)}</span>
      </div>
      <p className="mt-2 text-xl font-black">{fmtCurrency(total, state.currency)}</p>
      <p className="text-[11px] text-muted-foreground">Latest: {fmtCurrency(pick(last), state.currency)}</p>
      <div className="mt-3 flex h-16 items-end gap-[2px]">
        {rows.map((b, i) => (
          <div key={i} className="flex-1 rounded-t bg-emerald-500/60" style={{ height: `${(pick(b) / max) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
function EditModal({ row, onClose, onSave }: { row: DayRow; onClose: () => void; onSave: (r: DayRow) => void }) {
  const [draft, setDraft] = useState<DayRow>(row);
  function num(v: string): number { const n = Number(v.replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/85 p-0 backdrop-blur-xl sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-3xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl sm:max-w-md sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black">Edit revenue</h3>
            <p className="text-[11px] text-muted-foreground">{draft.date}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <fieldset className="space-y-2 rounded-xl border border-border p-3">
            <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">LaCzek Stream</legend>
            <Field label="Revenue (UGX)" value={draft.laczek.revenue} onChange={(v) => setDraft({ ...draft, laczek: { ...draft.laczek, revenue: num(v) } })} />
            <Field label="Ads served" value={draft.laczek.ads} onChange={(v) => setDraft({ ...draft, laczek: { ...draft.laczek, ads: num(v) } })} />
            <Field label="Users" value={draft.laczek.users} onChange={(v) => setDraft({ ...draft, laczek: { ...draft.laczek, users: num(v) } })} />
            <Field label="Clicks" value={draft.laczek.clicks} onChange={(v) => setDraft({ ...draft, laczek: { ...draft.laczek, clicks: num(v) } })} />
            <Field label="Impressions" value={draft.laczek.impressions} onChange={(v) => setDraft({ ...draft, laczek: { ...draft.laczek, impressions: num(v) } })} />
          </fieldset>
          <fieldset className="space-y-2 rounded-xl border border-border p-3">
            <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-sky-400">Shopify</legend>
            <Field label="Revenue (UGX)" value={draft.shopify.revenue} onChange={(v) => setDraft({ ...draft, shopify: { ...draft.shopify, revenue: num(v) } })} />
            <Field label="Orders" value={draft.shopify.orders} onChange={(v) => setDraft({ ...draft, shopify: { ...draft.shopify, orders: num(v) } })} />
            <Field label="Users" value={draft.shopify.users} onChange={(v) => setDraft({ ...draft, shopify: { ...draft.shopify, users: num(v) } })} />
            <Field label="Conversion (%)" value={draft.shopify.conversion} onChange={(v) => setDraft({ ...draft, shopify: { ...draft.shopify, conversion: num(v) } })} />
          </fieldset>
          <button onClick={() => onSave(draft)} className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 text-sm font-black text-white hover:opacity-90">
            <Save className="h-4 w-4" /> Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <input value={String(value)} onChange={(e) => onChange(e.target.value)} inputMode="decimal"
        className="w-40 rounded-lg border border-border bg-secondary/50 px-2 py-1.5 text-right font-mono outline-none focus:border-emerald-500" />
    </label>
  );
}
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-xs font-bold text-muted-foreground ${className ?? ""}`}>{children}</label>;
}
function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-left">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? "bg-emerald-500" : "bg-border"}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
