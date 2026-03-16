export type GedcomEventType = 'BIRT' | 'DEAT' | 'MARR' | 'DIV' | string

export interface GedcomEvent {
  type: GedcomEventType
  date?: string
  place?: string
}

export interface Person {
  id: string
  displayName: string
  givenName?: string
  surname?: string
  sex?: string
  events: GedcomEvent[]
  familyAsChildIds: string[]
  familyAsSpouseIds: string[]
}

export interface Family {
  id: string
  husbandId?: string
  wifeId?: string
  childIds: string[]
  events: GedcomEvent[]
}

export interface GedcomModel {
  persons: Record<string, Person>
  families: Record<string, Family>
}
