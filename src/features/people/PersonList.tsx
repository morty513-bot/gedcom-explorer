import type { PersonListItem } from '../../core/gedcom/selectors'

interface Props {
  people: PersonListItem[]
  selectedPersonId?: string
  onSelect: (personId: string) => void
}

export function PersonList({ people, selectedPersonId, onSelect }: Props) {
  if (people.length === 0) {
    return (
      <section className="panel">
        <h2>People</h2>
        <p className="muted">No people loaded yet.</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>People ({people.length})</h2>
      <ul className="person-list">
        {people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              className={person.id === selectedPersonId ? 'person active' : 'person'}
              onClick={() => onSelect(person.id)}
            >
              <span className="name">{person.name}</span>
              {person.subtitle ? <span className="subtitle">{person.subtitle}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
