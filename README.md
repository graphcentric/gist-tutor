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

## Seasonal themes

Theme preference is stored under `gist-tutor-theme-v1` as `auto` | `halloween` | `christmas` | `classic`.

**Auto** (local calendar via `localISODate`):

- 1 October through 2 November → Halloween
- **1 December through 6 January** → Gistmas (Christmas skin; Advent is the home experience)
- otherwise → Classic

**Gistmas**: forest green, crimson and gold, holly/ivy, CSS snowfall (respects `prefers-reduced-motion`), and Dave McComb (Semantic Arts) as Santa (`assets/dave-santa.jpg`). UI label is Gistmas; storage value remains `christmas`.

## lessons.json

`data/lessons.json` is the course.

- `title`, `sourceNote`, `lessons[]`
- Each lesson: `{id, title, blurb, adventBeat, exercises}`
- Exercise types: `teach`, `choice`, `truefalse`, `match`, `typein` (optional seasonal `*Halloween` / `*Christmas` fields on examples and prompts)

## Source

Lesson definitions from Semantic Arts gist 14.1.0, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute https://www.semanticarts.com/gist/ .

Public site: https://graphcentric.github.io/gist-tutor/
