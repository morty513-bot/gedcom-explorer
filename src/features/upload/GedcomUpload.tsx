import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

interface Props {
  hasData: boolean
  onLoaded: (content: string, fileName: string) => void
}

export function GedcomUpload({ hasData, onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(!hasData)

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const content = await file.text()
    onLoaded(content, file.name)
    setExpanded(false)
    event.target.value = ''
  }

  if (hasData && !expanded) {
    return (
      <div className="upload-compact-row">
        <button type="button" onClick={() => setExpanded(true)} className="small-button">
          Upload/Replace GEDCOM
        </button>
      </div>
    )
  }

  return (
    <section className={hasData ? 'panel upload-panel compact' : 'panel upload-panel'}>
      <h2>{hasData ? 'Replace GEDCOM' : 'Import GEDCOM'}</h2>
      <p className="muted">
        {hasData
          ? 'Choose another GEDCOM file to replace the current dataset.'
          : 'Upload a .ged file to parse people and families in-browser.'}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".ged,.GED,text/plain"
        onChange={onFileChange}
      />
      <div className="upload-actions">
        <button type="button" onClick={() => inputRef.current?.click()}>
          {hasData ? 'Choose replacement file' : 'Choose GEDCOM file'}
        </button>
        {hasData ? (
          <button type="button" className="secondary" onClick={() => setExpanded(false)}>
            Cancel
          </button>
        ) : null}
      </div>
    </section>
  )
}
