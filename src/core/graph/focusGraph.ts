import type { Family, GedcomModel, Person } from '../gedcom/types'
import { getFocusPersonDetails } from '../gedcom/selectors'
import { inferredSiblingsOf, parentIdsOf } from '../gedcom/relationships'
import { orderFocusRow, summarizeOverflowKinds } from './focusRowLayout'

export interface GraphNode {
  id: string
  label: string
  detail?: string
  x: number
  y: number
  kind: 'focus' | 'ancestor' | 'sibling' | 'spouse' | 'relative' | 'descendant' | 'overflow'
  selectable?: boolean
}

export interface GraphEdge {
  from: string
  to: string
  label?: string
  parents?: string[]
  kind: 'parent-child' | 'spouse'
}

export interface FocusGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

const NODE_W = 200
const ROW_GAP = 130
const COL_GAP = 230
const PADDING_X = 120
const PADDING_Y = 90
const OVERFLOW_PREFIX = '__overflow__'

const LEVEL_CAPS: Record<number, number> = {
  [-3]: 8,
  [-2]: 10,
  [-1]: 12,
  [0]: 16,
  [1]: 12,
  [2]: 10,
  [3]: 8,
}

function lifeDetail(person: Person): string | undefined {
  const birth = person.events.find((event) => event.type === 'BIRT')?.date
  const death = person.events.find((event) => event.type === 'DEAT')?.date
  const parts = [birth ? `Born ${birth}` : undefined, death ? `Died ${death}` : undefined].filter(Boolean)
  return parts.length > 0 ? parts.join(' • ') : undefined
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

function spouseIdsInFamily(family: Family, personId: string): string[] {
  return [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id) && id !== personId)
}

function normalizeSortableText(value?: string): string {
  return (value ?? 'unknown').trim().toLocaleLowerCase()
}

function birthDate(person?: Person): string {
  return normalizeSortableText(person?.events.find((event) => event.type === 'BIRT')?.date)
}

function personSortKey(person?: Person, fallbackId?: string): string {
  const name = normalizeSortableText(person?.displayName)
  const birth = birthDate(person)
  const id = fallbackId ?? person?.id ?? ''
  return `${name}\u0000${birth}\u0000${id}`
}

function orderedIds(ids: Iterable<string>, model: GedcomModel): string[] {
  return Array.from(ids).sort((a, b) => personSortKey(model.persons[a], a).localeCompare(personSortKey(model.persons[b], b)))
}

function firstSortedMatch(ids: Iterable<string>, model: GedcomModel): string | undefined {
  const sorted = orderedIds(ids, model)
  return sorted[0]
}

function childIdsOf(personId: string, model: GedcomModel): string[] {
  const person = model.persons[personId]
  if (!person) return []
  return uniqueStrings(
    person.familyAsSpouseIds.flatMap((familyId) => {
      const family = model.families[familyId]
      return family ? family.childIds : []
    }),
  )
}

function siblingsOf(personId: string, model: GedcomModel): string[] {
  return inferredSiblingsOf(personId, model).map((sibling) => sibling.id)
}

function placeAtLevel(levelById: Map<string, number>, id: string, level: number): void {
  const current = levelById.get(id)
  if (current === undefined) {
    levelById.set(id, level)
    return
  }

  const currentAbs = Math.abs(current)
  const nextAbs = Math.abs(level)
  if (nextAbs < currentAbs || (nextAbs === currentAbs && level < current)) {
    levelById.set(id, level)
  }
}

