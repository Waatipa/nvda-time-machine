import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type NvdaData = {
  points: { t: number; p: number; c: number; o: number | null; h: number | null; l: number | null }[];
  livePrice: number;
  liveTime: number;
  fetchedAt: number;
  openingPrice: number | null;
  previousClose: number | null;
  marketOpen: boolean;
};

export const getMarketHistory = createServerFn({ method: "GET" })
 .inputValidator((input) => z.object({
   symbol: z.enum(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]),
   range: z.enum(["1d", "5d", "1mo", "6mo", "1y", "5y"]),
 }).parse(input))
 .handler(async ({ data }): Promise<NvdaData> => fetchHistory(data));

async function fetchHistory(data: { symbol: string; range: string }): Promise<NvdaData> {
   const interval = data.range === "1d" ? "5m" : data.range === "5d" ? "30m" : "1d";
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${data.symbol}?range=${data.range}&interval=${interval}&includeAdjustedClose=true`,
    { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(15000) },
  );
  if (!res.ok) throw new Error(`Market data request failed (${res.status})`);
  const json: any = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error("No market data returned");
  const ts: number[] = r.timestamp ?? [];
  const adj: (number | null)[] = r.indicators?.adjclose?.[0]?.adjclose ?? [];
  const close: (number | null)[] = r.indicators?.quote?.[0]?.close ?? [];
  const points: NvdaData["points"] = [];
  for (let i = 0; i < ts.length; i++) {
    const p = interval === "1d" ? adj[i] : close[i];
    const c = close[i];
    const t = ts[i];
    if (t == null || p == null || c == null || !isFinite(p) || p <= 0) continue;
    const quote = r.indicators?.quote?.[0];
    const valid = (v: unknown): number | null => typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
    points.push({ t: t * 1000, p, c, o: valid(quote?.open?.[i]), h: valid(quote?.high?.[i]), l: valid(quote?.low?.[i]) });
  }
  if (!points.length) throw new Error("Price history is currently unavailable. Please try again.");
   const currentPrice = r.meta?.regularMarketPrice;
   const currentTime = r.meta?.regularMarketTime;
   const finalPoint = points[points.length - 1];
   if (interval !== "1d" && finalPoint && typeof currentPrice === "number" && currentPrice > 0 && typeof currentTime === "number" && currentTime * 1000 > finalPoint.t) {
      points.push({ t: currentTime * 1000, p: currentPrice, c: currentPrice, o: null, h: null, l: null });
   }
   const regular = r.meta?.currentTradingPeriod?.regular;
   const openingIndex = ts.findIndex((t) => regular?.start != null && t >= regular.start);
   const opening = r.indicators?.quote?.[0]?.open?.[openingIndex >= 0 ? openingIndex : ts.length - 1];
  return {
    points,
    livePrice: r.meta?.regularMarketPrice ?? points[points.length - 1]?.c ?? 0,
    liveTime: (r.meta?.regularMarketTime ?? 0) * 1000,
    fetchedAt: Date.now(),
     openingPrice: typeof opening === "number" && Number.isFinite(opening) ? opening : null,
     previousClose: r.meta?.chartPreviousClose ?? r.meta?.previousClose ?? null,
     marketOpen: regular?.start != null && Date.now() >= regular.start * 1000 && Date.now() < regular.end * 1000,
  };
}

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(async () => {
  const symbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"] as const;
  return Promise.all(symbols.map(async (symbol) => {
    try {
      const data = await fetchHistory({ symbol, range: "1d" });
      return { symbol, price: data.livePrice, time: data.liveTime, opening: data.openingPrice, previousClose: data.previousClose, marketOpen: data.marketOpen };
    } catch {
      return { symbol, price: null, time: null, opening: null, previousClose: null, marketOpen: false };
    }
  }));
});
