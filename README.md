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
  - `teach`: `term`, `kind` (`class` or `property`), `line`, `example`
  - `choice`: `prompt`, `options`, `answer` (index of the right option), `why`
  - `truefalse`: `prompt`, `answer` (`true` or `false`), `why`
  - `match`: `prompt`, `pairs` of `{left, right}`
  - `typein`: `prompt`, `accept` (strings, matched without case), `why`


## Halloween theme

In late October (1 October through 2 November, local calendar), a Halloween skin turns on automatically. On the home screen you can switch among Auto, Halloween, and Classic; the choice is stored in this browser under `gist-tutor-theme-v1`. Progress still uses `gist-tutor-progress-v1` and is not cleared by the theme.

## Source

Lesson definitions are from Semantic Arts gist 14.1.0, used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Attribute https://www.semanticarts.com/gist/ .
