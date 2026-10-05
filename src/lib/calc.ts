export type Pt = { t: number; p: number; c: number };
export type Row = { t: number; price: number; invested: number; value: number; shares: number };
export type Mode = "once" | "monthly";
export type Frame = "D" | "W" | "M" | "Y";

/** Builds the daily portfolio series from startIdx to the end using adjusted closes (splits + dividends). */
export function simulate(points: Pt[], startIdx: number, amount: number, mode: Mode): Row[] {
  const rows: Row[] = [];
  let shares = 0;
  let invested = 0;
  let lastMonth = -1;
  for (let i = startIdx; i < points.length; i++) {
    const { t, p } = points[i]!;
    const d = new Date(t);
    const mk = d.getUTCFullYear() * 12 + d.getUTCMonth();
    if (i === startIdx) {
      shares += amount / p;
      invested += amount;
      lastMonth = mk;
    } else if (mode === "monthly" && mk !== lastMonth) {
      shares += amount / p; // buy on first trading day of each new month
      invested += amount;
      lastMonth = mk;
    }
    rows.push({ t, price: p, invested, value: shares * p, shares });
  }
  return rows;
}

function key(t: number, f: Frame) {
  const d = new Date(t);
  if (f === "D") return t;
  if (f === "Y") return d.getUTCFullYear();
  if (f === "M") return d.getUTCFullYear() * 12 + d.getUTCMonth();
  const day = Math.floor(t / 86400000) + 3; // epoch Thursday -> Monday-based weeks
  return Math.floor(day / 7);
}

/** Resamples to the last trading day of each period. */
export function resample(rows: Row[], f: Frame): Row[] {
  if (f === "D") return rows;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === rows.length - 1 || key(rows[i + 1]!.t, f) !== key(rows[i]!.t, f)) out.push(rows[i]!);
  }
  if (rows.length && out[0] !== rows[0]) out.unshift(rows[0]!);
  return out;
}

export const usd = (n: number, d = 2) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
