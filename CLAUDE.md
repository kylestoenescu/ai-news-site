# Project Brief: AI News Site (working title)

## What this is

A website that turns the flood of AI news into short, plain-English entries. It collects new model releases, products, research, and company news from reliable sources, writes a simple explanation of each one, and shows everything on a timeline with links to the original sources. It also has an archive, a glossary of AI terms, and a directory of the major AI companies with their models and products.

**The core promise:** you should never need to go hunting for AI news or feel lost in the terminology. One place, plain language, real sources.

## Who it's for

- **Right now:** Kyle, the owner. He wants to stay current on AI without spending hours a day on it.
- **Possibly later:** a public site for people who feel overwhelmed by AI, unsure of the terminology, and worried they're falling behind. Build everything so a public launch is a decision, not a rewrite.

Write every summary for a smart adult who is new to AI. Think "AI for Dummies," never condescending.

## About the owner (how to work with Kyle)

- Kyle is a self-taught Senior Integration Engineer (HL7, Mirth Connect, XML/XPath, PowerShell). He is currently learning JavaScript and has no formal CS background.
- He has already built and shipped a static site (HTML/CSS/JS on GitHub Pages) using Claude Code.
- **Explain what you're doing and why, in plain language**, as you go. Teaching is part of the goal, not a side effect.
- Analogies to integration engines (channels, filters, transformers, destinations) usually land well.
- For visual design decisions, offer two or three options and let Kyle choose.
- Work in small steps. Show changes and let Kyle review before committing.
- **Ask before adding any paid service, new dependency, or framework.** Scope the cost first.
- Don't over-engineer. Also don't settle for bare minimum. This should be a tool Kyle actually uses every week.

## Tech stack

- **Site:** plain static HTML, CSS, and JavaScript. No framework unless Kyle agrees to one.
- **Hosting:** GitHub Pages. Note: on a free GitHub account, Pages requires a public repo, so the site is reachable by anyone with the URL.
- **Data:** JSON files committed to the repo. The site reads these files and renders them.
- **Automation (Pass 2):** a GitHub Actions workflow on a schedule (cron) that fetches sources, calls the Claude API, and commits new entries.
- **AI summaries:** the Claude API using the cheapest current Claude model that writes good summaries. Check Anthropic's docs for current model names and pricing before writing code.

### Security rule (non-negotiable)

The Claude API key lives **only** in GitHub Actions secrets. Never commit it. Never put it in any file the website loads, because anything in client-side JavaScript is visible to every visitor. The website itself never calls the API; only the scheduled workflow does.

## Visual style (decided 2026-10-02)

Tonal "liquid glass," inspired by macOS Tahoe: blacks and cool-leaning greys, with no accent color. Frosted glass panels float over slow-moving graphite light (pale mist in light mode). The week's top story sits in a larger layered glass slab; other entries are glass cards. Fonts are Geist (interface), Instrument Sans (headlines), and Geist Mono (dates and data), self-hosted in `/fonts`. Every color and font comes from the tokens at the top of `css/styles.css`, so new pages reuse those tokens instead of adding their own.

## Data model

Everything on the site is a view of the same entries. Get this format right first.

### Entry (one news item)

```json
{
  "id": "2026-10-02-example-model-launch",
  "status": "published",
  "title": "Short, clear headline in plain words",
  "date": "2026-10-02",
  "company": "Anthropic",
  "category": "model-release",
  "summary": "2 to 4 sentences explaining what happened in plain English.",
  "why_it_matters": "1 to 2 sentences on what this changes for a normal person.",
  "terms": ["context window", "agent"],
  "importance": 3,
  "confirmed": true,
  "sources": [
    { "name": "Anthropic News", "url": "https://...", "type": "primary" },
    { "name": "Some Outlet", "url": "https://...", "type": "secondary" }
  ]
}
```

Field notes:

