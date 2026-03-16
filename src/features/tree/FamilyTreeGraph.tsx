import { useMemo } from 'react'
import type { GedcomModel } from '../../core/gedcom/types'
import { buildFocusGraph } from '../../core/graph/focusGraph'

interface Props {
  model: GedcomModel
  focusedPersonId?: string
  onSelectPerson: (personId: string) => void
}

export function FamilyTreeGraph({ model, focusedPersonId, onSelectPerson }: Props) {
  const graph = useMemo(() => buildFocusGraph(model, focusedPersonId), [model, focusedPersonId])

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
      <div className="graph-scroll">
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

            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
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
              className={`graph-node ${node.kind}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectPerson(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectPerson(node.id)
              }}
            >
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
