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
        <svg viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-label="Focused family tree graph">
          {graph.edges.map((edge, index) => {
            const from = nodeById.get(edge.from)
            const to = nodeById.get(edge.to)
            if (!from || !to) return null

            const x1 = from.x
            const y1 = from.y + 18
            const x2 = to.x
            const y2 = to.y - 18

            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <path
                  d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                  className="graph-edge"
                />
                {edge.label ? (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} className="graph-edge-label">
                    {edge.label}
                  </text>
                ) : null}
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
              <rect x={node.x - 90} y={node.y - 28} rx={10} ry={10} width={180} height={56} />
              <text x={node.x} y={node.y - 4} textAnchor="middle" className="graph-node-name">
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
