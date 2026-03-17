import type { GedcomModel } from '../gedcom/types'
import { couplePairsInLevel, pairKey } from './focusRowLayout'

export interface LayoutPersonBlock {
  kind: 'couple' | 'person'
  ids: string[]
  branchKey?: string
}

export interface LayoutRow {
  level: number
  orderedIds: string[]
  slots: Map<string, number>
  blocks: LayoutPersonBlock[]
}

export interface LayoutPlan {
  rows: Map<number, LayoutRow>
  lockedPairsByLevel: Map<number, Set<string>>
}

function normalizeSortableText(value?: string): string {
  return (value ?? 'unknown').trim().toLocaleLowerCase()
}

function personSortKey(model: GedcomModel, personId: string): string {
  const person = model.persons[personId]
  const name = normalizeSortableText(person?.displayName)
  const birth = normalizeSortableText(person?.events.find((event) => event.type === 'BIRT')?.date)
  return `${name}\u0000${birth}\u0000${personId}`
}

function sortedUnique(values: string[], model: GedcomModel): string[] {
  return Array.from(new Set(values)).sort((a, b) => personSortKey(model, a).localeCompare(personSortKey(model, b)))
}

function parentIdsOf(personId: string, model: GedcomModel): string[] {
  const person = model.persons[personId]
  if (!person) return []

  return sortedUnique(
    person.familyAsChildIds.flatMap((familyId) => {
      const family = model.families[familyId]
      if (!family) return []
      return [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id))
    }),
    model,
  )
}

function childIdsOf(personId: string, model: GedcomModel): string[] {
  const person = model.persons[personId]
  if (!person) return []

  return sortedUnique(
    person.familyAsSpouseIds.flatMap((familyId) => {
      const family = model.families[familyId]
      return family ? family.childIds : []
    }),
    model,
  )
}

function branchAwareOrdering(
  level: number,
  ids: string[],
  model: GedcomModel,
  previousRow?: LayoutRow,
  nextRow?: LayoutRow,
  branchKeyById?: Map<string, string>,
): { orderedIds: string[]; branchById: Map<string, string> } {
  if (level <= 0) {
    return { orderedIds: [...ids], branchById: new Map(ids.map((id) => [id, id])) }
  }

  const anchorRow = level > 0 ? previousRow : nextRow
  const anchorIndex = new Map((anchorRow?.orderedIds ?? []).map((id, index) => [id, index]))
  const fallbackBranch = (id: string) => branchKeyById?.get(id) ?? id

  const tuples = ids.map((id) => {
    const anchors =
      level > 0
        ? parentIdsOf(id, model).filter((parentId) => anchorIndex.has(parentId))
        : childIdsOf(id, model).filter((childId) => anchorIndex.has(childId))

    const anchor = anchors[0]
    const anchorRank = anchor ? (anchorIndex.get(anchor) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
    const inheritedBranch = anchor ? fallbackBranch(anchor) : fallbackBranch(id)

    return {
      id,
      branchKey: inheritedBranch,
      anchorRank,
      sortKey: personSortKey(model, id),
    }
  })

  tuples.sort((a, b) => {
    const anchorCmp = a.anchorRank - b.anchorRank
    if (anchorCmp !== 0) return anchorCmp
    const branchCmp = a.branchKey.localeCompare(b.branchKey)
    if (branchCmp !== 0) return branchCmp
    return a.sortKey.localeCompare(b.sortKey)
  })

  return {
    orderedIds: tuples.map((t) => t.id),
    branchById: new Map(tuples.map((t) => [t.id, t.branchKey])),
  }
}

function enforceCoupleAdjacency(ids: string[], model: GedcomModel): string[] {
  const levelSet = new Set(ids)
  const pairs = couplePairsInLevel(levelSet, model)
  if (pairs.length === 0) return ids

  const partnerById = new Map<string, string>()
  pairs.forEach(([a, b]) => {
    partnerById.set(a, b)
    partnerById.set(b, a)
  })

  const consumed = new Set<string>()
  const output: string[] = []

  ids.forEach((id) => {
    if (consumed.has(id)) return
    const partner = partnerById.get(id)
    if (partner && !consumed.has(partner) && levelSet.has(partner)) {
      const pair = [id, partner].sort((a, b) => personSortKey(model, a).localeCompare(personSortKey(model, b)))
      output.push(...pair)
      consumed.add(id)
      consumed.add(partner)
      return
    }

    output.push(id)
    consumed.add(id)
  })

  return output
}

function buildBlocks(ids: string[], branchById: Map<string, string>, model: GedcomModel): LayoutPersonBlock[] {
  const levelSet = new Set(ids)
  const pairSet = new Set(couplePairsInLevel(levelSet, model).map(([a, b]) => pairKey(a, b)))
  const blocks: LayoutPersonBlock[] = []

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i]
    const next = ids[i + 1]
    if (next && pairSet.has(pairKey(id, next))) {
      blocks.push({ kind: 'couple', ids: [id, next], branchKey: branchById.get(id) })
      i += 1
    } else {
      blocks.push({ kind: 'person', ids: [id], branchKey: branchById.get(id) })
    }
  }

  return blocks
}

export function buildLayoutPlan(orderedLevels: number[], visibleIdsByLevel: Map<number, string[]>, model: GedcomModel): LayoutPlan {
  const rows = new Map<number, LayoutRow>()
  const lockedPairsByLevel = new Map<number, Set<string>>()
  const branchById = new Map<string, string>()

  orderedLevels.forEach((level, idx) => {
    const sourceIds = visibleIdsByLevel.get(level) ?? []
    if (sourceIds.length === 0) {
      rows.set(level, { level, orderedIds: [], slots: new Map(), blocks: [] })
      lockedPairsByLevel.set(level, new Set())
      return
    }

    const previousRow = idx > 0 ? rows.get(orderedLevels[idx - 1]) : undefined
    const nextRow = idx < orderedLevels.length - 1 ? rows.get(orderedLevels[idx + 1]) : undefined

    const branchOrdered = branchAwareOrdering(level, sourceIds, model, previousRow, nextRow, branchById)
    let orderedIds = branchOrdered.orderedIds

    if (level === 0) {
      orderedIds = [...sourceIds]
    }

    orderedIds = enforceCoupleAdjacency(orderedIds, model)

    orderedIds.forEach((id) => {
      const key = branchOrdered.branchById.get(id) ?? id
      branchById.set(id, key)
    })

    const slots = new Map(orderedIds.map((id, index) => [id, index]))
    const pairSet = new Set(couplePairsInLevel(new Set(orderedIds), model).map(([a, b]) => pairKey(a, b)))

    rows.set(level, {
      level,
      orderedIds,
      slots,
      blocks: buildBlocks(orderedIds, branchOrdered.branchById, model),
    })
    lockedPairsByLevel.set(level, pairSet)
  })

  return { rows, lockedPairsByLevel }
}
