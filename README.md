# GEDCOM Explorer

A TypeScript web app for exploring GEDCOM family data with a focus-first family tree UX.

## Status
Milestone 3 (generation-layered graph layout + broader local family expansion) implemented.

## What it does now
- Upload a GEDCOM file directly in the browser
- After import, auto-focuses the first available person
- Shows a searchable-style people list with friendlier life labels (Born/Died)
- Shows a detail pane with human-friendly sections:
  - Born, Died, Sex
  - Alternate names
  - Spouses (including marriage info where present)
  - Parents, Children, Siblings
- Renders a generation-layered focused family graph around the selected person:
  - Ancestors above (parents + grandparents where available)
  - Focus person centered with siblings/spouses on the same generation row
  - Descendants below (children + grandchildren where available)
  - Spouse links and parent→child links shown separately for readability
  - Click any node to re-focus the graph on that person
- Keeps upload UI compact after a GEDCOM is loaded via a small **Upload/Replace GEDCOM** button

## Architecture
Frontend-first (no backend):
- `src/core/gedcom/*`: parser + normalized model + selectors for details/relationships
- `src/core/graph/*`: focused graph shaping + generation layering and local family expansion logic
- `src/features/upload/*`: upload and compact replace flow
- `src/features/people/*`: people list + detail pane
- `src/features/tree/*`: SVG focused graph rendering

## Tech stack
- React + TypeScript + Vite

## Getting started
```bash
npm install
npm run dev
```

Then upload `samples/sample-family.ged` in the app to test import and focus selection.

## Scripts
- `npm run dev` - local dev server
- `npm run build` - type-check and production build
- `npm run preview` - preview production build

## Deployment
- Vite `base` is set to `/gedcom-explorer/` in `vite.config.ts`.
- Built assets are generated for hosting under that subpath (for example: `https://<host>/gedcom-explorer/`).
- If you deploy at a different path or root domain, update `base` before building.

## Sample GEDCOM for testing
A synthetic fixture is included at:
- `samples/sample-family.ged`

## Privacy note
This repo is public. Do not commit private GEDCOM files or any personal/family-identifying records.
