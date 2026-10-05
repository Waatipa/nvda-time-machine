import { createFileRoute } from "@tanstack/react-router";
import { MarketCalculator } from "@/components/market-calculator";
import { marketQuery, pageHead } from "@/lib/markets";

export const Route = createFileRoute("/markets")({
  head: () => pageHead("Markets", "Explore real historical investment returns for Apple, Microsoft, NVIDIA, Amazon, Alphabet, Meta, and Tesla."),
  loader: ({ context }) => context.queryClient.ensureQueryData(marketQuery()),
  component: MarketCalculator,
});