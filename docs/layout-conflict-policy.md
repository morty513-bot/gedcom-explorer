# Family Tree Layout Conflict Policy

This renderer now uses a two-phase layout pipeline:
1. Build an abstract row/block layout model (`LayoutPlan`) decoupled from SVG rendering.
2. Render graph coordinates from that plan.

When constraints conflict, these priorities are applied in order:

1. **Generation layering is strict**
   - Ancestors stay above descendants.
   - A person is pinned to the nearest valid generation level.
2. **Couple adjacency is strict on a row**
   - Visible spouse pairs are rendered as contiguous blocks.
3. **Sibling-subtree coherence is strict when acyclic anchors exist**
   - If sibling branch A is left of B, descendants of A keep their block left of descendants of B.
4. **Non-overlap between sibling branch blocks is preferred**
   - Row ordering groups by inherited branch anchor to avoid interleaving.
5. **Deterministic stability is strict**
   - Ties break by normalized name, birth date, then ID.
6. **Cross-links/cycles are best-effort exceptions**
   - If a node has conflicting anchors (multi-parent branch links, cousin loops), one deterministic primary anchor is chosen and edge crossings are allowed.

## Practical note

The plan intentionally favors branch coherence over local edge-shortening. This can increase edge length in dense cousin/remarriage cases, but avoids visually confusing branch inversions.
