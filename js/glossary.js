// Glossary page. Lists every term alphabetically under letter headings, with
// a search box. Each term shows its definition, an example, related terms,
// and the entries that use it. Needs js/common.js loaded first.

// Group sorted terms by first letter: [["A", [...]], ["B", [...]], ...]
function groupByLetter(terms) {
  const groups = new Map();
  for (const term of terms) {
    const letter = term.term[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(term);
  }
  return [...groups];
}

function renderTerm(term, glossary, usedIn) {
  const card = el("article", "term-card glass");
  card.id = termId(term.term);
  card.dataset.search = [term.term, term.definition, term.example ?? ""].join(" ").toLowerCase();

  card.append(el("h3", "term-name", term.term), el("p", "term-definition", term.definition));

  if (term.example) {
    const example = el("p", "term-example");
    example.append(el("strong", null, "For example: "), term.example);
    card.append(example);
  }

  const related = term.related.filter((name) => glossary.has(name));
  if (related.length) {
    const row = el("div", "term-row");
    row.append(el("span", "term-row-label", "Related"));
    const links = el("div", "term-chips");
    for (const name of related) {
      const link = el("a", "term-chip", name);
      link.href = `#${termId(name)}`;
      links.append(link);
    }
    row.append(links);
    card.append(row);
  }

  if (usedIn.length) {
    const row = el("div", "term-row");
    row.append(el("span", "term-row-label", usedIn.length === 1 ? "Used in 1 entry" : `Used in ${usedIn.length} entries`));
    const list = el("ul", "term-entries");
    for (const entry of usedIn) {
      const item = el("li");
      const link = el("a", null, entry.title);
      link.href = `./#${entry.id}`;
      const date = el("time", "term-entry-date", formatDate(entry.date));
      date.dateTime = entry.date;
      item.append(link, date);
      list.append(item);
    }
    row.append(list);
    card.append(row);
  }
  return card;
}

// Show only terms whose name, definition, or example contains the search text.
function applySearch(query, groups, status) {
  const q = query.trim().toLowerCase();
  let shown = 0;
  for (const { section, cards } of groups) {
    let visibleInGroup = 0;
    for (const card of cards) {
      const match = q === "" || card.dataset.search.includes(q);
      card.hidden = !match;
      if (match) visibleInGroup++;
    }
    section.hidden = visibleInGroup === 0;
    shown += visibleInGroup;
  }
  status.hidden = shown > 0;
  status.textContent = shown > 0 ? "" : `No terms match "${query.trim()}".`;
}

async function renderGlossaryPage() {
  const container = document.getElementById("glossary");
  const stats = document.getElementById("stats");
  const search = document.getElementById("glossary-search");
  const status = document.getElementById("search-status");
  try {
    // Entries only add the "Used in" lists, so the glossary still shows if they fail to load.
    const [glossary, entries] = await Promise.all([
      loadGlossary(),
      loadEntries().catch((error) => { console.error(error); return []; }),
    ]);
    container.replaceChildren();
    const terms = [...glossary.values()].sort((a, b) =>
      a.term.localeCompare(b.term, "en", { sensitivity: "base" })
    );
    if (terms.length === 0) {
      container.append(el("p", "status", "No glossary terms yet."));
      return;
    }
    if (stats) stats.textContent = `${terms.length} ${terms.length === 1 ? "term" : "terms"}`;

    const groups = [];
    for (const [letter, letterTerms] of groupByLetter(terms)) {
      const section = el("section", "letter-group");
      section.setAttribute("aria-label", letter);
      const cards = letterTerms.map((term) =>
        renderTerm(term, glossary, entries.filter((entry) => entry.terms.includes(term.term)))
      );
      section.append(el("h2", "letter", letter), ...cards);
      container.append(section);
      groups.push({ section, cards });
    }

    if (search && status) {
      search.addEventListener("input", () => applySearch(search.value, groups, status));
      if (search.value) applySearch(search.value, groups, status);
    }
    scrollToHash();
  } catch (error) {
    console.error(error);
    container.replaceChildren(el("p", "status", `Couldn't load the glossary. ${error.message}`));
  }
}

renderGlossaryPage();
