import { getFocusPersonDetails } from '../../core/gedcom/selectors'
import type { GedcomModel } from '../../core/gedcom/types'

interface Props {
  model: GedcomModel
  personId?: string
  onSelectPerson: (personId: string) => void
}

function RelatedList({
  title,
  people,
  onSelectPerson,
}: {
  title: string
  people: { id: string; name: string; subtitle?: string }[]
  onSelectPerson: (personId: string) => void
}) {
  return (
    <div>
      <h4>{title}</h4>
      {people.length === 0 ? (
        <p className="muted">None listed.</p>
      ) : (
        <ul className="detail-list">
          {people.map((person) => (
            <li key={person.id}>
              <button className="linkish" type="button" onClick={() => onSelectPerson(person.id)}>
                {person.name}
              </button>
              {person.subtitle ? <span className="muted"> — {person.subtitle}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function FocusPerson({ model, personId, onSelectPerson }: Props) {
  const details = getFocusPersonDetails(model, personId)

  return (
    <section className="panel">
      <h2>Person Details</h2>
      {!details ? (
        <p className="muted">Select a person to inspect details.</p>
      ) : (
        <div className="focus-details">
          <h3>{details.person.displayName}</h3>
          <p className="muted">Record ID: {details.person.id}</p>

          <dl className="facts-grid">
            <dt>Sex</dt>
            <dd>{details.person.sex ?? 'Unknown'}</dd>
            <dt>Born</dt>
            <dd>{details.born ?? 'Unknown'}</dd>
            <dt>Died</dt>
            <dd>{details.died ?? 'Unknown'}</dd>
          </dl>

          <div>
            <h4>Alternate Names</h4>
            {details.alternateNames.length > 0 ? (
              <ul className="detail-list">
                {details.alternateNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No alternate names recorded.</p>
            )}
          </div>

          <div>
            <h4>Spouses</h4>
            {details.spouses.length === 0 ? (
              <p className="muted">None listed.</p>
            ) : (
              <ul className="detail-list">
                {details.spouses.map((spouse) => (
                  <li key={spouse.id}>
                    <button className="linkish" type="button" onClick={() => onSelectPerson(spouse.id)}>
                      {spouse.name}
                    </button>
                    {spouse.marriage ? <span className="muted"> — Married {spouse.marriage}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <RelatedList title="Parents" people={details.parents} onSelectPerson={onSelectPerson} />
          <RelatedList title="Children" people={details.children} onSelectPerson={onSelectPerson} />
          <RelatedList title="Siblings" people={details.siblings} onSelectPerson={onSelectPerson} />
        </div>
      )}
    </section>
  )
}
