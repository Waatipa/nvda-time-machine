import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef } from "react";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip,
} from "recharts";
import { getNvdaHistory } from "@/lib/nvda.functions";
import { simulate, resample, usd, fmtDate, type Mode, type Frame } from "@/lib/calc";

const nvdaQuery = queryOptions({
  queryKey: ["nvda"],
  queryFn: () => getNvdaHistory(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NVIDIA Time Machine — NVDA Historical Investment Calculator" },
      { name: "description", content: "See what any one-time or monthly NVIDIA (NVDA) investment would be worth today, using real historical market data." },
      { property: "og:title", content: "NVIDIA Time Machine — NVDA Investment Calculator" },
      { property: "og:description", content: "Real NVDA history. Drag through time to see value, profit, and ROI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(nvdaQuery),
  component: Index,
});

const PRESETS = [1, 5, 10, 15, 20, 25];
const FRAMES: { k: Frame; l: string }[] = [
  { k: "D", l: "Daily" }, { k: "W", l: "Weekly" }, { k: "M", l: "Monthly" }, { k: "Y", l: "Yearly" },
];

function Index() {
  const { data } = useSuspenseQuery(nvdaQuery);
  const pts = data.points;
  const [amount, setAmount] = useState(1000);
  const [mode, setMode] = useState<Mode>("once");
  const [frame, setFrame] = useState<Frame>("M");
  const defaultStart = useMemo(() => {
    const target = Date.now() - 10 * 365.25 * 86400000;
    return Math.max(0, pts.findIndex((p) => p.t >= target));
  }, [pts]);
  const [startIdx, setStartIdx] = useState(defaultStart);
  const [cursor, setCursor] = useState<number | null>(null);
  const dragging = useRef(false);

  const rows = useMemo(() => simulate(pts, startIdx, amount || 0, mode), [pts, startIdx, amount, mode]);
  const series = useMemo(() => resample(rows, frame), [rows, frame]);
  const ci = cursor == null || cursor >= series.length ? series.length - 1 : cursor;
  const sel = series[ci];
  const profit = sel ? sel.value - sel.invested : 0;
  const roi = sel && sel.invested ? (profit / sel.invested) * 100 : 0;
  const years = sel ? (sel.t - rows[0].t) / (365.25 * 86400000) : 0;
  const cagr = mode === "once" && years > 0.1 && sel ? (Math.pow(sel.value / sel.invested, 1 / years) - 1) * 100 : null;
  const up = profit >= 0;

  const setPreset = (y: number) => {
    const target = Date.now() - y * 365.25 * 86400000;
    const i = pts.findIndex((p) => p.t >= target);
    setStartIdx(Math.max(0, i)); setCursor(null);
  };
  const isoStart = new Date(pts[startIdx].t).toISOString().slice(0, 10);
  const onDate = (v: string) => {
    const t = Date.parse(v + "T00:00:00Z");
    if (isNaN(t)) return;
    const i = pts.findIndex((p) => p.t >= t);
    setStartIdx(i < 0 ? pts.length - 1 : i); setCursor(null);
  };
  const handleMove = (s: any, force = false) => {
    if ((dragging.current || force) && s?.activeTooltipIndex != null) setCursor(s.activeTooltipIndex);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">N</div>
            <div>
              <div className="font-display text-lg font-semibold leading-none">NVIDIA Time Machine</div>
              <div className="text-xs text-muted-foreground">NASDAQ: NVDA</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Live price
            </div>
            <div className="font-display text-2xl font-semibold tabular-nums">{usd(data.livePrice)}</div>
            <div className="text-[11px] text-muted-foreground">as of {new Date(data.liveTime).toLocaleString()}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          What if you had invested in <span className="text-primary-deep">NVIDIA</span>?
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Real NVDA closing prices since its 1999 IPO, adjusted for stock splits and dividends. Drag across the chart to travel through time.
        </p>

        <section className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-soft md:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {mode === "once" ? "Investment" : "Monthly amount"}
            </span>
            <div className="mt-2 flex items-center rounded-lg border border-input px-3 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-muted-foreground">$</span>
              <input type="number" min={1} value={amount || ""}
                onChange={(e) => { setAmount(Math.max(0, Number(e.target.value))); }}
                className="w-full bg-transparent px-2 py-2.5 text-lg font-semibold tabular-nums outline-none" />
            </div>
          </label>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Strategy</span>
            <div className="mt-2 grid grid-cols-2 rounded-lg bg-secondary p-1">
              {(["once", "monthly"] as Mode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setCursor(null); }}
                  className={`rounded-md py-2 text-sm font-medium transition ${mode === m ? "bg-card shadow-soft" : "text-muted-foreground"}`}>
                  {m === "once" ? "One-time" : "Monthly"}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</span>
            <input type="date" value={isoStart} min={new Date(pts[0].t).toISOString().slice(0, 10)}
              max={new Date(pts[pts.length - 1].t).toISOString().slice(0, 10)}
              onChange={(e) => onDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quick pick</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((y) => (
                <button key={y} onClick={() => setPreset(y)}
                  className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:border-primary hover:bg-accent">{y}y</button>
              ))}
              <button onClick={() => { setStartIdx(0); setCursor(null); }}
                className="rounded-md border border-border px-2.5 py-1.5 text-sm hover:border-primary hover:bg-accent">IPO</button>
            </div>
          </div>
        </section>

        {sel && (
          <section className="mt-6 grid gap-4 md:grid-cols-5">
            <Stat label={`Value on ${fmtDate(sel.t)}`} value={usd(sel.value)} big />
            <Stat label="Total invested" value={usd(sel.invested)} />
            <Stat label="Profit / Loss" value={(up ? "+" : "") + usd(profit)} tone={up ? "up" : "down"} />
            <Stat label="ROI / Total return" value={`${up ? "+" : ""}${roi.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`} tone={up ? "up" : "down"} />
            <Stat label={cagr != null ? "Annualized (CAGR)" : "Shares owned"}
              value={cagr != null ? `${cagr.toFixed(2)}%/yr` : sel.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} />
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              NVDA adj. price on {sel && fmtDate(sel.t)}: <span className="font-semibold text-foreground">{sel && usd(sel.price)}</span>
            </div>
            <div className="flex rounded-lg bg-secondary p-1">
              {FRAMES.map((f) => (
                <button key={f.k} onClick={() => { setFrame(f.k); setCursor(null); }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${frame === f.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 h-[420px] cursor-ew-resize select-none"
            onMouseUp={() => (dragging.current = false)} onMouseLeave={() => (dragging.current = false)}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onMouseDown={(s) => { dragging.current = true; handleMove(s, true); }}
                onMouseMove={(s) => handleMove(s)}
                onClick={(s) => handleMove(s, true)}>
                <defs>
                  <linearGradient id="fillV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time"
                  tickFormatter={(t) => new Date(t).getUTCFullYear().toString()} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis tickFormatter={(v) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}k` : `$${v.toFixed(0)}`)}
                  stroke="var(--muted-foreground)" fontSize={12} width={60} />
                <Tooltip content={() => null} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
                <Area dataKey="value" stroke="var(--primary-deep)" strokeWidth={2} fill="url(#fillV)" isAnimationActive={false} />
                <Line dataKey="invested" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} isAnimationActive={false} />
                {sel && <ReferenceLine x={sel.t} stroke="var(--primary-deep)" strokeWidth={2}
                  label={{ value: fmtDate(sel.t), position: "insideTopRight", fill: "var(--foreground)", fontSize: 12 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <input type="range" min={0} max={series.length - 1} value={ci}
            onChange={(e) => setCursor(Number(e.target.value))}
            className="mt-4 w-full accent-[var(--primary-deep)]" aria-label="Historical date cursor" />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{fmtDate(series[0].t)}</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-primary-deep" />Portfolio value</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-muted-foreground" />Amount invested</span>
            </span>
            <span>{fmtDate(series[series.length - 1].t)}</span>
          </div>
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Data: Yahoo Finance daily NVDA history ({pts.length.toLocaleString()} trading days), refreshed every minute. Calculations use split- and dividend-adjusted closes; monthly buys occur on the first trading day of each month. Excludes taxes and fees. Not financial advice.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: string; tone?: "up" | "down"; big?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${big ? "border-primary bg-accent" : "border-border bg-card"}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-xl font-semibold tabular-nums break-all ${tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
