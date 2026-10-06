# Gistmas Advent — Gist tutor

A twenty-four day Advent calendar for the Semantic Arts [gist](https://www.semanticarts.com/gist/) ontology. Open a door each day, learn real gist terms, and collect a virtual chocolate. Progress stays in this browser — no logins.

## Run

From this folder:

```bash
python3 -m http.server
```

Open the address it prints (usually http://127.0.0.1:8000).

## Advent calendar

- Home is a **24-door Gistmas Advent grid** (days `day-01` … `day-24`).
- Doors unlock **in sequence** as you finish the previous day. Each door also shows an “Opens Dec N” hint.
- Finishing a day awards a **foil-wrapped virtual chocolate** (stored under `gist-tutor-advent-v1`; completed lessons still use `gist-tutor-progress-v1`).
- Each lesson carries a short **Advent / Nativity beat** woven with faithful gist teaching — warm and reverent, not a sermon dump.
- Teach `line` definitions stay aligned with **gist 14.1.0** skos definitions. Do not invent gist terms.

## Gistmas theme

The site is **Gistmas only** — forest green, crimson and gold, holly/ivy, CSS snowfall (respects `prefers-reduced-motion`), and Dave McComb (Semantic Arts) as Santa — soft large home backdrop (`assets/dave-santa-bg.jpg`, from `assets/dave-santa.jpg`). Greeting: **Merry Gistmas, one and all**. There is no Halloween or classic theme toggle.

## lessons.json

`data/lessons.json` is the course.

- `title`, `sourceNote`, `lessons[]`
- Each lesson: `{id, title, blurb, adventBeat, exercises}`
- Exercise types: `teach`, `choice`, `truefalse`, `match`, `typein` (optional `*Christmas` fields on examples and prompts; unused Halloween fields are ignored)

## Source

Lesson definitions from Semantic Arts gist 14.1.0, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute https://www.semanticarts.com/gist/ .

Public site: https://graphcentric.github.io/gist-tutor/

## Login gate

On first visit the site shows a small Gistmas login screen. It compares a SHA-256 digest of
`username:password` in the browser and remembers success in `localStorage` under
`gist-tutor-auth-v1`. This is a light deterrent only, not real security. To be asked again,
clear that key (or site data) in the browser.
