import type { GedcomModel, Person } from './types'

export interface PersonListItem {
  id: string
  name: string
  subtitle: string
}

function firstEventDate(person: Person, eventType: string): string | undefined {
  return person.events.find((event) => event.type === eventType)?.date
}

export function toPersonList(model: GedcomModel): PersonListItem[] {
  return Object.values(model.persons)
    .map((person) => {
      const born = firstEventDate(person, 'BIRT')
      const died = firstEventDate(person, 'DEAT')
      const subtitle = [person.sex, born ? `b. ${born}` : undefined, died ? `d. ${died}` : undefined]
        .filter(Boolean)
        .join(' • ')

      return {
        id: person.id,
        name: person.displayName,
        subtitle,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getPerson(model: GedcomModel, personId?: string): Person | undefined {
  return personId ? model.persons[personId] : undefined
}
