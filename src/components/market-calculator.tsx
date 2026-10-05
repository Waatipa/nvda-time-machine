import { Suspense, useMemo, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip } from "recharts";
import { COMPANIES, TIMELINES, marketQuery, type Symbol, type Timeline } from "@/lib/markets";
import { simulate, usd, fmtDate, type Mode } from "@/lib/calc";
import { Button } from "@/components/ui/button";

export function MarketCalculator() {
  const [symbol, setSymbol] = useState<Symbol>("NVDA");
  const [range, setRange] = useState<Timeline>("5y");
  const [amount, setAmount] = useState(1000);
  const [mode, setMode] = useState<Mode>("once");
  const company = COMPANIES.find((c) => c.symbol === symbol);
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="text-xs font-medium uppercase tracking-wide text-primary-deep">Magnificent Seven · Investment Time Machine</div>
    <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Nvestico Academy</h1>
    <div className="mt-6 flex flex-wrap gap-2" aria-label="Companies">
      {COMPANIES.map((c) => <Button key={c.symbol} variant={symbol === c.symbol ? "default" : "outline"}
        aria-pressed={symbol === c.symbol} onClick={() => setSymbol(c.symbol)}>{c.name} <span className="text-xs opacity-70">{c.symbol}</span></Button>)}
    </div>
    <section className="mt-6 grid gap-5 border-y border-border py-5 sm:grid-cols-2">
      <label><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{mode === "once" ? "Investment (USD)" : "Monthly investment (USD)"}</span>
        <div className="mt-2 flex max-w-sm items-center rounded-md border border-input px-3 focus-within:ring-2 focus-within:ring-ring"><span>$</span>
          <input aria-label="Investment amount" type="number" min="1" value={amount || ""} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} className="w-full bg-transparent px-2 py-2 text-lg font-semibold outline-none" />
        </div>
      </label>
      <div><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Strategy</span><div className="mt-2 flex gap-1">
        {(["once", "monthly"] as const).map((m) => <Button key={m} variant={mode === m ? "secondary" : "ghost"} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "once" ? "One-time" : "Monthly"}</Button>)}
      </div></div>
    </section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold">{company?.name} <span className="text-sm text-muted-foreground">{symbol}</span></h2>
      <div className="flex flex-wrap gap-1" aria-label="Chart timeline">{TIMELINES.map((t) => <Button key={t.key} size="sm" variant={range === t.key ? "default" : "ghost"} aria-pressed={range === t.key} onClick={() => setRange(t.key)}>{t.label}</Button>)}</div>
    </div>
    <Suspense fallback={<div className="grid h-[500px] place-items-center text-muted-foreground" role="status">Loading market prices…</div>}>
      <MarketResults key={`${symbol}-${range}-${mode}`} symbol={symbol} range={range} amount={amount} mode={mode} />
    </Suspense>
  </main>;
}

function MarketResults({ symbol, range, amount, mode }: { symbol: Symbol; range: Timeline; amount: number; mode: Mode }) {
  const { data, isFetching, isRefetchError } = useSuspenseQuery(marketQuery(symbol, range));
  const [cursor, setCursor] = useState<number | null>(null);
  const dragging = useRef(false);
  const rows = useMemo(() => simulate(data.points, 0, amount, mode), [data.points, amount, mode]);
  const index = cursor == null ? rows.length - 1 : Math.min(cursor, rows.length - 1);
  const sel = rows[index];
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!sel || !first || !last) return <p role="status">No prices available for this period.</p>;
  const profit = sel.value - sel.invested;
  const roi = sel.invested ? profit / sel.invested * 100 : 0;
  const intraday = range === "1d" || range === "5d";
  const dateLabel = (t: number) => intraday ? new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : fmtDate(t);
  const move = (s: { activeTooltipIndex?: string | number }, force = false) => {
    if (!(dragging.current || force) || s?.activeTooltipIndex == null) return;
    const i = Number(s.activeTooltipIndex);
    if (Number.isFinite(i)) setCursor(i);
  };
  return <>
    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <span>Latest market price <strong className="font-display text-2xl tabular-nums">{usd(data.livePrice)}</strong></span>
      <span className="text-xs text-muted-foreground">Quote as of {dateLabel(data.liveTime)}{isFetching ? " · Refreshing…" : ""}{isRefetchError ? " · Refresh unavailable" : ""}</span>
    </div>
    <section className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-5 lg:grid-cols-4" aria-label="Investment results">
      <Stat label={`Value · ${dateLabel(sel.t)}`} value={usd(sel.value)} />
      <Stat label="Total invested" value={usd(sel.invested)} />
      <Stat label="Profit / Loss" value={`${profit >= 0 ? "+" : ""}${usd(profit)}`} positive={profit >= 0} />
      <Stat label="ROI / Total return" value={`${roi >= 0 ? "+" : ""}${roi.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`} positive={profit >= 0} />
    </section>
    <div className="mt-5 text-xs text-muted-foreground">{intraday ? "Market price" : "Adjusted close"} · {dateLabel(sel.t)} · <strong className="text-foreground">{usd(sel.price)}</strong></div>
    <div className="mt-3 h-[360px] select-none" onMouseUp={() => dragging.current = false} onMouseLeave={() => dragging.current = false}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 15, right: 8, left: 0, bottom: 0 }} onMouseDown={(s) => { dragging.current = true; move(s, true); }} onMouseMove={(s) => move(s)} onClick={(s) => move(s, true)}>
          <defs><linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} scale="time" minTickGap={35} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(t: number) => new Date(t).toLocaleDateString("en-US", { ...(range === "5y" ? { year: "numeric" as const } : { month: "short" as const, day: "numeric" as const }), timeZone: "America/New_York" })} />
          <YAxis width={65} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(1)}k` : `$${v.toFixed(0)}`} />
          <Tooltip content={() => null} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Area dataKey="value" stroke="var(--primary-deep)" strokeWidth={2} fill="url(#portfolioFill)" isAnimationActive={false} />
          <Line dataKey="invested" dot={false} stroke="var(--muted-foreground)" strokeDasharray="4 4" isAnimationActive={false} />
          <ReferenceLine x={sel.t} stroke="var(--primary-deep)" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <input type="range" min="0" max={rows.length - 1} value={index} onChange={(e) => setCursor(Number(e.target.value))} aria-label="Historical date cursor" className="mt-3 w-full accent-primary-deep" />
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{dateLabel(first.t)}</span><span>Portfolio value · Dashed: total invested</span><span>{dateLabel(last.t)}</span></div>
    <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Source: Yahoo Finance · {symbol} · {data.points.length.toLocaleString()} price observations. Quotes refresh every minute and may be delayed. {intraday ? "Intraday chart uses actual traded prices during regular market hours; 1 day shows the latest trading session." : "Daily closes are adjusted for splits and dividends."} Investment begins at the first displayed price; monthly contributions follow on the first available trading day of each new month. Excludes taxes and fees. Not financial advice.</p>
  </>;
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-2 break-words font-display text-xl font-semibold tabular-nums ${positive == null ? "text-foreground" : positive ? "text-success" : "text-destructive"}`}>{value}</div></div>;
}