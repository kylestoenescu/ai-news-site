// Timeline page. Shows the most important story of the last 7 days as the
// top story, then every other published entry newest first. Glossary terms
// in each entry link to their definitions. Needs js/common.js loaded first.

const TOP_STORY_DAYS = 7;

// The most important entry from the last 7 days; the newest wins a tie.
function pickTopStory(entries) {
  const cutoff = isoDaysAgo(TOP_STORY_DAYS);
  const recent = entries.filter((entry) => entry.date > cutoff);
  if (recent.length === 0) return null;
  return recent.reduce((best, entry) =>
    entry.importance > best.importance ? entry : best
  );
}

function renderTopStory(entry, glossary) {
  const article = el("article", "lead glass sheen");
  article.id = entry.id;

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
    ...entryText(entry, glossary, { summary: "lead-summary", why: "lead-why" }),
    sourceLinks(entry),
  );
  return article;
}

async function renderTimeline() {
  const container = document.getElementById("timeline");
  const leadSlot = document.getElementById("lead");
  const stats = document.getElementById("stats");
  try {
    // The glossary only adds term links, so the timeline still shows if it fails to load.
    const [entries, glossary] = await Promise.all([
      loadEntries(),
      loadGlossary().catch((error) => { console.error(error); return null; }),
    ]);
    container.replaceChildren();
    if (entries.length === 0) {
      container.append(el("p", "status", "No entries yet."));
      return;
    }

    const count = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
    if (stats) stats.textContent = `${count} · updated ${formatDate(entries[0].date)}`;

    const top = pickTopStory(entries);
    if (top && leadSlot) {
      leadSlot.replaceChildren(renderTopStory(top, glossary));
      leadSlot.hidden = false;
    }
    for (const entry of entries) {
      if (entry !== top) container.append(renderEntry(entry, glossary));
    }
    scrollToHash();
  } catch (error) {
    console.error(error);
    container.replaceChildren(
      el("p", "status", `Couldn't load the news entries. ${error.message}`)
    );
  }
}

renderTimeline();
