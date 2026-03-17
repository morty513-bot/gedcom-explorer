# GEDCOM layout ordering scenario cases

These manual fixtures are for visual/layout QA only (not wired into the in-app demo picker):
`tests/fixtures/gedcom-layout/*.ged`.

## Layout policy expectations

1. Couples on the same row are treated as a locked contiguous block.
2. For focus on a child, the parent couple row (`level -1`) should prioritize the parents as a block directly above the focus branch.
3. Collateral relatives (parent siblings, cousins, others) should not split a couple block.
4. Ordering remains deterministic across repeated renders.

## Cases

### 1) sibling-branch-inversion.ged
- Focus: `Focus Parent`
- Expected:
  - On the child row, `Child A` appears left of `Child B`.
  - On the grandchild row, the `A1/A2` block stays left of the `B1/B2` block.
  - No descendant interleaving like `[A1, B1, A2, B2]`.

### 2) multi-marriage-half-sibling-case.ged
- Focus: `Focus`
- Expected:
  - Full + half sibling both appear on the focus generation row.
  - Parent remarriage does not break deterministic sibling ordering.

### 3) cousin-heavy-branch-case.ged
- Focus: `Focus`
- Expected:
  - Cousin branches are grouped by aunt/uncle anchor branch.
  - Different cousin branches do not interleave unless unavoidable from cross-links.

### 4) parent-sibling-interleave.ged
- Focus: `Focus Child`
- Expected parent row ordering invariant:
  - `Father` and `Mother` are adjacent.
  - `Uncle (Father Side)` and `Aunt (Mother Side)` do **not** appear between `Father` and `Mother`.
  - Disallowed pattern example: `[Uncle, Father, Aunt, Mother]`.

### 5) remarriage-half-siblings.ged
- Focus: `Focus`
- Expected:
  - `Full Sibling` and `Half Sibling` are both present on focus generation row.
  - Parent remarriage does not break deterministic focus-row ordering.

### 6) cousin-branch-crowding.ged
- Focus: `Focus`
- Expected:
  - Focus+sibling block appears before cousin branch nodes.
  - Cousin branches stay grouped by anchor aunt/uncle branch order.

### 7) single-parent-focus.ged
- Focus: `Focus Child`
- Expected:
  - Single known parent appears on parent row without phantom spouse pairing.
  - Parent sibling appears on same row but cannot break any existing couple block.

### 8) multiple-couples-same-generation.ged
- Focus: `Focus`
- Expected:
  - Every visible couple (`Father/Mother`, `Uncle One/Aunt One`, `Uncle Two/Aunt Two`) is contiguous on its row.
  - No interleaving like `Uncle One, Father, Mother, Aunt One` when both couples are visible.
