import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/markets";

export const Route = createFileRoute("/contact-us")({
  head: () => pageHead("Contact Us", "Contact information for Nvestico Academy."),
  component: ContactUs,
});
function ContactUs() {
  return <main className="mx-auto max-w-6xl px-6 py-12"><div className="text-xs uppercase tracking-wide text-primary-deep">Nvestico Academy</div><h1 className="mt-3 font-display text-4xl font-semibold">Contact Us</h1><p className="mt-6 max-w-xl text-lg leading-relaxed">Contact details will be available soon.</p></main>;
}