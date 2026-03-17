import type { GedcomModel } from '../gedcom/types'

export interface FocusRowPersonMeta {
  focusId: string
  siblingIds: Set<string>
  spouseLikeIds: Set<string>
  cousinBranchAnchorById: Map<string, string>
  parentSiblingPrimaryFocusParent: Map<string, string>
  focusParentOrderIndex: Map<string, number>
}

export interface FocusRowOrderingResult {
  orderedIds: string[]
  overflowBreakdown: {
    hiddenCouples: number
    hiddenSiblings: number
    hiddenCousins: number
    hiddenOther: number
  }
}

interface RowBlock {
  ids: string[]
  kind: 'couple' | 'sibling' | 'cousin' | 'other'
  sortKey: string
  includesFocus: boolean
  pinned: boolean
}

interface BucketedBlock {
  ids: string[]
  bucketKey: string
}

function normalizeSortableText(value?: string): string {
  return (value ?? 'unknown').trim().toLocaleLowerCase()
}

function birthDate(model: GedcomModel, personId: string): string {
  const person = model.persons[personId]
  return normalizeSortableText(person?.events.find((event) => event.type === 'BIRT')?.date)
}

function personSortKey(model: GedcomModel, personId: string): string {
  const person = model.persons[personId]
  const name = normalizeSortableText(person?.displayName)
  const birth = birthDate(model, personId)
  return `${name}\u0000${birth}\u0000${personId}`
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`
}

export function couplePairsInLevel(levelIds: Set<string>, model: GedcomModel): Array<[string, string]> {
  const candidates = new Set<string>()

  Object.values(model.families).forEach((family) => {
    const a = family.husbandId
    const b = family.wifeId
    if (!a || !b) return
    if (!levelIds.has(a) || !levelIds.has(b)) return
    const [left, right] = [a, b].sort((x, y) => personSortKey(model, x).localeCompare(personSortKey(model, y)))
    candidates.add(`${left}\u0000${right}`)
  })

  const sortedCandidates = Array.from(candidates)
    .map((entry) => {
      const [a, b] = entry.split('\u0000')
      return [a, b] as [string, string]
    })
    .sort((pairA, pairB) => {
      const aKey = `${personSortKey(model, pairA[0])}\u0000${personSortKey(model, pairA[1])}`
      const bKey = `${personSortKey(model, pairB[0])}\u0000${personSortKey(model, pairB[1])}`
      return aKey.localeCompare(bKey)
    })

  // A person can appear in multiple families. On one row we can only lock one adjacency;
  // greedily choose the first deterministic pair.
  const matched = new Set<string>()
  const output: Array<[string, string]> = []

  sortedCandidates.forEach(([a, b]) => {
    if (matched.has(a) || matched.has(b)) return
    matched.add(a)
    matched.add(b)
    output.push([a, b])
  })

  return output
}

function blockKind(ids: string[], meta: FocusRowPersonMeta): RowBlock['kind'] {
  if (ids.some((id) => meta.spouseLikeIds.has(id))) return 'couple'
  if (ids.some((id) => id === meta.focusId || meta.siblingIds.has(id))) return 'sibling'
  if (ids.some((id) => meta.cousinBranchAnchorById.has(id))) return 'cousin'
  return 'other'
}

function cousinAnchorOrder(id: string, meta: FocusRowPersonMeta): number {
  const anchor = meta.cousinBranchAnchorById.get(id)
  if (!anchor) return Number.MAX_SAFE_INTEGER
  const parent = meta.parentSiblingPrimaryFocusParent.get(anchor)
  if (!parent) return Number.MAX_SAFE_INTEGER
  return meta.focusParentOrderIndex.get(parent) ?? Number.MAX_SAFE_INTEGER
}

function blockSortTuple(block: RowBlock, meta: FocusRowPersonMeta): string {
  const pinnedPriority = block.pinned ? '0' : '1'
  const kindPriority = block.kind === 'couple' ? '0' : block.kind === 'sibling' ? '1' : block.kind === 'cousin' ? '2' : '3'
  const focusPriority = block.includesFocus ? '0' : '1'
  const cousinAnchor = Math.min(...block.ids.map((id) => cousinAnchorOrder(id, meta)))
  const cousinAnchorPart = Number.isFinite(cousinAnchor) ? String(cousinAnchor).padStart(4, '0') : '9999'
  return `${pinnedPriority}\u0000${kindPriority}\u0000${focusPriority}\u0000${cousinAnchorPart}\u0000${block.sortKey}`
}

export function orderFocusRow(levelIds: string[], model: GedcomModel, meta: FocusRowPersonMeta): FocusRowOrderingResult {
  const levelIdSet = new Set(levelIds)
  const pairedIds = new Set<string>()
  const blocks: RowBlock[] = []

  const pairs = couplePairsInLevel(levelIdSet, model)
  pairs.forEach(([a, b]) => {
    pairedIds.add(a)
    pairedIds.add(b)
    const ids = [a, b].sort((x, y) => personSortKey(model, x).localeCompare(personSortKey(model, y)))
    const includesFocus = ids.includes(meta.focusId)
    blocks.push({
      ids,
      kind: 'couple',
      sortKey: ids.map((id) => personSortKey(model, id)).join('\u0000'),
      includesFocus,
      pinned: includesFocus,
    })
  })

  const unpairedIds = Array.from(levelIdSet).filter((id) => !pairedIds.has(id))

  const bucketedBlocks = new Map<string, BucketedBlock>()
  unpairedIds.forEach((id) => {
    let bucketKey: string
    if (id === meta.focusId || meta.siblingIds.has(id)) bucketKey = 'sibling:\u00000'
    else if (meta.cousinBranchAnchorById.has(id)) {
      const anchor = meta.cousinBranchAnchorById.get(id) ?? 'unknown'
      const anchorOrder = cousinAnchorOrder(id, meta)
      const anchorPart = Number.isFinite(anchorOrder) ? String(anchorOrder).padStart(4, '0') : '9999'
      bucketKey = `cousin:\u0000${anchorPart}\u0000${anchor}`
    } else {
      bucketKey = `other:\u0000${id}`
    }

    const existing = bucketedBlocks.get(bucketKey)
    if (existing) {
      existing.ids.push(id)
      return
    }
    bucketedBlocks.set(bucketKey, { ids: [id], bucketKey })
  })

  Array.from(bucketedBlocks.values())
    .sort((a, b) => a.bucketKey.localeCompare(b.bucketKey))
    .forEach((bucket) => {
      const ids = bucket.ids.sort((x, y) => personSortKey(model, x).localeCompare(personSortKey(model, y)))
      blocks.push({
        ids,
        kind: blockKind(ids, meta),
        sortKey: ids.map((id) => personSortKey(model, id)).join('\u0000'),
        includesFocus: ids.includes(meta.focusId),
        pinned: ids.includes(meta.focusId),
      })
    })

  const orderedBlocks = blocks.sort((a, b) => blockSortTuple(a, meta).localeCompare(blockSortTuple(b, meta)))
  const orderedIds = orderedBlocks.flatMap((block) => block.ids)

  return {
    orderedIds,
    overflowBreakdown: {
      hiddenCouples: 0,
      hiddenSiblings: 0,
      hiddenCousins: 0,
      hiddenOther: 0,
    },
  }
}

export function orderNonFocusRow(levelIds: string[], model: GedcomModel, pinnedIds: Set<string>): string[] {
  const levelIdSet = new Set(levelIds)
  const pairedIds = new Set<string>()
  const blocks: Array<{ ids: string[]; sortKey: string; pinned: boolean; isCouple: boolean }> = []

  couplePairsInLevel(levelIdSet, model).forEach(([a, b]) => {
    pairedIds.add(a)
    pairedIds.add(b)
    const ids = [a, b].sort((x, y) => personSortKey(model, x).localeCompare(personSortKey(model, y)))
    blocks.push({
      ids,
      sortKey: ids.map((id) => personSortKey(model, id)).join('\u0000'),
      pinned: ids.some((id) => pinnedIds.has(id)),
      isCouple: true,
    })
  })

  const singles = Array.from(levelIdSet)
    .filter((id) => !pairedIds.has(id))
    .sort((a, b) => personSortKey(model, a).localeCompare(personSortKey(model, b)))

  singles.forEach((id) => {
    blocks.push({
      ids: [id],
      sortKey: personSortKey(model, id),
      pinned: pinnedIds.has(id),
      isCouple: false,
    })
  })

  return blocks
    .sort((a, b) => {
      const pinCmp = Number(b.pinned) - Number(a.pinned)
      if (pinCmp !== 0) return pinCmp
      const coupleCmp = Number(b.isCouple) - Number(a.isCouple)
      if (coupleCmp !== 0) return coupleCmp
      return a.sortKey.localeCompare(b.sortKey)
    })
    .flatMap((block) => block.ids)
}

export function summarizeOverflowKinds(hiddenIds: string[], meta: FocusRowPersonMeta): FocusRowOrderingResult['overflowBreakdown'] {
  return hiddenIds.reduce(
    (summary, id) => {
      if (meta.spouseLikeIds.has(id)) summary.hiddenCouples += 1
      else if (id === meta.focusId || meta.siblingIds.has(id)) summary.hiddenSiblings += 1
      else if (meta.cousinBranchAnchorById.has(id)) summary.hiddenCousins += 1
      else summary.hiddenOther += 1
      return summary
    },
    { hiddenCouples: 0, hiddenSiblings: 0, hiddenCousins: 0, hiddenOther: 0 },
  )
}