function midpoint(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function resolveDesiredSlots(
  ids: string[],
  baseSlots: Map<string, number>,
  desiredSlots: Map<string, number>,
  spouseLikeIds: Set<string>,
): Map<string, number> {
  const orderedIds = [...ids]
  const slots = orderedIds.map((id) => desiredSlots.get(id) ?? baseSlots.get(id) ?? 0)

  const resolved = [...slots]
  for (let i = 1; i < resolved.length; i += 1) {
    resolved[i] = Math.max(resolved[i], resolved[i - 1] + 1)
  }
  for (let i = resolved.length - 2; i >= 0; i -= 1) {
    resolved[i] = Math.min(resolved[i], resolved[i + 1] - 1)
  }

  // Keep partner pairs visually adjacent where possible.
  for (let i = 0; i < orderedIds.length - 1; i += 1) {
    const leftId = orderedIds[i]
    const rightId = orderedIds[i + 1]
    if (!spouseLikeIds.has(leftId) || !spouseLikeIds.has(rightId)) continue
    const left = resolved[i]
    const right = resolved[i + 1]
    if (right - left > 1.4) {
      const mid = (left + right) / 2
      resolved[i] = mid - 0.5
      resolved[i + 1] = mid + 0.5
    }
  }

  return new Map(orderedIds.map((id, index) => [id, resolved[index]]))
}

export function buildFocusGraph(model: GedcomModel, personId?: string): FocusGraph | undefined {
  const details = getFocusPersonDetails(model, personId)
  if (!details) return undefined

  const focusId = details.person.id
  const levelById = new Map<string, number>()
  const siblingIds = new Set<string>()
  const siblingRelationshipById = new Map<string, 'full' | 'half' | 'unknown'>()
  const spouseLikeIds = new Set<string>()
  const collateralIds = new Set<string>()

  placeAtLevel(levelById, focusId, 0)

  const parentIds = parentIdsOf(focusId, model)
  parentIds.forEach((id) => placeAtLevel(levelById, id, -1))

  inferredSiblingsOf(focusId, model).forEach((sibling) => {
    siblingIds.add(sibling.id)
    siblingRelationshipById.set(sibling.id, sibling.relationship)
    placeAtLevel(levelById, sibling.id, 0)
  })

  const directSpouseIds = uniqueStrings(
    details.person.familyAsSpouseIds.flatMap((familyId) => {
      const family = model.families[familyId]
      return family ? spouseIdsInFamily(family, focusId) : []
    }),
  )
  directSpouseIds.forEach((id) => {
    spouseLikeIds.add(id)
    placeAtLevel(levelById, id, 0)
  })

  const childIds = childIdsOf(focusId, model)
  childIds.forEach((id) => placeAtLevel(levelById, id, 1))

  const childCoparentIds = uniqueStrings(
    childIds.flatMap((childId) => {
      const child = model.persons[childId]
      if (!child) return []
      return child.familyAsChildIds.flatMap((familyId) => {
        const family = model.families[familyId]
        return family ? spouseIdsInFamily(family, childId) : []
      })
    }),
  ).filter((id) => id !== focusId)

  childCoparentIds.forEach((id) => {
    spouseLikeIds.add(id)
    placeAtLevel(levelById, id, 0)
  })

  let ancestorFrontier = [...parentIds]
  for (let level = -2; level >= -3; level -= 1) {
    const next = uniqueStrings(ancestorFrontier.flatMap((id) => parentIdsOf(id, model))).filter((id) => id !== focusId)
    next.forEach((id) => placeAtLevel(levelById, id, level))
    ancestorFrontier = next
  }

  let descendantFrontier = [...childIds]
  for (let level = 2; level <= 3; level += 1) {
    const next = uniqueStrings(descendantFrontier.flatMap((id) => childIdsOf(id, model))).filter((id) => id !== focusId)
    next.forEach((id) => placeAtLevel(levelById, id, level))
    descendantFrontier = next
  }

  const parentSiblingIds = uniqueStrings(parentIds.flatMap((id) => siblingsOf(id, model))).filter((id) => !parentIds.includes(id))
  parentSiblingIds.forEach((id) => {
    collateralIds.add(id)
    placeAtLevel(levelById, id, -1)
  })

  const cousinIds = uniqueStrings(parentSiblingIds.flatMap((id) => childIdsOf(id, model))).filter((id) => id !== focusId)
  cousinIds.forEach((id) => {
    collateralIds.add(id)
    placeAtLevel(levelById, id, 0)
  })

  const focusParentIdSet = new Set(parentIds)
  const parentSiblingIdSet = new Set(parentSiblingIds)

  const parentSiblingPrimaryFocusParent = new Map<string, string>()
  parentSiblingIds.forEach((id) => {
    const sharedParent = firstSortedMatch(parentIdsOf(id, model).filter((parentId) => focusParentIdSet.has(parentId)), model)
    if (sharedParent) parentSiblingPrimaryFocusParent.set(id, sharedParent)
  })

  const focusParentOrder = orderedIds(parentIds, model)
  const focusParentOrderIndex = new Map(focusParentOrder.map((id, index) => [id, index]))

  const cousinBranchAnchorById = new Map<string, string>()
  cousinIds.forEach((id) => {
    const anchorParentSibling = firstSortedMatch(parentIdsOf(id, model).filter((parentId) => parentSiblingIdSet.has(parentId)), model)
    if (anchorParentSibling) cousinBranchAnchorById.set(id, anchorParentSibling)
  })

  const relativeIdsByLevel = new Map<number, string[]>()
  Array.from(levelById.entries()).forEach(([id, level]) => {
    if (!model.persons[id]) return
    const existing = relativeIdsByLevel.get(level) ?? []
    existing.push(id)
    relativeIdsByLevel.set(level, existing)
  })

  const orderedLevels = Array.from(relativeIdsByLevel.keys()).sort((a, b) => a - b)
  const levelToY = new Map<number, number>()
  orderedLevels.forEach((level, rowIndex) => {
    levelToY.set(level, PADDING_Y + rowIndex * ROW_GAP)
  })

  const visibleIdsByLevel = new Map<number, string[]>()
  const hiddenIdsByLevel = new Map<number, string[]>()
  const overflowSummaryByLevel = new Map<number, ReturnType<typeof summarizeOverflowKinds> | undefined>()

  orderedLevels.forEach((level) => {
    const levelIds = relativeIdsByLevel.get(level) ?? []

    const focusRowResult =
      level === 0
        ? orderFocusRow(levelIds, model, {
            focusId,
            siblingIds,
            spouseLikeIds,
            cousinBranchAnchorById,
            parentSiblingPrimaryFocusParent,
            focusParentOrderIndex,
          })
        : undefined

    const sortedIds = focusRowResult?.orderedIds ?? orderedIds(levelIds, model)
    const cap = LEVEL_CAPS[level] ?? 10
    const visibleIds = sortedIds.slice(0, cap)
    const hiddenIds = sortedIds.slice(cap)

    visibleIdsByLevel.set(level, visibleIds)
    hiddenIdsByLevel.set(level, hiddenIds)

    if (hiddenIds.length > 0 && level === 0 && focusRowResult) {
      overflowSummaryByLevel.set(
        level,
        summarizeOverflowKinds(hiddenIds, {
          focusId,
          siblingIds,
          spouseLikeIds,
          cousinBranchAnchorById,
          parentSiblingPrimaryFocusParent,
          focusParentOrderIndex,
        }),
      )
    }
  })

  const slotById = new Map<string, number>()
  visibleIdsByLevel.forEach((ids) => ids.forEach((id, index) => slotById.set(id, index)))

  for (let pass = 0; pass < 3; pass += 1) {
    orderedLevels.forEach((level) => {
      const ids = visibleIdsByLevel.get(level) ?? []
      if (ids.length === 0) return

      const desired = new Map<string, number>()
      ids.forEach((id) => {
        const parentAnchors = model.persons[id]
          ?.familyAsChildIds.flatMap((familyId) => {
            const family = model.families[familyId]
            if (!family) return []
            return [family.husbandId, family.wifeId]
              .filter((parentId): parentId is string => typeof parentId === 'string')
              .filter((parentId) => slotById.has(parentId))
              .map((parentId) => slotById.get(parentId) ?? 0)
          })
          .filter((v): v is number => Number.isFinite(v)) ?? []

        const parentMidpoint = midpoint(parentAnchors)
        if (parentMidpoint !== undefined) desired.set(id, parentMidpoint)
      })

      resolveDesiredSlots(ids, slotById, desired, spouseLikeIds).forEach((slot, id) => slotById.set(id, slot))
    });

    [...orderedLevels].reverse().forEach((level) => {
      const ids = visibleIdsByLevel.get(level) ?? []
      if (ids.length === 0) return

      const desired = new Map<string, number>()
      ids.forEach((id) => {
        const childAnchors = model.persons[id]
          ?.familyAsSpouseIds.flatMap((familyId) => {
            const family = model.families[familyId]
            if (!family) return []
            return family.childIds.filter((childId) => slotById.has(childId)).map((childId) => slotById.get(childId) ?? 0)
          })
          .filter((v): v is number => Number.isFinite(v)) ?? []

        const childCentroid = midpoint(childAnchors)
        if (childCentroid !== undefined) desired.set(id, childCentroid)
      })

      resolveDesiredSlots(ids, slotById, desired, spouseLikeIds).forEach((slot, id) => slotById.set(id, slot))
    })
  }

  const nodes: GraphNode[] = []

  orderedLevels.forEach((level) => {
    const visibleIds = visibleIdsByLevel.get(level) ?? []
    const hiddenIds = hiddenIdsByLevel.get(level) ?? []
    const rowSlots = hiddenIds.length > 0 ? visibleIds.length + 1 : visibleIds.length

    const visibleSlots = visibleIds.map((id, index) => ({ id, slot: slotById.get(id) ?? index }))
    const minSlot = Math.min(...visibleSlots.map((entry) => entry.slot))
    const maxSlot = Math.max(...visibleSlots.map((entry) => entry.slot))
    const rowSpan = Math.max(rowSlots - 1, maxSlot - minSlot, 0)
    const startX = PADDING_X + (rowSpan <= 0 ? 0 : -(rowSpan * COL_GAP) / 2)

    visibleSlots.forEach(({ id, slot }) => {
      const person = model.persons[id]
      if (!person) return

      let kind: GraphNode['kind']
      if (id === focusId) kind = 'focus'
      else if (level < 0) kind = 'ancestor'
      else if (level > 0) kind = 'descendant'
      else if (siblingIds.has(id)) kind = 'sibling'
      else if (spouseLikeIds.has(id)) kind = 'spouse'
      else if (collateralIds.has(id)) kind = 'relative'
      else kind = 'relative'

      const baseDetail = lifeDetail(person)
      const siblingRelationship = siblingRelationshipById.get(id)
      const siblingLabel =
        siblingRelationship === 'full'
          ? 'Full sibling'
          : siblingRelationship === 'half'
            ? 'Half sibling'
            : undefined

      nodes.push({
        id,
        label: person.displayName,
        detail: [baseDetail, siblingLabel].filter(Boolean).join(' • ') || undefined,
        x: startX + (slot - minSlot) * COL_GAP,
        y: levelToY.get(level) ?? PADDING_Y,
        kind,
        selectable: true,
      })
    })

    if (hiddenIds.length > 0) {
      const overflowSummary = overflowSummaryByLevel.get(level)
      const overflowParts = [
        overflowSummary?.hiddenCouples ? `${overflowSummary.hiddenCouples} partners` : undefined,
        overflowSummary?.hiddenSiblings ? `${overflowSummary.hiddenSiblings} siblings` : undefined,
        overflowSummary?.hiddenCousins ? `${overflowSummary.hiddenCousins} cousins` : undefined,
        overflowSummary?.hiddenOther ? `${overflowSummary.hiddenOther} other relatives` : undefined,
      ].filter(Boolean)

      nodes.push({
        id: `${OVERFLOW_PREFIX}:${level}`,
        label: `+${hiddenIds.length} more`,
        detail: overflowParts.length > 0 ? `Hidden: ${overflowParts.join(', ')}` : 'Not shown to keep this view readable',
        x: startX + rowSpan * COL_GAP + COL_GAP,
        y: levelToY.get(level) ?? PADDING_Y,
        kind: 'overflow',
        selectable: false,
      })
    }
  })

  const selectableIds = new Set(nodes.filter((node) => node.selectable !== false).map((node) => node.id))

  const familyEdges: GraphEdge[] = []
  const includePerson = (id?: string) => Boolean(id && selectableIds.has(id))

  Object.values(model.families).forEach((family) => {
    const parentIdsInGraph = [family.husbandId, family.wifeId].filter((id): id is string => includePerson(id))
    const childIdsInGraph = family.childIds.filter((id) => includePerson(id))

    if (parentIdsInGraph.length === 2) {
      const marriageDate = family.events.find((event) => event.type === 'MARR')?.date
      familyEdges.push({
        from: parentIdsInGraph[0],
        to: parentIdsInGraph[1],
        label: marriageDate ? `Married ${marriageDate}` : 'Spouse',
        kind: 'spouse',
      })
    }

    childIdsInGraph.forEach((childId) => {
      if (parentIdsInGraph.length === 0) return
      familyEdges.push({
        from: parentIdsInGraph[0],
        to: childId,
        parents: parentIdsInGraph,
        kind: 'parent-child',
      })
    })
  })

  const seen = new Set<string>()
  const edges = familyEdges.filter((edge) => {
    const parentKey = edge.parents ? edge.parents.join(',') : ''
    const key = `${edge.kind}:${edge.from}->${edge.to}:${edge.label ?? ''}:${parentKey}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const minX = Math.min(...nodes.map((node) => node.x))
  const maxX = Math.max(...nodes.map((node) => node.x))
  const minY = Math.min(...nodes.map((node) => node.y))
  const maxY = Math.max(...nodes.map((node) => node.y))

  const shiftX = PADDING_X - minX + NODE_W / 2
  const shiftY = PADDING_Y - minY + 40

  const shiftedNodes = nodes.map((node) => ({ ...node, x: node.x + shiftX, y: node.y + shiftY }))

  const width = Math.max(980, maxX - minX + NODE_W + PADDING_X * 2)
  const height = Math.max(420, maxY - minY + ROW_GAP + PADDING_Y * 1.6)

  return { nodes: shiftedNodes, edges, width, height }
}
