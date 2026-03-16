import { describe, expect, it } from 'vitest'
import { buildFocusGraph } from './focusGraph'
import type { Family, GedcomModel, Person } from '../gedcom/types'

function person(id: string, displayName: string, overrides: Partial<Person> = {}): Person {
  return {
    id,
    displayName,
    alternateNames: [],
    events: [],
    familyAsChildIds: [],
    familyAsSpouseIds: [],
    ...overrides,
  }
}

function family(id: string, overrides: Partial<Family> = {}): Family {
  return {
    id,
    childIds: [],
    events: [],
    ...overrides,
  }
}

describe('buildFocusGraph sibling rows', () => {
  it('includes inferred half siblings for the focus person', () => {
    const model: GedcomModel = {
      persons: {
        P1: person('P1', 'Parent One', { familyAsSpouseIds: ['F_A', 'F_B'] }),
        P2: person('P2', 'Parent Two', { familyAsSpouseIds: ['F_A'] }),
        P3: person('P3', 'Parent Three', { familyAsSpouseIds: ['F_B'] }),
        FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_A'] }),
        FULL: person('FULL', 'Full', { familyAsChildIds: ['F_A'] }),
        HALF: person('HALF', 'Half', { familyAsChildIds: ['F_B'] }),
      },
      families: {
        F_A: family('F_A', { husbandId: 'P1', wifeId: 'P2', childIds: ['FOCUS', 'FULL'] }),
        F_B: family('F_B', { husbandId: 'P1', wifeId: 'P3', childIds: ['HALF'] }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const ids = new Set((graph?.nodes ?? []).map((node) => node.id))
    expect(ids.has('FULL')).toBe(true)
    expect(ids.has('HALF')).toBe(true)

    const halfNode = graph?.nodes.find((node) => node.id === 'HALF')
    expect(halfNode?.kind).toBe('sibling')
    expect(halfNode?.detail).toContain('Half sibling')
  })

  it('caps level 0 with a clear overflow node when too many inferred siblings exist', () => {
    const persons: Record<string, Person> = {
      P1: person('P1', 'Parent One', { familyAsSpouseIds: ['F_MAIN', 'F_HALF'] }),
      P2: person('P2', 'Parent Two', { familyAsSpouseIds: ['F_MAIN'] }),
      P3: person('P3', 'Parent Three', { familyAsSpouseIds: ['F_HALF'] }),
      FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_MAIN'] }),
    }

    const fullSiblingIds = Array.from({ length: 10 }, (_, i) => `FS_${i + 1}`)
    const halfSiblingIds = Array.from({ length: 10 }, (_, i) => `HS_${i + 1}`)

    fullSiblingIds.forEach((id) => {
      persons[id] = person(id, `Full ${id}`, { familyAsChildIds: ['F_MAIN'] })
    })
    halfSiblingIds.forEach((id) => {
      persons[id] = person(id, `Half ${id}`, { familyAsChildIds: ['F_HALF'] })
    })

    const model: GedcomModel = {
      persons,
      families: {
        F_MAIN: family('F_MAIN', { husbandId: 'P1', wifeId: 'P2', childIds: ['FOCUS', ...fullSiblingIds] }),
        F_HALF: family('F_HALF', { husbandId: 'P1', wifeId: 'P3', childIds: halfSiblingIds }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const overflowNode = graph?.nodes.find((node) => node.kind === 'overflow' && node.id === '__overflow__:0')
    expect(overflowNode).toBeDefined()
    expect(overflowNode?.label).toContain('+')
  })
})
