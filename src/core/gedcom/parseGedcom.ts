import type { Family, GedcomEvent, GedcomModel, Person } from './types'

interface GedcomLine {
  level: number
  pointer?: string
  tag: string
  value?: string
}

function parseLine(line: string): GedcomLine | undefined {
  const trimmed = line.trim()
  if (!trimmed) return undefined

  const parts = trimmed.split(/\s+/)
  const level = Number(parts[0])
  if (Number.isNaN(level)) return undefined

  if (parts[1]?.startsWith('@') && parts[1].endsWith('@')) {
    return {
      level,
      pointer: parts[1],
      tag: parts[2] ?? '',
      value: parts.slice(3).join(' ') || undefined,
    }
  }

  return {
    level,
    tag: parts[1] ?? '',
    value: parts.slice(2).join(' ') || undefined,
  }
}

function createPerson(id: string): Person {
  return {
    id,
    displayName: id,
    alternateNames: [],
    events: [],
    familyAsChildIds: [],
    familyAsSpouseIds: [],
  }
}

function createFamily(id: string): Family {
  return {
    id,
    childIds: [],
    events: [],
  }
}

function splitGedcomName(name?: string) {
  if (!name) return {}

  const surnameMatch = name.match(/\/(.*?)\//)
  const surname = surnameMatch?.[1]?.trim()
  const givenName = name.replace(/\/.*?\//g, '').trim() || undefined
  const displayName = `${givenName ?? ''} ${surname ?? ''}`.trim() || name

  return { givenName, surname, displayName }
}

function pushEvent(target: { events: GedcomEvent[] }, type: string): GedcomEvent {
  const event: GedcomEvent = { type }
  target.events.push(event)
  return event
}

export function parseGedcom(text: string): GedcomModel {
  const persons: Record<string, Person> = {}
  const families: Record<string, Family> = {}

  let currentPerson: Person | undefined
  let currentFamily: Family | undefined
  let currentEvent: GedcomEvent | undefined

  for (const rawLine of text.split(/\r?\n/)) {
    const line = parseLine(rawLine)
    if (!line) continue

    if (line.level === 0) {
      currentEvent = undefined
      currentPerson = undefined
      currentFamily = undefined

      if (line.tag === 'INDI' && line.pointer) {
        currentPerson = persons[line.pointer] ?? createPerson(line.pointer)
        persons[line.pointer] = currentPerson
      } else if (line.tag === 'FAM' && line.pointer) {
        currentFamily = families[line.pointer] ?? createFamily(line.pointer)
        families[line.pointer] = currentFamily
      }
      continue
    }

    if (line.level === 1) {
      currentEvent = undefined

      if (currentPerson) {
        switch (line.tag) {
          case 'NAME': {
            const nameParts = splitGedcomName(line.value)
            const normalized = nameParts.displayName ?? line.value?.trim()

            if (normalized && currentPerson.displayName !== currentPerson.id) {
              if (!currentPerson.alternateNames.includes(normalized)) {
                currentPerson.alternateNames.push(normalized)
              }
            } else {
              currentPerson.displayName = normalized ?? currentPerson.displayName
              currentPerson.givenName = nameParts.givenName
              currentPerson.surname = nameParts.surname
            }
            break
          }
          case 'SEX':
            currentPerson.sex = line.value
            break
          case 'FAMC':
            if (line.value) currentPerson.familyAsChildIds.push(line.value)
            break
          case 'FAMS':
            if (line.value) currentPerson.familyAsSpouseIds.push(line.value)
            break
          case 'BIRT':
          case 'DEAT':
            currentEvent = pushEvent(currentPerson, line.tag)
            break
        }
      } else if (currentFamily) {
        switch (line.tag) {
          case 'HUSB':
            currentFamily.husbandId = line.value
            break
          case 'WIFE':
            currentFamily.wifeId = line.value
            break
          case 'CHIL':
            if (line.value) currentFamily.childIds.push(line.value)
            break
          case 'MARR':
          case 'DIV':
            currentEvent = pushEvent(currentFamily, line.tag)
            break
        }
      }
      continue
    }

    if (line.level === 2 && currentEvent) {
      if (line.tag === 'DATE') currentEvent.date = line.value
      if (line.tag === 'PLAC') currentEvent.place = line.value
    }
  }

  for (const person of Object.values(persons)) {
    person.familyAsChildIds = Array.from(new Set(person.familyAsChildIds))
    person.familyAsSpouseIds = Array.from(new Set(person.familyAsSpouseIds))
  }

  return { persons, families }
}
