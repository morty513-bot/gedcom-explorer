# AGENTS.md (project-local)

## Goal
Build a mobile+desktop friendly GEDCOM explorer web app with:
- Upload GEDCOM
- Focused family-tree view around a selected person
- Detail panel for selected person (events, names, relationships)
- Compact upload/replace flow once data is loaded

## Engineering rules
- TypeScript only (no JS files for app logic)
- Keep modules small and composable
- Favor pure data transforms in `src/core/*`
- UI in `src/features/*` and `src/components/*`
- Avoid backend unless clearly necessary; default frontend-only

## Dev process
- Keep `README.md` current
- Run `npm run build` before milestone updates
- Keep commits focused and descriptive
- This repository is public: never commit secrets/tokens, private datasets, or personally identifying family records
- Use only synthetic/anonymized GEDCOM fixtures for repository test data
- Before push, sanity-check diffs for accidental private data

## Current architecture
- `src/core/gedcom/*`: line parser + normalized GEDCOM model + selectors
- `src/core/graph/*`: focused subgraph generation (parents/siblings/spouses/children)
- `src/features/upload/*`: GEDCOM upload/import + compact replace flow
- `src/features/people/*`: people list + detail view
- `src/features/tree/*`: SVG tree canvas + click-to-focus nodes
