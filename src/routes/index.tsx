import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { marketQuery, pageHead } from "@/lib/markets";

export const Route = createFileRoute("/")({
  head: () => pageHead("Investment Time Machine", "Explore the Magnificent Seven with real historical stock prices and one-time or monthly investment returns at Investico Academy."),
  loader: ({ context }) => context.queryClient.ensureQueryData(marketQuery()),
  component: MarketCalculator,
});
