# AGENTS.md (project-local)

## Goal
Build a mobile+desktop friendly GEDCOM explorer web app with:
- Upload GEDCOM
- Focused family-tree view around a selected person
- Pan/zoom graph view
- Detail panel for selected person (events, names, dates)
- Indicators for hidden/not-expanded relationships

## Engineering rules
- TypeScript only (no JS files for app logic)
- Keep modules small and composable
- Favor pure data transforms in `src/core/*`
- UI in `src/features/*` and `src/components/*`
- Avoid backend unless clearly necessary; default frontend-only

## Dev process
- Keep `README.md` current
- Add tests for parser/graph shaping logic when introduced
- Run `npm run build` before milestone updates
- Keep commits focused and descriptive
- This repository is public: never commit secrets/tokens, private datasets, or personally identifying family records
- Use only synthetic/anonymized GEDCOM fixtures for repository test data
- Before push, sanity-check diffs for accidental private data

## Current architecture
- `src/core/gedcom/*`: line parser + normalized GEDCOM model + selectors
- `src/core/graph/*`: reserved for focus-subgraph + hidden-connection indicators
- `src/features/upload/*`: GEDCOM upload/import flow
- `src/features/people/*`: person list + focus detail view
- `src/features/tree/*`: planned tree canvas and controls
