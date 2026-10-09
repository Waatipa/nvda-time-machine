import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { quotesQuery, pageHead } from "@/lib/markets";

export const Route = createFileRoute("/")({
  head: () => pageHead("Investment Time Machine", "Explore the Magnificent Seven with real historical stock prices and one-time or monthly investment returns at Investico Academy."),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(quotesQuery()); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error instanceof Error ? error.message : "Please try again."}</p>,
  notFoundComponent: () => <p className="p-6">Market page not found.</p>,
  component: MarketCalculator,
});
