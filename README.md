# 48 Maplewood Street

A small static site: a journal of projects on the house. No frameworks, no dependencies.
`node build.js` turns the files in `content/`, `src/` and `photos/` into the finished site in `public/`.

## Add photos to a project

1. Put the photos in `photos/<project-slug>/`, for example `photos/kitchen-upgrade/before-1.jpg`.
   Resize them first (about 2000 px on the long side is plenty).
2. In `content/projects.json`, list them under the right area's `before` or `after`:

   ```json
   "before": ["photos/kitchen-upgrade/before-1.jpg"],
   "after":  [{ "src": "photos/kitchen-upgrade/after-1.jpg", "caption": "New counters" }]
   ```

When an area has at least one before and one after photo, its page shows a drag-to-compare slider.

## Fill in a project's details

Each project in `content/projects.json` has:

- `date`: when it was done, e.g. "March 2021"
- `summary`: the work done (blank lines make paragraphs)
- `doneBy`: contractor name, or "Ourselves"
- `permit`: permit number, or "Not required"
- `warranty`: e.g. "10-year manufacturer warranty, through 2031"
- `documents`: files in `docs/`, e.g. `[{ "title": "Building permit", "file": "docs/basement-permit.pdf" }]`
- per-area `notes`

Leave a field empty and the page shows "To add". Costs are deliberately not a field.
`cover` picks the card photo; if empty, the first "after" photo is used.

## Systems at a glance

`systems` in `content/site.json` lists the roof, heating, cooling, water heater, electrical panel and windows.
Fill `installed` (year or age), `lastService` and `notes`; `documents` works like a project's.

## Maintenance record

Add entries to `maintenance` in `content/site.json`:

```json
{ "date": "2024-10", "item": "Gutters cleaned", "by": "Ourselves", "notes": "" }
```

Use year-month dates so they sort correctly. The home page shows the latest three; `/maintenance/` shows all.

## Add a new project

Copy one block in `content/projects.json`, give it a new `slug` and `title`, and list its areas in `sections`.
It appears on the home page and gets its own page at `/home-improvements/<slug>/`.

## Home page

`content/site.json` holds the title, address, tagline, the fact tiles, an optional intro, `heroPhoto`,
the Zillow link and `showMap` (Google Maps embed of the address).
`noindex: true` keeps search engines away, matching the old Google Site.

## Preview locally

```sh
node build.js
npx serve public   # or: python3 -m http.server -d public
```

## Hosting

Render static site: build command `node build.js`, publish directory `public` (see `render.yaml`).
Pushing to the main branch redeploys automatically.
