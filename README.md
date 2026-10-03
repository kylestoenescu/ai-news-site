# AI News (working title)

AI news in plain English. Each entry is a short, jargon-free summary with links
to the original sources, shown on a timeline alongside a glossary of AI terms
and a directory of the major AI companies.

Plain HTML, CSS, and JavaScript, hosted on GitHub Pages. All content lives in
JSON files under `data/`; the pages read those files and render them.

## Run it locally

Serve the folder with a local web server. Opening `index.html` by
double-clicking won't work: browsers block a page opened from disk (`file://`)
from reading the JSON files.

```
python -m http.server 8000
```

Then visit <http://localhost:8000>.

## Project brief

See [CLAUDE.md](CLAUDE.md) for scope, data formats, writing rules, and the
build plan.
