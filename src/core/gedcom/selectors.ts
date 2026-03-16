import type { Family, GedcomEvent, GedcomModel, Person } from './types'
import { inferredSiblingsOf } from './relationships'

export interface PersonListItem {
  id: string
  name: string
  subtitle: string
}

export interface RelatedPerson {
  id: string
  name: string
  subtitle?: string
}

export interface SpouseSummary extends RelatedPerson {
  marriage?: string
}

export interface FocusPersonDetails {
  person: Person
  born?: string
  died?: string
  parents: RelatedPerson[]
  siblings: RelatedPerson[]
  children: RelatedPerson[]
  spouses: SpouseSummary[]
  alternateNames: string[]
}

function firstEvent(personOrFamily: { events: GedcomEvent[] }, eventType: string): GedcomEvent | undefined {
  return personOrFamily.events.find((event) => event.type === eventType)
}

function formatDatePlace(event?: GedcomEvent): string | undefined {
  if (!event?.date && !event?.place) return undefined
  if (event.date && event.place) return `${event.date} (${event.place})`
  return event.date ?? event.place
}

function lifeSubtitle(person: Person): string | undefined {
  const born = formatDatePlace(firstEvent(person, 'BIRT'))
  const died = formatDatePlace(firstEvent(person, 'DEAT'))
  if (!born && !died) return undefined
  return [born ? `Born ${born}` : undefined, died ? `Died ${died}` : undefined].filter(Boolean).join(' • ')
}

function toRelatedPerson(person: Person): RelatedPerson {
  return {
    id: person.id,
    name: person.displayName,
    subtitle: lifeSubtitle(person),
  }
}

function uniquePeople(model: GedcomModel, ids: string[]): Person[] {
  return Array.from(new Set(ids))
    .map((id) => model.persons[id])
    .filter((person): person is Person => Boolean(person))
}

function familyParents(model: GedcomModel, family: Family): Person[] {
  const ids = [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id))
  return uniquePeople(model, ids)
}

export function toPersonList(model: GedcomModel): PersonListItem[] {
  return Object.values(model.persons)
    .map((person) => {
      const born = firstEvent(person, 'BIRT')?.date
      const died = firstEvent(person, 'DEAT')?.date
      const subtitle = [person.sex, born ? `Born ${born}` : 'Born —', died ? `Died ${died}` : 'Died —']
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

export function getFocusPersonDetails(
  model: GedcomModel,
  personId?: string,
): FocusPersonDetails | undefined {
  const person = getPerson(model, personId)
  if (!person) return undefined

  const parentFamilies = person.familyAsChildIds
    .map((familyId) => model.families[familyId])
    .filter((family): family is Family => Boolean(family))

  const spouseFamilies = person.familyAsSpouseIds
    .map((familyId) => model.families[familyId])
    .filter((family): family is Family => Boolean(family))

  const parents = uniquePeople(
    model,
    parentFamilies.flatMap((family) => [family.husbandId, family.wifeId].filter(Boolean) as string[]),
  )
    .filter((parent) => parent.id !== person.id)
    .map(toRelatedPerson)

  const siblings = inferredSiblingsOf(person.id, model).flatMap((sibling) => {
    const related = model.persons[sibling.id]
    if (!related) return []

    const baseSubtitle = lifeSubtitle(related)
    const relationshipLabel =
      sibling.relationship === 'full'
        ? 'Full sibling'
        : sibling.relationship === 'half'
          ? 'Half sibling'
          : undefined

    return [
      {
        ...toRelatedPerson(related),
        subtitle: [baseSubtitle, relationshipLabel].filter(Boolean).join(' • ') || undefined,
      },
    ]
  })

  const children = uniquePeople(model, spouseFamilies.flatMap((family) => family.childIds)).map(toRelatedPerson)

  const spouses = spouseFamilies
    .flatMap((family) => familyParents(model, family))
    .filter((related) => related.id !== person.id)
    .reduce<SpouseSummary[]>((acc, spouse) => {
      if (acc.some((existing) => existing.id === spouse.id)) return acc

      const marriageFamily = spouseFamilies.find(
        (family) => family.husbandId === spouse.id || family.wifeId === spouse.id,
      )
      const marriage = formatDatePlace(firstEvent(marriageFamily ?? { events: [] }, 'MARR'))

      acc.push({
        ...toRelatedPerson(spouse),
        marriage,
      })

      return acc
    }, [])

  return {
    person,
    born: formatDatePlace(firstEvent(person, 'BIRT')),
    died: formatDatePlace(firstEvent(person, 'DEAT')),
    parents,
    siblings,
    children,
    spouses,
    alternateNames: person.alternateNames,
  }
}
