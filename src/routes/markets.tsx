import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { marketQuery, quotesQuery, pageHead } from "@/lib/markets";

export const Route = createFileRoute("/markets")({
  head: () => pageHead("Markets", "Explore real historical investment returns for Apple, Microsoft, NVIDIA, Amazon, Alphabet, Meta, and Tesla."),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(marketQuery()), context.queryClient.ensureQueryData(quotesQuery())]); },
  errorComponent: ({ error }) => <p role="alert" className="p-6">Market prices are unavailable: {error.message}</p>,
  notFoundComponent: () => <p className="p-6">Market page not found.</p>,
  component: MarketCalculator,
});