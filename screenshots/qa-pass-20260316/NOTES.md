# QA Pass Notes (2026-03-16)

- `desktop-uk-royal.png`
  - Dataset: `uk-royal-simple.ged`
  - Focus: Elizabeth Windsor (default focus)
  - Shows spouse adjacency (Elizabeth ↔ Philip), clear descendant layering (children then grandchildren), and readable details panel.

- `desktop-simple-extended-ava.png`
  - Dataset: `simple-extended-family.ged`
  - Focus: Ava King
  - Verifies selected person is auto-centered in the graph viewport after selection (new behavior), plus parent links and relative grouping.

- `mobile-simple-extended-ava.jpg`
  - Dataset: `simple-extended-family.ged`
  - Viewport: ~390x844
  - Shows stacked mobile layout (graph, people list, details) and confirms focus node is visible without manual horizontal panning.

## Uncertainty / follow-up

- Tooltip UX: SVG `<title>` metadata is present and exposed to accessibility tree, but browser-native hover tooltip behavior can vary by environment/device and is not guaranteed on touch devices.
- Relationship clustering: sibling/cousin grouping appears logically correct in these samples, but dense real-world GEDCOMs may still need additional spacing/collision tuning.
