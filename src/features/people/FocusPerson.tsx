import type { Person } from '../../core/gedcom/types'

interface Props {
  person?: Person
}

export function FocusPerson({ person }: Props) {
  return (
    <section className="panel">
      <h2>Focus</h2>
      {!person ? (
        <p className="muted">Select a person to inspect details.</p>
      ) : (
        <>
          <h3>{person.displayName}</h3>
          <p className="muted">{person.id}</p>
          {person.events.length > 0 ? (
            <ul className="events">
              {person.events.map((event, idx) => (
                <li key={`${event.type}-${idx}`}>
                  <strong>{event.type}</strong>
                  {event.date ? ` — ${event.date}` : ''}
                  {event.place ? ` (${event.place})` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No events found.</p>
          )}
        </>
      )}
    </section>
  )
}
