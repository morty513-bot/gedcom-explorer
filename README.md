# GEDCOM Explorer

A TypeScript web app for exploring GEDCOM family data with a focus-first tree UI.

## Status
Milestone 1 (import + parse + person focus list) implemented.

## Product direction
- Upload GEDCOM file in browser
- Pick/focus a person
- Render an expandable family tree neighborhood around focus person
- Show concise data in tree nodes
- Show full person details (events, alternate names, dates, notes) in a side panel/bottom sheet
- Show indicators for hidden/not-expanded relationships
- Support desktop and mobile

## Architecture (planned)
Frontend-first (no backend initially):
- Parse GEDCOM client-side
- Normalize into internal model (`Person`, `Family`, `Event`)
- Build focus subgraph from selected person
- Render graph with pan/zoom

If we later hit browser limits on very large files, we can add an optional backend API.

## Tech stack
- React + TypeScript + Vite
- (Planned) graph rendering library for pan/zoom + custom edge/node semantics

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

## Sample GEDCOM for testing
A synthetic fixture is included at:
- `samples/sample-family.ged`

Use this for smoke-testing upload/import in browser without exposing real family data.

## Privacy note
This repo is public. Do not commit private GEDCOM files or any personal/family-identifying records.

## Implemented in this milestone
- GEDCOM upload/import from browser (`.ged` file input)
- Parser for core GEDCOM records (`INDI`, `FAM`, names, sex, family links, basic events)
- Normalized in-memory model (`Person`, `Family`, `Event`)
- Person list rendering from parsed model
- Focus person selection with event details panel

## Next milestones
1. Person search/filter UX
2. Focused graph render (parents/partners/children)
3. Hidden-connection indicators
4. Details panel + responsive layout polish
5. Parser coverage expansion + tests
