import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type NvdaData = {
  points: { t: number; p: number; c: number }[]; // t=ms, p=adjusted close, c=raw close
  livePrice: number;
  liveTime: number;
  fetchedAt: number;
};

export const getMarketHistory = createServerFn({ method: "GET" })
 .inputValidator((input) => z.object({
   symbol: z.enum(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]),
   range: z.enum(["1d", "5d", "1mo", "6mo", "1y", "5y"]),
 }).parse(input))
 .handler(async ({ data }): Promise<NvdaData> => {
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
    points.push({ t: t * 1000, p, c });
  }
  if (!points.length) throw new Error("Price history is currently unavailable. Please try again.");
  return {
    points,
    livePrice: r.meta?.regularMarketPrice ?? points[points.length - 1]?.c ?? 0,
    liveTime: (r.meta?.regularMarketTime ?? 0) * 1000,
    fetchedAt: Date.now(),
  };
});
