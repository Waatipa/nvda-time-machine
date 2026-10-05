import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/markets";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about-us")({
  head: () => pageHead("About Us", "Investico Academy brings historical market performance into focus with real price data."),
  component: AboutUs,
});
function AboutUs() {
  return <main className="mx-auto max-w-6xl px-6 py-12">
    <div className="text-xs uppercase tracking-wide text-primary-deep">Investico Academy</div>
    <h1 className="mt-3 font-display text-4xl font-semibold">About Us</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed">Investico Academy is a place to explore market history and put investment performance in perspective.</p>
    <div className="mt-10 max-w-2xl border-t border-border pt-6"><h2 className="font-display text-xl font-semibold">A clearer view of the markets</h2><p className="mt-3 leading-relaxed text-muted-foreground">Compare the Magnificent Seven using genuine historical prices. Past performance does not guarantee future results, and all calculations exclude taxes and fees.</p></div>
    <Button asChild className="mt-8"><Link to="/markets">Explore Markets</Link></Button>
  </main>;
}