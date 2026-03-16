import { useRef } from 'react'
import type { ChangeEvent } from 'react'

interface Props {
  onLoaded: (content: string, fileName: string) => void
}

export function GedcomUpload({ onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    onLoaded(content, file.name)
  }

  return (
    <section className="panel">
      <h2>Import GEDCOM</h2>
      <p className="muted">Upload a .ged file to parse people/families in-browser.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".ged,.GED,text/plain"
        onChange={onFileChange}
      />
      <button type="button" onClick={() => inputRef.current?.click()}>
        Choose file
      </button>
    </section>
  )
}
