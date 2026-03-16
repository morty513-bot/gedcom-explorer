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

function couplePairsInLevel(levelIds: Set<string>, model: GedcomModel): Array<[string, string]> {
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
  const kindPriority = block.kind === 'couple' ? '0' : block.kind === 'sibling' ? '1' : block.kind === 'cousin' ? '2' : '3'
  const focusPriority = block.includesFocus ? '0' : '1'
  const cousinAnchor = Math.min(...block.ids.map((id) => cousinAnchorOrder(id, meta)))
  const cousinAnchorPart = Number.isFinite(cousinAnchor) ? String(cousinAnchor).padStart(4, '0') : '9999'
  return `${kindPriority}\u0000${focusPriority}\u0000${cousinAnchorPart}\u0000${block.sortKey}`
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
    })
  })

  Array.from(levelIdSet)
    .filter((id) => !pairedIds.has(id))
    .forEach((id) => {
      blocks.push({
        ids: [id],
        kind: blockKind([id], meta),
        sortKey: personSortKey(model, id),
        includesFocus: id === meta.focusId,
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
