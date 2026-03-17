import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GedcomModel } from '../../core/gedcom/types'
import { buildFocusGraph } from '../../core/graph/focusGraph'

interface Props {
  model: GedcomModel
  focusedPersonId?: string
  onSelectPerson: (personId: string) => void
}

function nodeTooltip(node: { label: string; detail?: string; kind: string }): string {
  const roleLabel =
    node.kind === 'focus'
      ? 'Focused person'
      : node.kind === 'ancestor'
        ? 'Ancestor'
        : node.kind === 'descendant'
          ? 'Descendant'
          : node.kind === 'sibling'
            ? 'Sibling'
            : node.kind === 'spouse'
              ? 'Partner'
              : node.kind === 'overflow'
                ? 'Hidden relatives'
                : 'Relative'

  return [node.label, roleLabel, node.detail].filter(Boolean).join(' • ')
}

function spouseEdgeTooltip(fromLabel: string, toLabel: string, edgeLabel?: string): string {
  return [
    `Marriage/partnership: ${fromLabel} ↔ ${toLabel}`,
    edgeLabel === 'Spouse' ? undefined : edgeLabel,
  ]
    .filter(Boolean)
    .join(' • ')
}

function parentChildEdgeTooltip(parentLabels: string[], childLabel: string): string {
  if (parentLabels.length === 0) return `Parent-child: ${childLabel}`
  if (parentLabels.length === 1) return `Parent-child: ${parentLabels[0]} → ${childLabel}`
  return `Parent-child: ${parentLabels[0]} + ${parentLabels[1]} → ${childLabel}`
}

const DRAG_THRESHOLD_PX = 6

export function FamilyTreeGraph({ model, focusedPersonId, onSelectPerson }: Props) {
  const graph = useMemo(() => buildFocusGraph(model, focusedPersonId), [model, focusedPersonId])
  const scrollRef = useRef<HTMLDivElement>(null)

  const dragPointerIdRef = useRef<number | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const draggedRef = useRef(false)
  const suppressClickRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const centerOnNode = useCallback((nodeId?: string) => {
    if (!graph || !nodeId) return
    const focusNode = graph.nodes.find((node) => node.id === nodeId)
    const container = scrollRef.current
    if (!focusNode || !container) return

    const targetLeft = Math.max(0, focusNode.x - container.clientWidth / 2)
    const targetTop = Math.max(0, focusNode.y - container.clientHeight / 2)

    container.scrollTo({
      left: Math.min(targetLeft, Math.max(0, container.scrollWidth - container.clientWidth)),
      top: Math.min(targetTop, Math.max(0, container.scrollHeight - container.clientHeight)),
      behavior: 'smooth',
    })
  }, [graph])

  useEffect(() => {
    if (!graph || !focusedPersonId) return
    const id = requestAnimationFrame(() => centerOnNode(focusedPersonId))
    return () => cancelAnimationFrame(id)
  }, [centerOnNode, graph, focusedPersonId])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    if (dragPointerIdRef.current !== null) return
    if (event.button !== 0) return

    const container = scrollRef.current
    if (!container) return

    dragPointerIdRef.current = event.pointerId
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: container.scrollLeft,
      top: container.scrollTop,
    }
    draggedRef.current = false

    container.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return
    const start = dragStartRef.current
    const container = scrollRef.current
    if (!start || !container) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!draggedRef.current && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      draggedRef.current = true
      suppressClickRef.current = true
      setIsDragging(true)
    }

    if (!draggedRef.current) return

    container.scrollLeft = start.left - dx
    container.scrollTop = start.top - dy
  }

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current
    if (dragPointerIdRef.current !== event.pointerId || !container) return

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId)
    }

    dragPointerIdRef.current = null
    dragStartRef.current = null
    setIsDragging(false)

    if (draggedRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }

    draggedRef.current = false
  }

  if (!graph) {
    return (
      <section className="panel graph-panel">
        <h2>Family Tree</h2>
        <p className="muted">Select a person to render a focused family graph.</p>
      </section>
    )
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))

  return (
    <section className="panel graph-panel">
      <h2>Family Tree</h2>
      <div
        className={`graph-scroll desktop-draggable ${isDragging ? 'dragging' : ''}`}
        ref={scrollRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <svg
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          width={graph.width}
          height={graph.height}
          role="img"
          aria-label="Focused family tree graph"
        >
          {graph.edges.map((edge, index) => {
            const from = nodeById.get(edge.from)
            const to = nodeById.get(edge.to)
            if (!from || !to) return null

            if (edge.kind === 'spouse') {
              const y = (from.y + to.y) / 2
              const x1 = Math.min(from.x, to.x)
              const x2 = Math.max(from.x, to.x)
              return (
                <g key={`${edge.from}-${edge.to}-${index}`}>
                  <title>{spouseEdgeTooltip(from.label, to.label, edge.label)}</title>
                  <line x1={x1} y1={y} x2={x2} y2={y} className="graph-edge graph-edge-spouse" />
                  {edge.label ? (
                    <text x={(x1 + x2) / 2} y={y - 6} className="graph-edge-label">
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              )
            }

            const parentNodes = (edge.parents ?? []).map((id) => nodeById.get(id)).filter(Boolean)
            const x1 =
              parentNodes.length === 2
                ? ((parentNodes[0]?.x ?? from.x) + (parentNodes[1]?.x ?? from.x)) / 2
                : from.x
            const y1 =
              parentNodes.length === 2
                ? ((parentNodes[0]?.y ?? from.y) + (parentNodes[1]?.y ?? from.y)) / 2 + 20
                : from.y + 20
            const x2 = to.x
            const y2 = to.y - 20

            const parentLabels = parentNodes
              .map((node) => node?.label)
              .filter((label): label is string => Boolean(label))

            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <title>{parentChildEdgeTooltip(parentLabels, to.label)}</title>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                  className="graph-edge"
                />
              </g>
            )
          })}

          {graph.nodes.map((node) => (
            <g
              key={node.id}
              className={`graph-node ${node.kind} ${node.selectable === false ? 'readonly' : ''}`}
              role={node.selectable === false ? undefined : 'button'}
              tabIndex={node.selectable === false ? -1 : 0}
              onClick={() => {
                if (suppressClickRef.current || node.selectable === false) return
                onSelectPerson(node.id)
              }}
              onKeyDown={(event) => {
                if (node.selectable === false) return
                if (event.key === 'Enter' || event.key === ' ') onSelectPerson(node.id)
              }}
            >
              <title>{nodeTooltip(node)}</title>
              <rect x={node.x - 95} y={node.y - 30} rx={10} ry={10} width={190} height={60} />
              <text x={node.x} y={node.y - 6} textAnchor="middle" className="graph-node-name">
                {node.label}
              </text>
              {node.detail ? (
                <text x={node.x} y={node.y + 14} textAnchor="middle" className="graph-node-detail">
                  {node.detail}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
