import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceDot, Tooltip } from "recharts";
import { ChevronUp, ChevronDown, CalendarDays, ArrowUp, ArrowDown, Radio } from "lucide-react";
import { COMPANIES, TIMELINES, marketQuery, quotesQuery, type Symbol, type Timeline } from "@/lib/markets";
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
    <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight md:text-4xl">See What Your Money Would Have Become.</h1>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Pick a company, enter how much you would have invested, drag through time, and instantly see the profit, ROI, and portfolio value. Historical investment math made simple.</p>
    <Suspense fallback={<CompanyButtons symbol={symbol} setSymbol={setSymbol} />}><LiveCompanies symbol={symbol} setSymbol={setSymbol} /></Suspense>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-xl font-semibold">{company?.name} <span className="text-sm text-muted-foreground">{symbol}</span></h2>
      <div className="flex flex-wrap gap-1" aria-label="Chart timeline">{TIMELINES.map((t) => <Button key={t.key} size="sm" variant={range === t.key ? "default" : "ghost"} aria-pressed={range === t.key} onClick={() => setRange(t.key)}>{t.label}</Button>)}</div>
    </div>
    <Suspense fallback={<div className="grid h-[500px] place-items-center text-muted-foreground" role="status">Loading market prices…</div>}>
      <MarketResults key={`${symbol}-${range}-${mode}`} symbol={symbol} range={range} amount={amount} mode={mode} setAmount={setAmount} setMode={setMode} />
    </Suspense>
  </main>;
}

function LiveCompanies({ symbol, setSymbol }: { symbol: Symbol; setSymbol: (s: Symbol) => void }) {
  const { data, isFetching } = useSuspenseQuery(quotesQuery());
  return <><CompanyButtons symbol={symbol} setSymbol={setSymbol} quotes={data} /><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Radio className={`h-3 w-3 ${isFetching ? "text-primary-deep" : ""}`} />{data.some((q) => q.marketOpen) ? "Market open" : "Market closed"} · Quotes checked every 15 seconds · May be delayed</div></>;
}

function CompanyButtons({ symbol, setSymbol, quotes }: { symbol: Symbol; setSymbol: (s: Symbol) => void; quotes?: Awaited<ReturnType<typeof import("@/lib/nvda.functions").getMarketQuotes>> }) {
  return <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Companies">{COMPANIES.map((c) => {
    const quote = quotes?.find((q) => q.symbol === c.symbol);
    const change = quote?.price != null && quote.previousClose != null ? quote.price - quote.previousClose : null;
    const percent = change != null && quote?.previousClose ? change / quote.previousClose * 100 : null;
    return <div key={c.symbol} className="min-w-0"><Button className="w-full px-2" variant={symbol === c.symbol ? "default" : "outline"} aria-pressed={symbol === c.symbol} onClick={() => setSymbol(c.symbol)}>{c.name}<span className="text-[10px] opacity-70">{c.symbol}</span></Button><div className="px-2 pt-2"><div key={quote?.price} className="quote-tick font-display text-lg font-semibold tabular-nums">{quote?.price != null ? usd(quote.price) : quotes ? "Unavailable" : "—"}</div><div className={`flex min-h-5 items-center gap-1 text-[11px] tabular-nums ${change == null || change === 0 ? "text-muted-foreground" : change > 0 ? "text-success" : "text-destructive"}`}>{change != null && percent != null ? <>{change > 0 ? <ArrowUp className="h-3 w-3 shrink-0" /> : change < 0 ? <ArrowDown className="h-3 w-3 shrink-0" /> : null}{Math.abs(change).toFixed(2)} ({percent > 0 ? "+" : ""}{percent.toFixed(2)}%)</> : "—"}</div></div></div>;
  })}</div>;
}

