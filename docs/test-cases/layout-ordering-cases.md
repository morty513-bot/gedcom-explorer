# GEDCOM layout ordering scenario cases

These manual fixtures are for visual/layout QA only (not wired into the in-app demo picker):
`tests/fixtures/gedcom-layout/*.ged`.

## Layout policy expectations

1. Couples on the same row are treated as a locked contiguous block.
2. For focus on a child, the parent couple row (`level -1`) should prioritize the parents as a block directly above the focus branch.
3. Collateral relatives (parent siblings, cousins, others) should not split a couple block.
4. Ordering remains deterministic across repeated renders.

## Cases

### 1) parent-sibling-interleave.ged
- Focus: `Focus Child`
- Expected parent row ordering invariant:
  - `Father` and `Mother` are adjacent.
  - `Uncle (Father Side)` and `Aunt (Mother Side)` do **not** appear between `Father` and `Mother`.
  - Disallowed pattern example: `[Uncle, Father, Aunt, Mother]`.

### 2) remarriage-half-siblings.ged
- Focus: `Focus`
- Expected:
  - `Full Sibling` and `Half Sibling` are both present on focus generation row.
  - Parent remarriage does not break deterministic focus-row ordering.

### 3) cousin-branch-crowding.ged
- Focus: `Focus`
- Expected:
  - Focus+sibling block appears before cousin branch nodes.
  - Cousin branches stay grouped by anchor aunt/uncle branch order.

### 4) single-parent-focus.ged
- Focus: `Focus Child`
- Expected:
  - Single known parent appears on parent row without phantom spouse pairing.
  - Parent sibling appears on same row but cannot break any existing couple block.

### 5) multiple-couples-same-generation.ged
- Focus: `Focus`
- Expected:
  - Every visible couple (`Father/Mother`, `Uncle One/Aunt One`, `Uncle Two/Aunt Two`) is contiguous on its row.
  - No interleaving like `Uncle One, Father, Mother, Aunt One` when both couples are visible.
