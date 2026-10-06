<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Share navigation in the root layout and give each named section its own leaf route, so direct links and metadata remain independent.
- Keep ticker and timeline query options in a browser-safe market module and validate the public price request with an allowlist, so controls cannot request arbitrary instruments.
- Use a shared calculator on home and Markets, and reset the date cursor when company, timeline, or strategy changes, so selected results always match the displayed price series.
- Fetch company quotes together through an allowlisted public market function and refresh without synthesizing ticks; chart stock prices separately from calculated portfolio results so axes remain truthful.
