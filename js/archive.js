// Archive page. Every published entry, grouped by month, with filters for
// month, company, category, and importance. Filters combine (an entry must
// match all of them) and are saved in the page address, so a filtered view
// can be bookmarked, e.g. archive.html?company=Anthropic&importance=4.
// Needs js/common.js loaded first.

const FILTER_KEYS = ["month", "company", "category", "importance"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const IMPORTANCE_OPTIONS = [
  { value: "5", label: "5 only" },
  { value: "4", label: "4 and up" },
  { value: "3", label: "3 and up" },
  { value: "2", label: "2 and up" },
];

function monthLabel(yearMonth) {
  const [year, month] = yearMonth.split("-");
  return `${FULL_MONTHS[Number(month) - 1]} ${year}`;
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) counts.set(keyFn(item), (counts.get(keyFn(item)) ?? 0) + 1);
  return counts;
}

// The choices each filter offers, built from the entries themselves so the
// menus never list a company or month with nothing in it.
function filterOptions(entries) {
  const months = countBy(entries, (e) => e.date.slice(0, 7));
  const companies = countBy(entries, (e) => e.company);
  const categories = countBy(entries, (e) => e.category);
  return {
    month: [...months.keys()].sort().reverse()
      .map((m) => ({ value: m, label: `${monthLabel(m)} (${months.get(m)})` })),
    company: [...companies.keys()].sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: `${c} (${companies.get(c)})` })),
    category: Object.keys(CATEGORY_LABELS).filter((c) => categories.has(c))
      .map((c) => ({ value: c, label: `${CATEGORY_LABELS[c]} (${categories.get(c)})` })),
    importance: IMPORTANCE_OPTIONS,
  };
}

// Read filters from the address, ignoring anything that isn't a real choice.
function filtersFromUrl(options) {
  const params = new URLSearchParams(location.search);
  const filters = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value && options[key].some((o) => o.value === value)) filters[key] = value;
  }
  return filters;
}

function filtersToUrl(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) if (filters[key]) params.set(key, filters[key]);
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function matchesFilters(entry, filters) {
  if (filters.month && entry.date.slice(0, 7) !== filters.month) return false;
  if (filters.company && entry.company !== filters.company) return false;
  if (filters.category && entry.category !== filters.category) return false;
  if (filters.importance && entry.importance < Number(filters.importance)) return false;
  return true;
}

function fillSelect(select, options) {
  for (const { value, label } of options) {
    const option = el("option", null, label);
    option.value = value;
    select.append(option);
  }
}

// Entries arrive newest first, so months come out newest first too.
function renderMonthGroups(entries, glossary) {
  const groups = [];
  let current = null;
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    if (!current || current.month !== month) {
      current = { month, entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups.map(({ month, entries: list }) => {
    const section = el("section", "archive-month");
    section.setAttribute("aria-label", monthLabel(month));
    const heading = el("h2", "month-heading", monthLabel(month));
    heading.append(el("span", "month-count", list.length === 1 ? "1 entry" : `${list.length} entries`));
    section.append(heading, ...list.map((entry) => renderEntry(entry, glossary)));
    return section;
  });
}

async function renderArchive() {
  const container = document.getElementById("archive");
  const stats = document.getElementById("stats");
  const count = document.getElementById("result-count");
  const clear = document.getElementById("clear-filters");
  const form = document.getElementById("filters");
  const selects = Object.fromEntries(FILTER_KEYS.map((key) => [key, document.getElementById(`filter-${key}`)]));
  try {
    const [entries, glossary] = await Promise.all([
      loadEntries(),
      loadGlossary().catch((error) => { console.error(error); return null; }),
    ]);
    container.replaceChildren();
    if (entries.length === 0) {
      container.append(el("p", "status", "No entries yet."));
      return;
    }
    if (stats) stats.textContent = `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;

    const options = filterOptions(entries);
    for (const key of FILTER_KEYS) fillSelect(selects[key], options[key]);
    const initial = filtersFromUrl(options);
    for (const key of FILTER_KEYS) selects[key].value = initial[key] ?? "";

    const update = () => {
      const filters = {};
      for (const key of FILTER_KEYS) if (selects[key].value) filters[key] = selects[key].value;
      filtersToUrl(filters);

      const shown = entries.filter((entry) => matchesFilters(entry, filters));
      const active = Object.keys(filters).length > 0;
      count.textContent = active
        ? `Showing ${shown.length} of ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
        : `All ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`;
      clear.disabled = !active;

      if (shown.length === 0) {
        container.replaceChildren(el("p", "status", "No entries match these filters. Try removing one, or clear them all."));
      } else {
        container.replaceChildren(...renderMonthGroups(shown, glossary));
      }
    };

    for (const key of FILTER_KEYS) selects[key].addEventListener("change", update);
    clear.addEventListener("click", () => {
      for (const key of FILTER_KEYS) selects[key].value = "";
      update();
    });
    if (form) form.addEventListener("submit", (event) => event.preventDefault());
    update();
    scrollToHash();
  } catch (error) {
    console.error(error);
    container.replaceChildren(el("p", "status", `Couldn't load the archive. ${error.message}`));
  }
}

renderArchive();
