import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PriceChart } from "@/components/price-chart";
import { ChevronUp, ChevronDown, CalendarDays, ArrowUp, ArrowDown, Radio, ChartNoAxesColumn, ChartLine } from "lucide-react";
import { COMPANIES, TIMELINES, marketQuery, quotesQuery, type Symbol, type Timeline } from "@/lib/markets";
import { simulate, usd, fmtDate, type Mode } from "@/lib/calc";
import { Button } from "@/components/ui/button";

export function MarketCalculator() {
  const [symbol, setSymbol] = useState<Symbol>("NVDA");
  const [range, setRange] = useState<Timeline>("5y");
  const [amount, setAmount] = useState(1000);
  const [mode, setMode] = useState<Mode>("once");
  return <main className="mx-auto max-w-6xl px-6 py-8">
    <div className="text-xs font-medium uppercase tracking-wide text-primary-deep">Magnificent Seven · Investment Time Machine</div>
    <h1 className="mt-2 max-w-3xl font-display text-3xl font-semibold leading-tight md:text-4xl">See What Your Money Would Have Become.</h1>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Pick a company, enter how much you would have invested, drag through time, and instantly see the profit, ROI, and portfolio value. Historical investment math made simple.</p>
    <Suspense fallback={<CompanyButtons symbol={symbol} setSymbol={setSymbol} />}><LiveCompanies symbol={symbol} setSymbol={setSymbol} /></Suspense>
    <Suspense fallback={<div className="grid h-[500px] place-items-center text-muted-foreground" role="status">Loading market prices…</div>}>
      <MarketResults key={`${symbol}-${range}-${mode}`} symbol={symbol} range={range} amount={amount} mode={mode} setAmount={setAmount} setMode={setMode} setRange={setRange} />
    </Suspense>
  </main>;
}

function LiveCompanies({ symbol, setSymbol }: { symbol: Symbol; setSymbol: (s: Symbol) => void }) {
  const { data, isFetching } = useSuspenseQuery(quotesQuery());
  return <><CompanyButtons symbol={symbol} setSymbol={setSymbol} quotes={data} /><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Radio className={`h-3 w-3 ${isFetching ? "text-primary-deep" : ""}`} />{data.some((q) => q.marketOpen) ? "Market open" : "Market closed"} · Quotes checked every 5 seconds · May be delayed</div></>;
}

function CompanyButtons({ symbol, setSymbol, quotes }: { symbol: Symbol; setSymbol: (s: Symbol) => void; quotes?: Awaited<ReturnType<typeof import("@/lib/nvda.functions").getMarketQuotes>> }) {
  return <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label="Companies">{COMPANIES.map((c) => {
    const quote = quotes?.find((q) => q.symbol === c.symbol);
    const change = quote?.price != null && quote.previousClose != null ? quote.price - quote.previousClose : null;
    const percent = change != null && quote?.previousClose ? change / quote.previousClose * 100 : null;
    return <div key={c.symbol} className="min-w-0"><Button className="w-full px-2" variant={symbol === c.symbol ? "default" : "outline"} aria-pressed={symbol === c.symbol} onClick={() => setSymbol(c.symbol)}>{c.name}<span className="text-[10px] opacity-70">{c.symbol}</span></Button><div className="px-2 pt-2"><div key={quote?.price} className="quote-tick font-display text-lg font-semibold tabular-nums">{quote?.price != null ? usd(quote.price) : quotes ? "Unavailable" : "—"}</div><div className={`flex min-h-5 items-center gap-1 text-[11px] tabular-nums ${change == null || change === 0 ? "text-muted-foreground" : change > 0 ? "text-success" : "text-destructive"}`}>{change != null && percent != null ? <>{change > 0 ? <ArrowUp className="h-3 w-3 shrink-0" /> : change < 0 ? <ArrowDown className="h-3 w-3 shrink-0" /> : null}{Math.abs(change).toFixed(2)} ({percent > 0 ? "+" : ""}{percent.toFixed(2)}%)</> : "—"}</div></div></div>;
  })}</div>;
}