function MarketResults({ symbol, range, amount, mode, setAmount, setMode }: { symbol: Symbol; range: Timeline; amount: number; mode: Mode; setAmount: (n: number) => void; setMode: (m: Mode) => void }) {
  const { data, isFetching, isRefetchError } = useSuspenseQuery(marketQuery(symbol, range));
  const [cursor, setCursor] = useState<number | null>(null);
  const dragging = useRef(false);
  const rows = useMemo(() => simulate(data.points, 0, amount, mode), [data.points, amount, mode]);
  const chartRows = useMemo(() => rows.map((r, i) => ({ ...r, chartPrice: data.points[i]?.c ?? r.price })), [rows, data.points]);
  const index = cursor == null ? rows.length - 1 : Math.min(cursor, rows.length - 1);
  const sel = rows[index];
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    const box = listRef.current;
    if (el && box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [index, rows.length]);
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!sel || !first || !last) return <p role="status">No prices available for this period.</p>;
  const profit = sel.value - sel.invested;
  const roi = sel.invested ? profit / sel.invested * 100 : 0;
  const intraday = range === "1d" || range === "5d";
  const dateLabel = (t: number) => intraday ? new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : fmtDate(t);
  const calLabel = (t: number) => new Date(t).toLocaleString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric", ...(intraday ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}), timeZone: "America/New_York" }) + (intraday ? " ET" : "");
  const move = (s: { activeTooltipIndex?: string | number }, force = false) => {
    if (!(dragging.current || force) || s?.activeTooltipIndex == null) return;
    const i = Number(s.activeTooltipIndex);
    if (Number.isFinite(i)) setCursor(i);
  };
  const sharesBought = amount / first.price;
  const lastChart = chartRows[chartRows.length - 1];
  const chartEnd = last.t + Math.max((last.t - first.t) * 0.12, 60_000);
  return <>
    <section className="mt-4 grid gap-5 border-y border-border py-5 md:grid-cols-[1fr_1fr_1.3fr]">
      <label><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{mode === "once" ? "Investment (USD)" : "Monthly investment (USD)"}</span>
        <div className="mt-2 flex items-center rounded-md border border-input px-3 focus-within:ring-2 focus-within:ring-ring"><span>$</span>
          <input aria-label="Investment amount" type="number" min="0" step="any" value={amount ? Number(amount.toFixed(2)) : ""} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))} className="w-full bg-transparent px-2 py-2 text-lg font-semibold outline-none" />
        </div>
        <div className="mt-3 flex gap-1">{(["once", "monthly"] as const).map((m) => <Button key={m} size="sm" variant={mode === m ? "secondary" : "ghost"} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "once" ? "One-time" : "Monthly"}</Button>)}</div>
      </label>
      <label><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{mode === "once" ? "Number of shares invested" : "Shares bought per month"}</span>
        <div className="mt-2 flex items-center rounded-md border border-input px-3 focus-within:ring-2 focus-within:ring-ring">
          <input aria-label="Number of shares invested" type="number" min="0" step="any" value={sharesBought ? Number(sharesBought.toFixed(4)) : ""} onChange={(e) => setAmount(Math.max(0, Number(e.target.value)) * first.price)} className="w-full bg-transparent py-2 text-lg font-semibold outline-none" />
          <span className="text-xs text-muted-foreground">{symbol}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">At {usd(first.price)} on {dateLabel(first.t)} · Holding {sel.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} shares at selected date</p>
      </label>
      <div><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><CalendarDays className="h-4 w-4" />Calendar</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Previous trading date" title="Previous trading date" disabled={index === 0} onClick={() => setCursor(Math.max(0, index - 1))}><ChevronUp /></Button><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Next trading date" title="Next trading date" disabled={index === rows.length - 1} onClick={() => setCursor(Math.min(rows.length - 1, index + 1))}><ChevronDown /></Button></div></div>
        <div className="mt-1 flex justify-between border-x border-t border-input bg-muted px-3 py-2 text-[11px] font-medium uppercase text-muted-foreground"><span>Date{intraday ? " · Eastern time" : ""}</span><span>Price</span></div>
        <div ref={listRef} role="listbox" aria-label="Investment calendar" tabIndex={0} onKeyDown={(e) => { if (["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) { e.preventDefault(); setCursor(e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, index + (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : e.key === "PageUp" ? -10 : 10)))); } }} className="market-calendar relative h-40 overflow-y-auto overscroll-contain rounded-b-md border border-input">
          {rows.map((r, i) => <Button key={r.t} type="button" variant="ghost" role="option" aria-selected={i === index} data-i={i} onClick={() => setCursor(i)}
            className={`h-10 w-full justify-between gap-3 rounded-none border-b border-border px-3 text-left text-xs tabular-nums ${i === index ? "bg-primary font-semibold text-primary-foreground hover:bg-primary" : ""}`}>
            <span>{calLabel(r.t)}</span><span>{usd(r.price)}</span></Button>)}
        </div>
      </div>
    </section>
    <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <div><span className="text-xs text-muted-foreground">Opening and current price</span><div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1"><span className="text-muted-foreground">Opening <strong className="font-display text-lg text-foreground tabular-nums">{quotesOpening(data)}</strong></span><span>Current <strong key={data.livePrice} className="quote-tick font-display text-2xl tabular-nums">{usd(data.livePrice)}</strong></span></div></div>
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
        <ComposedChart data={chartRows} margin={{ top: 35, right: 15, left: 8, bottom: 0 }} onMouseDown={(s) => { dragging.current = true; move(s, true); }} onMouseMove={(s) => move(s)} onClick={(s) => move(s, true)}>
          <defs><linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--success)" stopOpacity={0.03} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="t" type="number" domain={[first.t, chartEnd]} scale="time" minTickGap={55} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(t: number) => range === "1d" ? new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : new Date(t).toLocaleDateString("en-US", { ...(range === "5y" ? { year: "numeric" as const } : { month: "short" as const, day: "numeric" as const }), timeZone: "America/New_York" })} />
          <YAxis orientation="right" width={65} domain={["auto", "auto"]} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: number) => usd(v)} />
          <Tooltip content={({ active, payload }) => { const r = active && payload?.[0]?.payload as typeof sel | undefined; return r ? <div className="rounded-md border border-border bg-background px-3 py-2 shadow-soft"><div className="text-sm font-bold">{calLabel(r.t)}</div><div className="font-display text-2xl font-bold tabular-nums text-primary-deep">{usd(r.price)}</div><div className="text-xs text-muted-foreground">Value {usd(r.value)}</div></div> : null; }} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Area dataKey="chartPrice" stroke="var(--success)" strokeWidth={2} fill="url(#portfolioFill)" isAnimationActive={false} />
          {lastChart && <ReferenceLine y={lastChart.chartPrice} stroke="var(--success)" strokeDasharray="5 5" label={{ value: usd(lastChart.chartPrice), position: "insideTopRight", fill: "var(--success)", fontSize: 13, fontWeight: 700 }} />}
          {lastChart && <ReferenceDot x={last.t} y={lastChart.chartPrice} r={5} fill="var(--success)" stroke="var(--background)" strokeWidth={2} className={data.marketOpen ? "market-endpoint" : ""} />}
          <ReferenceLine x={sel.t} stroke="var(--primary-deep)" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <input type="range" min="0" max={rows.length - 1} value={index} onChange={(e) => setCursor(Number(e.target.value))} aria-label="Historical date cursor" className="mt-3 w-full accent-primary-deep" />
    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{dateLabel(first.t)}</span><span>Stock price (USD)</span><span>{dateLabel(last.t)}</span></div>
    <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">Source: Yahoo Finance · {symbol} · {data.points.length.toLocaleString()} price observations. Quotes are checked every 15 seconds and may be delayed; prices only change when the source updates. {intraday ? "Intraday chart uses actual traded prices during regular market hours; 1 day shows the latest trading session." : "The chart shows split-adjusted closing stock prices; investment results and calendar use closes adjusted for splits and dividends."} Investment begins at the first displayed price; monthly contributions follow on the first available trading day of each new month. Excludes taxes and fees. Not financial advice.</p>
  </>;
}

function quotesOpening(data: { openingPrice: number | null }) { return data.openingPrice != null ? usd(data.openingPrice) : "Unavailable"; }

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-2 break-words font-display text-xl font-semibold tabular-nums ${positive == null ? "text-foreground" : positive ? "text-success" : "text-destructive"}`}>{value}</div></div>;
}