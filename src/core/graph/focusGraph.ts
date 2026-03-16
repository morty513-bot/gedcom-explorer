import type { Family, GedcomModel, Person } from '../gedcom/types'
import { getFocusPersonDetails } from '../gedcom/selectors'

export interface GraphNode {
  id: string
  label: string
  detail?: string
  x: number
  y: number
  kind: 'focus' | 'ancestor' | 'sibling' | 'spouse' | 'descendant'
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

export function buildFocusGraph(model: GedcomModel, personId?: string): FocusGraph | undefined {
  const details = getFocusPersonDetails(model, personId)
  if (!details) return undefined

  const focusId = details.person.id

  const parentFamilies = details.person.familyAsChildIds
    .map((familyId) => model.families[familyId])
    .filter((family): family is Family => Boolean(family))

  const spouseFamilies = details.person.familyAsSpouseIds
    .map((familyId) => model.families[familyId])
    .filter((family): family is Family => Boolean(family))

  const parentIds = uniqueStrings(
    parentFamilies.flatMap((family) => [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id))),
  )

  const siblingIds = uniqueStrings(parentFamilies.flatMap((family) => family.childIds)).filter((id) => id !== focusId)

  const grandparentIds = uniqueStrings(
    parentIds.flatMap((parentId) => {
      const parent = model.persons[parentId]
      if (!parent) return []
      return parent.familyAsChildIds.flatMap((familyId) => {
        const family = model.families[familyId]
        if (!family) return []
        return [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id))
      })
    }),
  ).filter((id) => !parentIds.includes(id))

  const childIds = uniqueStrings(spouseFamilies.flatMap((family) => family.childIds))

  const spouseIds = uniqueStrings(spouseFamilies.flatMap((family) => spouseIdsInFamily(family, focusId)))

  const childCoparentIds = uniqueStrings(
    childIds.flatMap((childId) => {
      const child = model.persons[childId]
      if (!child) return []
      return child.familyAsChildIds.flatMap((familyId) => {
        const family = model.families[familyId]
        if (!family) return []
        return spouseIdsInFamily(family, childId)
      })
    }),
  ).filter((id) => id !== focusId)

  const grandchildIds = uniqueStrings(
    childIds.flatMap((childId) => {
      const child = model.persons[childId]
      if (!child) return []
      return child.familyAsSpouseIds.flatMap((familyId) => {
        const family = model.families[familyId]
        if (!family) return []
        return family.childIds
      })
    }),
  )

  const generationRows = [
    { level: -2, ids: orderedIds(grandparentIds, model), kind: 'ancestor' as const },
    { level: -1, ids: orderedIds(parentIds, model), kind: 'ancestor' as const },
    {
      level: 0,
      ids: orderedIds(uniqueStrings([focusId, ...siblingIds, ...spouseIds, ...childCoparentIds]), model),
      kind: undefined,
    },
    { level: 1, ids: orderedIds(childIds, model), kind: 'descendant' as const },
    { level: 2, ids: orderedIds(grandchildIds, model), kind: 'descendant' as const },
  ]

  const dedupedRows = generationRows
    .map((row) => ({ ...row, ids: uniqueStrings(row.ids) }))
    .filter((row) => row.ids.length > 0)

  if (!dedupedRows.some((row) => row.ids.includes(focusId))) return undefined

  const levelToY = new Map<number, number>()
  dedupedRows.forEach((row, rowIndex) => {
    levelToY.set(row.level, PADDING_Y + rowIndex * ROW_GAP)
  })

  const nodes: GraphNode[] = []

  dedupedRows.forEach((row) => {
    const startX = PADDING_X + (row.ids.length === 1 ? 0 : -((row.ids.length - 1) * COL_GAP) / 2)
    row.ids.forEach((id, index) => {
      const person = model.persons[id]
      if (!person) return

      let kind: GraphNode['kind']
      if (id === focusId) kind = 'focus'
      else if (row.level < 0) kind = 'ancestor'
      else if (row.level > 0) kind = 'descendant'
      else if (siblingIds.includes(id)) kind = 'sibling'
      else kind = 'spouse'

      nodes.push({
        id,
        label: person.displayName,
        detail: lifeDetail(person),
        x: startX + index * COL_GAP,
        y: levelToY.get(row.level) ?? PADDING_Y,
        kind,
      })
    })
  })

  const byId = new Map(nodes.map((node) => [node.id, node]))

  const familyEdges: GraphEdge[] = []
  const includePerson = (id?: string) => Boolean(id && byId.has(id))

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
      const anchorParentId = parentIdsInGraph[0]
      familyEdges.push({
        from: anchorParentId,
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
