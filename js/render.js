// Timeline renderer. Reads the month manifest, loads each month's entries,
// shows the most important story of the last 7 days as the top story, and
// lists every other published entry newest first.
//
// Paths are relative (no leading slash) because GitHub Pages serves this
// site from /ai-news-site/, not from the root of the domain.

const MANIFEST_URL = "data/entries/index.json";
const TOP_STORY_DAYS = 7;

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

// Dates are compared and shown as plain "YYYY-MM-DD" strings. Parsing them
// with new Date() would treat them as UTC midnight and can show the previous
// day in US time zones.
function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split("-");
  const short = `${MONTHS[Number(month) - 1]} ${Number(day)}`;
  return year === todayIso().slice(0, 4) ? short : `${short}, ${year}`;
}

// The most important entry from the last 7 days; the newest wins a tie.
function pickTopStory(entries) {
  const cutoff = isoDaysAgo(TOP_STORY_DAYS);
  const recent = entries.filter((entry) => entry.date > cutoff);
  if (recent.length === 0) return null;
  return recent.reduce((best, entry) =>
    entry.importance > best.importance ? entry : best
  );
}

// Build elements with textContent rather than innerHTML, so text from the
// data files is always shown as text and can never run as HTML or script.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

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

function whyItMatters(entry, className) {
  const why = el("p", className);
  why.append(el("strong", null, "Why it matters: "), entry.why_it_matters);
  return why;
}

function renderEntry(entry) {
  const article = el("article", "entry glass sheen");

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
    el("p", "entry-summary", entry.summary),
  );
  if (entry.why_it_matters) article.append(whyItMatters(entry, "entry-why"));
  article.append(sourceLinks(entry));
  return article;
}

function renderTopStory(entry) {
  const article = el("article", "lead glass sheen");

  const kicker = el("p", "lead-kicker");
  kicker.append(
    el("span", "lead-label", "Top story this week"),
    el("span", null, entry.company),
    el("span", null, formatDate(entry.date)),
    el("span", null, `Importance ${entry.importance}/5`),
  );
  if (entry.confirmed === false) kicker.append(el("span", "badge-unconfirmed", "Unconfirmed"));

  article.append(
    kicker,
    el("h2", "lead-title", entry.title),
    el("p", "lead-summary", entry.summary),
  );
  if (entry.why_it_matters) article.append(whyItMatters(entry, "lead-why"));
  article.append(sourceLinks(entry));
  return article;
}

async function renderTimeline() {
  const container = document.getElementById("timeline");
  const leadSlot = document.getElementById("lead");
  const stats = document.getElementById("stats");
  try {
    const entries = await loadEntries();
    container.replaceChildren();
    if (entries.length === 0) {
      container.append(el("p", "status", "No entries yet."));
      return;
    }

    const count = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
    if (stats) stats.textContent = `${count} · updated ${formatDate(entries[0].date)}`;

    const top = pickTopStory(entries);
    if (top && leadSlot) {
      leadSlot.replaceChildren(renderTopStory(top));
      leadSlot.hidden = false;
    }
    for (const entry of entries) {
      if (entry !== top) container.append(renderEntry(entry));
    }
  } catch (error) {
    console.error(error);
    container.replaceChildren(
      el("p", "status", `Couldn't load the news entries. ${error.message}`)
    );
  }
}

renderTimeline();
