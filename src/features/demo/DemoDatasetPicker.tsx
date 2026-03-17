import { useMemo, useState } from 'react'
import { demoDatasets, getDemoDatasetById } from './demoDatasets'

interface Props {
  onLoadDemo: (content: string, fileName: string) => void
}

export function DemoDatasetPicker({ onLoadDemo }: Props) {
  const [selectedId, setSelectedId] = useState(demoDatasets[0]?.id ?? '')

  const selectedDemo = useMemo(() => getDemoDatasetById(selectedId), [selectedId])

  if (demoDatasets.length === 0) return null

  return (
    <section className="panel demo-panel compact">
      <h2>Try a demo dataset</h2>
      <div className="demo-controls">
        <select
          aria-label="Select demo dataset"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {demoDatasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="small-button"
          onClick={() => selectedDemo && onLoadDemo(selectedDemo.content, selectedDemo.fileName)}
          disabled={!selectedDemo}
        >
          Load demo
        </button>
      </div>
      {selectedDemo ? <p className="muted">{selectedDemo.description}</p> : null}
    </section>
  )
}
