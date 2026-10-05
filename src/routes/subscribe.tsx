import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/markets";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/subscribe")({
  head: () => pageHead("Subscribe", "Subscription updates from Investico Academy."),
  component: Subscribe,
});
function Subscribe() {
  return <main className="mx-auto max-w-6xl px-6 py-12"><div className="text-xs uppercase tracking-wide text-primary-deep">Investico Academy</div><h1 className="mt-3 font-display text-4xl font-semibold">Subscribe</h1><p className="mt-6 max-w-xl text-lg leading-relaxed">Subscriptions are not open yet.</p><p className="mt-3 max-w-xl text-muted-foreground">In the meantime, explore the markets and historical investment returns.</p><Button asChild className="mt-8"><Link to="/markets">Explore Markets</Link></Button></main>;
}