- `status`: `published` or `draft`. For now entries publish automatically. A public launch may switch new entries to `draft` until Kyle approves them.
- `category`: one of `model-release`, `product`, `research`, `company`, `policy`, `other`. Keep the list short; add categories only when needed.
- `terms`: glossary terms that appear in the entry. Each must exist in the glossary (see below).
- `importance`: 1 to 5. 5 means "everyone should know this." 1 means "minor update." Used for the weekly digest and filtering.
- `confirmed`: `false` for rumors, leaks, or reports the company hasn't confirmed. Unconfirmed entries are clearly labeled on the site.
- `sources`: at least one. Prefer primary sources (the company's own announcement). `type` is `primary` or `secondary`.

### Glossary term

```json
{
  "term": "context window",
  "definition": "Plain-English definition, 1 to 3 sentences.",
  "example": "Optional everyday example or analogy.",
  "related": ["token"]
}
```

### Company

```json
{
  "name": "Anthropic",
  "website": "https://...",
  "about": "One or two plain sentences.",
  "products": [
    {
      "name": "Product or model name",
      "type": "model",
      "status": "current",
      "use_cases": ["Plain-English use case", "Another one"]
    }
  ]
}
```

`status` is `current` or `retired`. Never delete retired products; mark them retired so history stays intact.

### Suggested file layout

```
/index.html             Timeline (home)
/week.html              "This week in 5 minutes" digest
/archive.html           All past entries, filterable
/glossary.html          Glossary
/companies.html         Companies, models, and products
/css/styles.css
/fonts/                Self-hosted fonts and their licenses
/js/                    Shared rendering scripts
/data/entries/2026-10.json   One file per month keeps files small
/data/entries/index.json     List of month files that exist; pages read it first
/data/glossary.json
/data/companies.json
/data/sources.json      The list of sources the pipeline checks
/data/seen.json         URLs already processed (pipeline use)
/pipeline/              Pass 2 scripts
/.github/workflows/     Pass 2 scheduled workflow
```

## Site pages

1. **Timeline (home):** newest entries first. Each shows title, date, company, category, summary, and source links. Glossary terms in the text link to their definitions.
2. **This week:** the most important entries from the last 7 days, sorted by importance. Should take about 5 minutes to read. This page exists to *reduce* time spent on news.
3. **Archive:** every entry, filterable by month, company, category, and importance.
4. **Glossary:** alphabetical, searchable. Each term shows the entries that use it.
5. **Companies and models:** one section per company with its current products, use cases, and recent entries. Retired products are shown separately.

Requirements for every page: readable on a phone, works in light and dark mode, loads fast, no tracking scripts.

## Writing rules for summaries

- Plain English, roughly an 8th grade reading level. Short sentences.
- Any technical term either gets explained in the sentence or goes in `terms` so it links to the glossary.
- Explain **what it does and why someone would care**, not marketing claims or benchmark numbers.
- No hype words ("revolutionary," "game-changing," "insane").
- If sources disagree or a claim is unconfirmed, say so plainly and set `confirmed: false`.
- Never invent details that aren't in the sources. If something is unclear, leave it out.

## Content and copyright rules

- Summaries must be **written fresh in our own words**. Never copy sentences or paragraphs from source articles.
- No long quotes. If a quote is essential, keep it to a short phrase.
- Every entry links to its original sources so readers can go deeper.
- Respect each site's robots.txt and terms. Don't scrape paywalled content.
- These rules apply now, not just at public launch.

## Sources

### Version 1: official company sources only

Check each one's newsroom or blog for an RSS feed. **Verify every feed URL actually works before using it. Never guess or invent URLs.** If a site has no feed, tell Kyle and propose an option rather than working around it silently.

- Anthropic
- OpenAI
- Google (Google DeepMind and the Google AI blog)
- xAI
- Meta AI
- Microsoft AI
- Mistral AI

Kyle may add or remove sources. The list lives in `/data/sources.json`, not hardcoded.

### Version 2: reputable outlets

Kyle will choose these. Candidates include major tech outlets with dedicated AI coverage and respected independent writers.

### Excluded for now

- **X (Twitter):** the official API is expensive and restrictive, and scraping breaks their terms.
- Paywalled sites, forums, and anonymous rumor accounts.

## The pipeline (Pass 2)

It works like an integration engine channel:

| Integration engine | This pipeline |
|---|---|
| Inbound channel | Fetch each source in `sources.json` |
| Filter | Skip URLs already in `seen.json`; skip items that aren't about AI capabilities, products, models, research, or major company news |
| Duplicate check | Compare against entries from the last 14 days. If it's the same story, add the new link to the existing entry's `sources` instead of creating a new entry |
| Transformer | Claude writes the summary, why_it_matters, category, terms, importance, and confirmed fields |
| Validation | Check the output matches the entry format exactly. Reject anything invalid and log it |
| Destination | Write to the correct monthly file (adding new months to `data/entries/index.json`), update `seen.json`, commit |

Additional pipeline rules:

- **New glossary terms:** if an entry uses a term that isn't in the glossary, the pipeline drafts a definition and adds it. Kyle can edit any definition later.
- **Company updates:** if an entry announces a new model or product, the pipeline adds it to `companies.json`. If a product is retired, mark it `retired`.
- **Failure handling:** if one source fails, log it and continue with the others. One bad source never stops a run.
- **Cost guard:** cap how many items are processed per run and set a max output length per summary. Report the estimated monthly cost to Kyle before turning on the schedule.
- **Schedule:** start at twice a day. Adjust later if needed.

## Build plan

### Pass 1: the website with hand-made data

Goal: get the site looking and working right without automation.

1. Set up the repo, folder structure, and GitHub Pages.
2. Create the data files with about 10 hand-written sample entries, 15 to 20 glossary terms, and 3 or 4 companies. Use real past news so it feels authentic, with real source links.
3. Build the timeline page.
4. Build the glossary, including term links inside entries.
5. Build the archive with filters.
6. Build the companies and models page.
7. Build the weekly digest page.
8. Design pass: offer Kyle options for the visual style and apply his choice across all pages.

### Pass 2: automation

Goal: new entries appear on their own.

1. Verify the source feeds and fill in `sources.json`.
2. Write the fetch and filter step. Test locally first.
3. Write the Claude summarization step. Test on a handful of real items and review the output with Kyle.
4. Add validation and the duplicate check.
5. Add glossary and company updates.
6. Estimate cost and confirm with Kyle.
7. Set up the GitHub Actions workflow and API key secret. Turn on the schedule.

### Later (version 2 and 3)

- Add reputable outlets as sources.
- Better duplicate merging across many outlets.
- Search across the whole site.
- Optional weekly email digest.

## Public launch checklist (future, not now)

Before sharing the site with anyone:

- Switch new entries to `draft` until approved, or spot-check daily.
- Add an About page explaining who made it, why, and how summaries are produced (AI-written, human-reviewed, with sources).
- Add a clear note that summaries can contain mistakes and readers should check the linked sources.
- Re-review copyright practices.
- Decide on a name and domain.

## Open decisions

- Site name
- Domain (buy one, or use the GitHub Pages address for now)
