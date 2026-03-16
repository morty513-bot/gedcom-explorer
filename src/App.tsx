import { useMemo, useState } from 'react'
import { parseGedcom } from './core/gedcom/parseGedcom'
import { getPerson, toPersonList } from './core/gedcom/selectors'
import type { GedcomModel } from './core/gedcom/types'
import { FocusPerson } from './features/people/FocusPerson'
import { PersonList } from './features/people/PersonList'
import { GedcomUpload } from './features/upload/GedcomUpload'
import './App.css'

const emptyModel: GedcomModel = { persons: {}, families: {} }

function App() {
  const [fileName, setFileName] = useState<string>()
  const [model, setModel] = useState<GedcomModel>(emptyModel)
  const [selectedPersonId, setSelectedPersonId] = useState<string>()
  const [error, setError] = useState<string>()

  const personList = useMemo(() => toPersonList(model), [model])
  const focusedPerson = getPerson(model, selectedPersonId)

  const handleLoaded = (content: string, sourceName: string) => {
    try {
      const parsed = parseGedcom(content)
      setModel(parsed)
      setFileName(sourceName)
      setSelectedPersonId(Object.keys(parsed.persons)[0])
      setError(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse GEDCOM')
      setModel(emptyModel)
      setSelectedPersonId(undefined)
    }
  }

  return (
    <main className="app">
      <header>
        <h1>GEDCOM Explorer</h1>
        <p className="muted">Upload a GEDCOM file, then pick a person to focus.</p>
        {fileName ? <p className="file-pill">Loaded: {fileName}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </header>

      <GedcomUpload onLoaded={handleLoaded} />

      <section className="layout-grid">
        <PersonList
          people={personList}
          selectedPersonId={selectedPersonId}
          onSelect={setSelectedPersonId}
        />
        <FocusPerson person={focusedPerson} />
      </section>
    </main>
  )
}

export default App
