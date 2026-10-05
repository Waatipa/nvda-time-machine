import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return <header className="border-b border-border bg-background">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
      <Link to="/" className="flex items-center gap-3" aria-label="Nvestico Academy home">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground"><ArrowUpRight /></span>
        <span className="font-display text-lg font-semibold">www.nvestico.academy</span>
      </Link>
      <nav aria-label="Main menu" className="flex flex-wrap gap-1">
        {([
          ["/about-us", "About Us"], ["/markets", "Markets"],
          ["/subscribe", "Subscribe"], ["/contact-us", "Contact Us"],
        ] as const).map(([to, label]) => <Button key={to} variant="ghost" asChild>
          <Link to={to} activeProps={{ className: "bg-accent text-primary-deep" }}>{label}</Link>
        </Button>)}
      </nav>
    </div>
  </header>;
}