function MarketResults({ symbol, range, amount, mode, setAmount, setMode, setRange }: { symbol: Symbol; range: Timeline; amount: number; mode: Mode; setAmount: (n: number) => void; setMode: (m: Mode) => void; setRange: (r: Timeline) => void }) {
  const { data, isFetching, isRefetchError } = useSuspenseQuery(marketQuery(symbol, range));
  const { data: quotes } = useSuspenseQuery(quotesQuery());
  const currentQuote = quotes.find(q => q.symbol === symbol);
  const [cursor, setCursor] = useState<number | null>(null);
  const [candles, setCandles] = useState(false);
  const rows = useMemo(() => simulate(data.points, 0, amount, mode), [data.points, amount, mode]);
  const index = cursor == null ? rows.length - 1 : Math.min(cursor, rows.length - 1);
  const sel = rows[index], first = rows[0], last = rows[rows.length - 1];
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = listRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-i="${index}"]`);
    if (el && box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [index, rows.length]);
  if (!sel || !first || !last) return <p role="status">No prices available for this period.</p>;
  const profit = sel.value - sel.invested;
  const roi = sel.invested ? profit / sel.invested * 100 : 0;
  const years = (sel.t - first.t) / (365.25 * 86400000);
  const annualized = mode === "once" && years >= 1 && amount > 0 ? (Math.pow(sel.value / amount, 1 / years) - 1) * 100 : null;
  const intraday = range === "1d" || range === "5d";
  const dateLabel = (t: number) => intraday ? new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) + " ET" : fmtDate(t);
  const calLabel = (t: number) => new Date(t).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", ...(intraday ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}), timeZone: "America/New_York" }) + (intraday ? " ET" : "");
  const axisLabel = (t: number) => new Date(t).toLocaleString("en-US", { ...(range === "1d" ? { hour: "numeric" as const, minute: "2-digit" as const } : range === "5y" ? { month: "short" as const, year: "numeric" as const } : { month: "short" as const, day: "numeric" as const }), timeZone: "America/New_York" });
  const sharesBought = amount / first.price;
  const quotePrice = currentQuote?.price ?? data.livePrice;
  const previousClose = currentQuote?.previousClose ?? data.previousClose;
  const stock = data.points[index];
  return <div className="mt-6">
    <section className="grid gap-6 border-y border-border py-5 lg:grid-cols-[1.2fr_1fr]" aria-label="Investment details and results">
      <div>
        <h2 className="font-display text-lg font-bold uppercase">Investment details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-md border border-input px-3 py-2">
            <div className="text-xs text-muted-foreground">{symbol} · {COMPANIES.find(c => c.symbol === symbol)?.name}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-2"><label className="flex min-w-0 items-center font-display text-xl font-semibold"><span>$</span><input aria-label="Investment amount" type="number" min="0" step="any" value={amount ? Number(amount.toFixed(2)) : ""} onChange={e => setAmount(Math.max(0, Number(e.target.value)))} className="w-28 bg-transparent outline-none focus:ring-2 focus:ring-ring" /></label><span className="text-sm">{mode === "monthly" ? "monthly from" : "invested on"} {dateLabel(first.t)}</span></div>
          </div>
          <div className="rounded-md bg-accent px-3 py-2"><div className="text-xs text-muted-foreground">Investment today</div><strong className="mt-1 block font-display text-xl tabular-nums">{usd(last.value)}</strong></div>
        </div>
        <label className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3"><span className="text-sm">{mode === "once" ? "Shares purchased" : "Shares per first monthly purchase"}</span><span className="flex items-center gap-2"><input aria-label="Number of shares invested" type="number" min="0" step="any" value={sharesBought ? Number(sharesBought.toFixed(4)) : ""} onChange={e => setAmount(Math.max(0, Number(e.target.value)) * first.price)} className="w-28 rounded-sm bg-muted px-2 py-1 text-right font-semibold tabular-nums outline-none focus:ring-2 focus:ring-ring" /><span className="text-xs">{symbol}</span></span></label>
        <div className="mt-2 flex gap-1">{(["once", "monthly"] as const).map(m => <Button key={m} size="sm" variant={mode === m ? "secondary" : "ghost"} aria-pressed={mode === m} onClick={() => setMode(m)}>{m === "once" ? "One-time" : "Monthly"}</Button>)}</div>
      </div>
      <div><h2 className="font-display text-lg font-bold">Result <span className="text-xs font-normal text-muted-foreground">· {dateLabel(sel.t)}</span></h2>
        <div className={`mt-3 grid grid-cols-2 gap-x-5 gap-y-4 rounded-md p-4 ${profit >= 0 ? "bg-accent" : "bg-muted"}`} aria-label="Investment results">
          <Stat label="Profit / Loss" value={`${profit >= 0 ? "+" : ""}${usd(profit)}`} positive={profit >= 0} />
          <Stat label="Return" value={`${roi >= 0 ? "+" : ""}${roi.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`} positive={profit >= 0} />
          <Stat label="Portfolio value" value={usd(sel.value)} />
          <Stat label={annualized == null ? "Total invested" : "Annualized return"} value={annualized == null ? usd(sel.invested) : `${annualized >= 0 ? "+" : ""}${annualized.toFixed(2)}%`} />
        </div>
      </div>
    </section>
    <section className="mt-5 border border-input rounded-md" aria-label="Investment growth chart">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pt-4">
        <div><h2 className="font-display text-lg font-bold uppercase">Investment growth chart</h2><div className="mt-1 flex items-baseline gap-2"><span className="font-display text-lg font-semibold">{symbol}</span><span className="text-xs text-muted-foreground">Stock price · USD</span></div></div>
        <div className="flex gap-1" aria-label="Chart style"><Button size="sm" variant={!candles ? "secondary" : "ghost"} aria-pressed={!candles} onClick={() => setCandles(false)}><ChartLine className="h-4 w-4"/>Line</Button><Button size="sm" variant={candles ? "secondary" : "ghost"} aria-pressed={candles} onClick={() => setCandles(true)}><ChartNoAxesColumn className="h-4 w-4"/>Candlesticks</Button></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4">
        <div><div className="font-display text-base font-bold">{calLabel(sel.t)}</div><strong className="font-display text-2xl text-primary-deep tabular-nums">{usd(stock?.c ?? sel.price)}</strong>{candles && stock?.o != null && <span className="ml-3 text-xs text-muted-foreground">O {usd(stock.o)} · H {usd(stock.h ?? stock.c)} · L {usd(stock.l ?? stock.c)} · C {usd(stock.c)}</span>}</div>
        <div className="text-right"><div className="text-xs text-muted-foreground">Opening and current price</div><div className="mt-1 text-sm">Opening <strong>{currentQuote?.opening != null ? usd(currentQuote.opening) : "Unavailable"}</strong><span className="ml-3">Current <strong key={quotePrice} className="quote-tick text-lg tabular-nums">{usd(quotePrice)}</strong></span></div></div>
      </div>
      <div className="h-[340px] select-none px-2 sm:h-[390px]"><PriceChart points={data.points} previousClose={previousClose} index={index} onSelect={setCursor} candles={candles} dateLabel={axisLabel} marketOpen={data.marketOpen}/></div>
      <div className="border-t border-border bg-muted/40 px-4 py-3">
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
          <div><div className="flex flex-wrap gap-1" aria-label="Chart timeline">{TIMELINES.map(t => <Button key={t.key} size="sm" variant={range === t.key ? "default" : "ghost"} aria-pressed={range === t.key} onClick={() => setRange(t.key)}>{t.label}</Button>)}</div><input type="range" min="0" max={rows.length - 1} value={index} onChange={e => setCursor(Number(e.target.value))} aria-label="Historical date cursor" className="mt-4 w-full accent-primary-deep"/><div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{dateLabel(first.t)}</span><span>{dateLabel(last.t)}</span></div></div>
          <div><div className="mb-1 flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-medium"><CalendarDays className="h-4 w-4"/>Calendar · {dateLabel(sel.t)}</span><div className="flex"><Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Previous trading date" disabled={index === 0} onClick={() => setCursor(Math.max(0,index-1))}><ChevronUp/></Button><Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Next trading date" disabled={index === rows.length-1} onClick={() => setCursor(Math.min(rows.length-1,index+1))}><ChevronDown/></Button></div></div>
          <div ref={listRef} role="listbox" aria-label="Investment calendar" tabIndex={0} onKeyDown={e => { if (["ArrowUp","ArrowDown","Home","End","PageUp","PageDown"].includes(e.key)) { e.preventDefault(); setCursor(e.key === "Home" ? 0 : e.key === "End" ? rows.length-1 : Math.max(0,Math.min(rows.length-1,index+(e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : e.key === "PageUp" ? -10 : 10)))); } }} className="market-calendar relative h-24 overflow-y-auto overscroll-contain rounded-md border border-input bg-background">{rows.map((r,i) => <Button key={r.t} variant="ghost" role="option" aria-selected={i === index} data-i={i} onClick={() => setCursor(i)} className={`h-8 w-full justify-between rounded-none border-b border-border px-2 text-xs tabular-nums ${i === index ? "bg-primary font-semibold hover:bg-primary" : ""}`}><span>{calLabel(r.t)}</span><span>{usd(r.price)}</span></Button>)}</div></div>
        </div>
      </div>
    </section>
    <p className="mt-3 text-xs text-muted-foreground">Quote as of {dateLabel(currentQuote?.time ?? data.liveTime)} · Checked every 5 seconds{isFetching ? " · Refreshing…" : ""}{isRefetchError ? " · Refresh unavailable" : ""} · May be delayed</p>
    <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">Source: Yahoo Finance · {symbol}. Chart uses actual OHLC stock prices, split-adjusted on longer timelines; results and calendar use split/dividend-adjusted closes. Red/green shading compares prices with the latest session’s previous close. Investment begins at the first displayed price; monthly contributions occur on the first available trading day of each new month. Excludes taxes and fees. Not financial advice.</p>
  </div>;
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 break-words font-display text-xl font-semibold tabular-nums ${positive == null ? "text-foreground" : positive ? "text-success" : "text-destructive"}`}>{value}</div></div>;
}
