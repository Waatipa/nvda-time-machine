import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { marketQuery, quotesQuery, pageHead } from "@/lib/markets";

export const Route = createFileRoute("/")({
  head: () => pageHead("Investment Time Machine", "Explore the Magnificent Seven with real historical stock prices and one-time or monthly investment returns at Investico Academy."),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(marketQuery()), context.queryClient.ensureQueryData(quotesQuery())]); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error.message}</p>,
  notFoundComponent: () => <p className="p-6">Market page not found.</p>,
  component: MarketCalculator,
});
