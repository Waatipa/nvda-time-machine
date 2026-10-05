import { createServerFn } from "@tanstack/react-start";

export type NvdaData = {
  points: { t: number; p: number; c: number }[]; // t=ms, p=adjusted close, c=raw close
  livePrice: number;
  liveTime: number;
  fetchedAt: number;
};

export const getNvdaHistory = createServerFn({ method: "GET" }).handler(async (): Promise<NvdaData> => {
  const res = await fetch(
    "https://query1.finance.yahoo.com/v8/finance/chart/NVDA?range=max&interval=1d&includeAdjustedClose=true",
    { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
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
    const p = adj[i];
    const c = close[i];
    if (p == null || c == null || !isFinite(p)) continue;
    points.push({ t: ts[i] * 1000, p, c });
  }
  return {
    points,
    livePrice: r.meta?.regularMarketPrice ?? points[points.length - 1]?.c ?? 0,
    liveTime: (r.meta?.regularMarketTime ?? 0) * 1000,
    fetchedAt: Date.now(),
  };
});
