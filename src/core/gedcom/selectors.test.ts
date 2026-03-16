import { describe, expect, it } from 'vitest'
import { getFocusPersonDetails } from './selectors'
import type { Family, GedcomModel, Person } from './types'

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

describe('getFocusPersonDetails sibling inference', () => {
  it('infers full and half siblings from parent family relationships', () => {
    const model: GedcomModel = {
      persons: {
        PARENT_1: person('PARENT_1', 'Parent One', { familyAsSpouseIds: ['F_PARENT_A', 'F_PARENT_B'] }),
        PARENT_2: person('PARENT_2', 'Parent Two', { familyAsSpouseIds: ['F_PARENT_A'] }),
        PARENT_3: person('PARENT_3', 'Parent Three', { familyAsSpouseIds: ['F_PARENT_B'] }),
        FOCUS: person('FOCUS', 'Focus Person', { familyAsChildIds: ['F_PARENT_A'] }),
        FULL_SIB: person('FULL_SIB', 'Full Sib', { familyAsChildIds: ['F_PARENT_A'] }),
        HALF_SIB: person('HALF_SIB', 'Half Sib', { familyAsChildIds: ['F_PARENT_B'] }),
      },
      families: {
        F_PARENT_A: family('F_PARENT_A', { husbandId: 'PARENT_1', wifeId: 'PARENT_2', childIds: ['FOCUS', 'FULL_SIB'] }),
        F_PARENT_B: family('F_PARENT_B', { husbandId: 'PARENT_1', wifeId: 'PARENT_3', childIds: ['HALF_SIB'] }),
      },
    }

    const details = getFocusPersonDetails(model, 'FOCUS')
    expect(details).toBeDefined()

    const siblingById = new Map((details?.siblings ?? []).map((sibling) => [sibling.id, sibling]))
    expect(siblingById.has('FULL_SIB')).toBe(true)
    expect(siblingById.has('HALF_SIB')).toBe(true)
    expect(siblingById.get('FULL_SIB')?.subtitle).toContain('Full sibling')
    expect(siblingById.get('HALF_SIB')?.subtitle).toContain('Half sibling')
  })
})
