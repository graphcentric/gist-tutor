# Gist tutor

A small browser course for the Semantic Arts Gist ontology. One card at a time, with your place saved in this browser.

## Run

From this folder:

```bash
python3 -m http.server
```

Open the address it prints (usually http://127.0.0.1:8000).

Progress is stored in this browser under the key `gist-tutor-progress-v1` (lessons finished, and the local dates they were finished, for the streak).

## lessons.json

`data/lessons.json` is the course. Do not invent Gist classes, properties, or definitions; use published gist terms only.

- `title` and `sourceNote` are strings.
- `lessons` is an array of `{id, title, blurb, exercises}`.
- Each exercise has a `type`:
  - `teach`: `term`, `kind` (`class` or `property`), `line`, `example` (optional `exampleHalloween` / `exampleChristmas`)
  - `choice`: `prompt`, `options`, `answer` (index of the right option), `why` (optional seasonal `prompt*` / `options*` / `why*`)
  - `truefalse`: `prompt`, `answer` (`true` or `false`), `why`
  - `match`: `prompt`, `pairs` of `{left, right}`
  - `typein`: `prompt`, `accept` (strings, matched without case), `why`

Teach `line` definitions stay aligned with gist 14.1.0. Seasonal fields only flavour illustrative examples and prompts.

## Seasonal themes

Theme preference is stored under `gist-tutor-theme-v1` as `auto` | `halloween` | `christmas` | `classic`. Progress still uses `gist-tutor-progress-v1` and is not cleared by the theme.

On the home screen you can switch among Auto, Halloween, Gistmas, and Classic.

**Auto** (local calendar via `localISODate`):

- 1 October through 2 November → Halloween
- 1 December through 6 January (crossing the year) → Gistmas (Christmas skin)
- otherwise → Classic

Halloween: purple night sky, parchment cards, moonlight chrome. **Gistmas**: forest green, crimson and gold, holly/ivy accents, and a festive illustration of Dave McComb (Semantic Arts) as Santa Claus. Both keep focus, forced-colours, and reduced-motion support. (Theme preference value remains `christmas` in storage; the UI says Gistmas.)

## Source

Lesson definitions are from Semantic Arts gist 14.1.0, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute https://www.semanticarts.com/gist/ .
