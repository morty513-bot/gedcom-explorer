import type { GedcomModel } from '../gedcom/types'
import { getFocusPersonDetails } from '../gedcom/selectors'

export interface GraphNode {
  id: string
  label: string
  detail?: string
  x: number
  y: number
  kind: 'focus' | 'parent' | 'sibling' | 'spouse' | 'child'
}

export interface GraphEdge {
  from: string
  to: string
  label?: string
}

export interface FocusGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
}

const NODE_W = 200
const ROW_GAP = 120
const COL_GAP = 220

function rowY(row: number): number {
  return 80 + row * ROW_GAP
}

function spreadX(index: number, total: number): number {
  const center = 500
  if (total <= 1) return center
  const start = center - ((total - 1) * COL_GAP) / 2
  return start + index * COL_GAP
}

export function buildFocusGraph(model: GedcomModel, personId?: string): FocusGraph | undefined {
  const details = getFocusPersonDetails(model, personId)
  if (!details) return undefined

  const focusNode: GraphNode = {
    id: details.person.id,
    label: details.person.displayName,
    detail: [details.born ? `Born ${details.born}` : undefined, details.died ? `Died ${details.died}` : undefined]
      .filter(Boolean)
      .join(' • '),
    x: 500,
    y: rowY(2),
    kind: 'focus',
  }

  const parentNodes = details.parents.map((parent, index) => ({
    id: parent.id,
    label: parent.name,
    detail: parent.subtitle,
    x: spreadX(index, details.parents.length),
    y: rowY(0),
    kind: 'parent' as const,
  }))

  const siblingNodes = details.siblings.map((sibling, index) => ({
    id: sibling.id,
    label: sibling.name,
    detail: sibling.subtitle,
    x: spreadX(index, details.siblings.length),
    y: rowY(1),
    kind: 'sibling' as const,
  }))

  const spouseNodes = details.spouses.map((spouse, index) => ({
    id: spouse.id,
    label: spouse.name,
    detail: spouse.marriage ? `Married ${spouse.marriage}` : spouse.subtitle,
    x: spreadX(index, details.spouses.length),
    y: rowY(3),
    kind: 'spouse' as const,
  }))

  const childNodes = details.children.map((child, index) => ({
    id: child.id,
    label: child.name,
    detail: child.subtitle,
    x: spreadX(index, details.children.length),
    y: rowY(4),
    kind: 'child' as const,
  }))

  const nodes = [focusNode, ...parentNodes, ...siblingNodes, ...spouseNodes, ...childNodes]

  const edges: GraphEdge[] = [
    ...parentNodes.map((node) => ({ from: node.id, to: details.person.id })),
    ...siblingNodes.map((node) => ({ from: node.id, to: details.person.id, label: 'Sibling' })),
    ...spouseNodes.map((node) => ({ from: details.person.id, to: node.id, label: node.detail?.startsWith('Married') ? node.detail : 'Spouse' })),
    ...childNodes.map((node) => ({ from: details.person.id, to: node.id, label: 'Child' })),
  ]

  const maxX = Math.max(...nodes.map((node) => node.x))
  const minX = Math.min(...nodes.map((node) => node.x))
  const width = Math.max(980, maxX - minX + NODE_W + 160)
  const height = rowY(5)

  return { nodes, edges, width, height }
}
