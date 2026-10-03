// Timeline renderer. Reads the month manifest, loads each month's entries,
// and shows published entries newest first.
//
// Paths are relative (no leading slash) because GitHub Pages serves this
// site from /ai-news-site/, not from the root of the domain.

const MANIFEST_URL = "data/entries/index.json";

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

// Build elements with textContent rather than innerHTML, so text from the
// data files is always shown as text and can never run as HTML or script.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderEntry(entry) {
  const article = el("article", "entry");
  article.append(el("h3", "entry-title", entry.title));

  const meta = el("p", "entry-meta", `${entry.date} · ${entry.company} · ${entry.category}`);
  if (entry.confirmed === false) {
    meta.append(" ", el("span", "badge-unconfirmed", "Unconfirmed"));
  }
  article.append(meta);

  article.append(el("p", "entry-summary", entry.summary));
  if (entry.why_it_matters) {
    const why = el("p", "entry-why");
    why.append(el("strong", null, "Why it matters: "), entry.why_it_matters);
    article.append(why);
  }

  const sources = el("ul", "entry-sources");
  for (const source of entry.sources) {
    const link = el("a", null, source.name);
    // Only real web links. Blocks "javascript:" URLs if bad data ever slips in.
    if (/^https?:\/\//.test(source.url)) link.href = source.url;
    const item = el("li");
    item.append(link);
    sources.append(item);
  }
  article.append(sources);

  return article;
}

async function renderTimeline() {
  const container = document.getElementById("timeline");
  try {
    const entries = await loadEntries();
    container.replaceChildren();
    if (entries.length === 0) {
      container.append(el("p", "status", "No entries yet."));
      return;
    }
    for (const entry of entries) container.append(renderEntry(entry));
  } catch (error) {
    console.error(error);
    container.replaceChildren(
      el("p", "status", `Couldn't load the news entries. ${error.message}`)
    );
  }
}

renderTimeline();
