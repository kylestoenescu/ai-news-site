// Shared code for every page: loading the data files, formatting dates,
// building elements safely, and turning glossary terms into links.
// Each page loads this file first, then its own script.
//
// Paths are relative (no leading slash) because GitHub Pages serves this
// site from /ai-news-site/, not from the root of the domain.

const MANIFEST_URL = "data/entries/index.json";
const GLOSSARY_URL = "data/glossary.json";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CATEGORY_LABELS = {
  "model-release": "Model release",
  product: "Product",
  research: "Research",
  company: "Company",
  policy: "Policy",
  other: "Other",
};

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  }
  return response.json();
}

// Run fn over items, at most `limit` at a time, keeping results in order.
// Requesting every month file at once makes simple local servers (like
// Python's http.server) refuse some connections, and browsers would queue the
// extra requests anyway.
async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Every published entry, newest first.
async function loadEntries() {
  const months = await fetchJson(MANIFEST_URL);
  const monthFiles = await mapWithLimit(months, 4, (month) =>
    fetchJson(`data/entries/${month}.json`)
  );
  return monthFiles
    .flat()
    .filter((entry) => entry.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date));
}

// The glossary as a Map from term to its definition record.
async function loadGlossary() {
  const terms = await fetchJson(GLOSSARY_URL);
  return new Map(terms.map((t) => [t.term, t]));
}

// Dates are compared and shown as plain "YYYY-MM-DD" strings. Parsing them
// with new Date() would treat them as UTC midnight and can show the previous
// day in US time zones.
function localIso(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localIso(d);
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-");
  const short = `${MONTHS[Number(month) - 1]} ${Number(day)}`;
  return year === localIso(new Date()).slice(0, 4) ? short : `${short}, ${year}`;
}

// Build elements with textContent rather than innerHTML, so text from the
// data files is always shown as text and can never run as HTML or script.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// "context window" -> "term-context-window", used as the glossary anchor.
function termId(term) {
  return "term-" + term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Split text into plain strings and glossary links. Each term is linked once
// per entry (tracked in `used`), at its first mention, including simple word
// forms like "tokens" or "prompted". Longer terms go first so "frontier model"
// wins over a shorter term inside it.
function linkTerms(text, terms, glossary, used) {
  let parts = [text];
  if (!glossary) return parts;
  const ordered = [...terms].sort((a, b) => b.length - a.length);
  for (const term of ordered) {
    if (used.has(term) || !glossary.has(term)) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(term)}(?:s|es|ed|ing)?\\b`, "i");
    for (let i = 0; i < parts.length; i++) {
      if (typeof parts[i] !== "string") continue;
      const match = pattern.exec(parts[i]);
      if (!match) continue;
      const link = el("a", "term-link", match[0]);
      link.href = `glossary.html#${termId(term)}`;
      link.title = glossary.get(term).definition;
      const before = parts[i].slice(0, match.index);
      const after = parts[i].slice(match.index + match[0].length);
      parts.splice(i, 1, before, link, after);
      used.add(term);
      break;
    }
  }
  return parts.filter((part) => part !== "");
}

// Pages draw their content after loading data, which is too late for the
// browser's own jump to a #link. Call this once the content is on the page.
function scrollToHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ block: "start" });
}

// ---------- Entry cards (timeline, archive, and later pages) ----------

function importanceDots(importance) {
  const dots = el("span", "dots");
  dots.title = `Importance ${importance} of 5`;
  dots.setAttribute("aria-label", `Importance ${importance} of 5`);
  for (let i = 1; i <= 5; i++) dots.append(el("i", i <= importance ? "on" : ""));
  return dots;
}

function sourceLinks(entry) {
  const list = el("div", "sources");
  for (const source of entry.sources) {
    const link = el("a", null, `${source.name} ↗`);
    // Only real web links. Blocks "javascript:" URLs if bad data ever slips in.
    if (/^https?:\/\//.test(source.url)) {
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener";
    }
    list.append(link);
  }
  return list;
}

// Summary and "why it matters" paragraphs, sharing one set of linked terms so
// each term is linked only once per entry.
function entryText(entry, glossary, classes) {
  const used = new Set();
  const summary = el("p", classes.summary);
  summary.append(...linkTerms(entry.summary, entry.terms, glossary, used));
  const parts = [summary];
  if (entry.why_it_matters) {
    const why = el("p", classes.why);
    why.append(el("strong", null, "Why it matters: "), ...linkTerms(entry.why_it_matters, entry.terms, glossary, used));
    parts.push(why);
  }
  return parts;
}

function renderEntry(entry, glossary) {
  const article = el("article", "entry glass sheen");
  article.id = entry.id;

  const meta = el("p", "entry-meta");
  meta.append(el("span", "chip", entry.company), el("span", null, CATEGORY_LABELS[entry.category] ?? entry.category));
  if (entry.confirmed === false) meta.append(el("span", "badge-unconfirmed", "Unconfirmed"));
  meta.append(importanceDots(entry.importance));
  const time = el("time", "entry-date", formatDate(entry.date));
  time.dateTime = entry.date;
  meta.append(time);

  article.append(
    meta,
    el("h3", "entry-title", entry.title),
    ...entryText(entry, glossary, { summary: "entry-summary", why: "entry-why" }),
    sourceLinks(entry),
  );
  return article;
}
