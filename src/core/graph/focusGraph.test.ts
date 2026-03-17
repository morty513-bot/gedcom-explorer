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

describe('buildFocusGraph focus-row layout policy', () => {
  it('keeps siblings clustered ahead of cousin clusters on the focus generation row', () => {
    const model: GedcomModel = {
      persons: {
        GP_A: person('GP_A', 'Grandparent A', { familyAsSpouseIds: ['F_GP_A'] }),
        GP_B: person('GP_B', 'Grandparent B', { familyAsSpouseIds: ['F_GP_A'] }),
        GP_C: person('GP_C', 'Grandparent C', { familyAsSpouseIds: ['F_GP_C'] }),
        GP_D: person('GP_D', 'Grandparent D', { familyAsSpouseIds: ['F_GP_C'] }),

        PARENT_1: person('PARENT_1', 'Parent One', { familyAsChildIds: ['F_GP_A'], familyAsSpouseIds: ['F_MAIN'] }),
        PARENT_2: person('PARENT_2', 'Parent Two', { familyAsChildIds: ['F_GP_C'], familyAsSpouseIds: ['F_MAIN'] }),

        AUNT_A: person('AUNT_A', 'Aunt A', { familyAsChildIds: ['F_GP_A'], familyAsSpouseIds: ['F_AUNT_A'] }),
        AUNT_B: person('AUNT_B', 'Aunt B', { familyAsChildIds: ['F_GP_A'], familyAsSpouseIds: ['F_AUNT_B'] }),

        FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_MAIN'] }),
        SIB_1: person('SIB_1', 'Sibling One', { familyAsChildIds: ['F_MAIN'] }),
        SIB_2: person('SIB_2', 'Sibling Two', { familyAsChildIds: ['F_MAIN'] }),

        COUSIN_A1: person('COUSIN_A1', 'Cousin A1', { familyAsChildIds: ['F_AUNT_A'] }),
        COUSIN_A2: person('COUSIN_A2', 'Cousin A2', { familyAsChildIds: ['F_AUNT_A'] }),
        COUSIN_B1: person('COUSIN_B1', 'Cousin B1', { familyAsChildIds: ['F_AUNT_B'] }),
      },
      families: {
        F_GP_A: family('F_GP_A', { husbandId: 'GP_A', wifeId: 'GP_B', childIds: ['PARENT_1', 'AUNT_A', 'AUNT_B'] }),
        F_GP_C: family('F_GP_C', { husbandId: 'GP_C', wifeId: 'GP_D', childIds: ['PARENT_2'] }),
        F_MAIN: family('F_MAIN', { husbandId: 'PARENT_1', wifeId: 'PARENT_2', childIds: ['FOCUS', 'SIB_1', 'SIB_2'] }),
        F_AUNT_A: family('F_AUNT_A', { husbandId: 'AUNT_A', childIds: ['COUSIN_A1', 'COUSIN_A2'] }),
        F_AUNT_B: family('F_AUNT_B', { wifeId: 'AUNT_B', childIds: ['COUSIN_B1'] }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const yById = new Map((graph?.nodes ?? []).map((node) => [node.id, node.y]))
    const focusY = yById.get('FOCUS')
    expect(focusY).toBeDefined()

    const levelZeroNodes = (graph?.nodes ?? [])
      .filter((node) => node.y === focusY && node.selectable !== false)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)

    const lastSiblingIndex = Math.max(levelZeroNodes.indexOf('SIB_1'), levelZeroNodes.indexOf('SIB_2'))
    const firstCousinIndex = Math.min(
      levelZeroNodes.indexOf('COUSIN_A1'),
      levelZeroNodes.indexOf('COUSIN_A2'),
      levelZeroNodes.indexOf('COUSIN_B1'),
    )

    expect(lastSiblingIndex).toBeGreaterThanOrEqual(0)
    expect(firstCousinIndex).toBeGreaterThan(lastSiblingIndex)

    const cousinA2Index = levelZeroNodes.indexOf('COUSIN_A2')
    const cousinB1Index = levelZeroNodes.indexOf('COUSIN_B1')
    expect(cousinA2Index).toBeLessThan(cousinB1Index)
  })

  it('keeps focus partners adjacent as a locked couple block and ahead of siblings/cousins', () => {
    const model: GedcomModel = {
      persons: {
        GP1: person('GP1', 'Grand One', { familyAsSpouseIds: ['F_GP'] }),
        GP2: person('GP2', 'Grand Two', { familyAsSpouseIds: ['F_GP'] }),
        P1: person('P1', 'Parent One', { familyAsChildIds: ['F_GP'], familyAsSpouseIds: ['F_MAIN'] }),
        P2: person('P2', 'Parent Two', { familyAsSpouseIds: ['F_MAIN'] }),
        AUNT: person('AUNT', 'Aunt', { familyAsChildIds: ['F_GP'], familyAsSpouseIds: ['F_AUNT'] }),
        FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_MAIN'], familyAsSpouseIds: ['F_FOCUS'] }),
        SPOUSE: person('SPOUSE', 'Focus Spouse', { familyAsSpouseIds: ['F_FOCUS'] }),
        SIB: person('SIB', 'Sibling', { familyAsChildIds: ['F_MAIN'] }),
        COUSIN: person('COUSIN', 'Cousin', { familyAsChildIds: ['F_AUNT'] }),
      },
      families: {
        F_GP: family('F_GP', { husbandId: 'GP1', wifeId: 'GP2', childIds: ['P1', 'AUNT'] }),
        F_MAIN: family('F_MAIN', { husbandId: 'P1', wifeId: 'P2', childIds: ['FOCUS', 'SIB'] }),
        F_FOCUS: family('F_FOCUS', { husbandId: 'FOCUS', wifeId: 'SPOUSE' }),
        F_AUNT: family('F_AUNT', { wifeId: 'AUNT', childIds: ['COUSIN'] }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const focusY = graph?.nodes.find((node) => node.id === 'FOCUS')?.y
    expect(focusY).toBeDefined()

    const levelZero = (graph?.nodes ?? [])
      .filter((node) => node.y === focusY && node.selectable !== false)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)

    const focusIndex = levelZero.indexOf('FOCUS')
    const spouseIndex = levelZero.indexOf('SPOUSE')
    const siblingIndex = levelZero.indexOf('SIB')
    const cousinIndex = levelZero.indexOf('COUSIN')

    expect(Math.abs(focusIndex - spouseIndex)).toBe(1)
    const coupleStart = Math.min(focusIndex, spouseIndex)
    const siblingStart = siblingIndex
    expect(coupleStart).toBeLessThan(siblingStart)
    expect(siblingIndex).toBeLessThan(cousinIndex)
  })

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

  it('is deterministic for repeated focus-row layouts', () => {
    const model: GedcomModel = {
      persons: {
        P1: person('P1', 'Parent One', { familyAsSpouseIds: ['F_MAIN'] }),
        P2: person('P2', 'Parent Two', { familyAsSpouseIds: ['F_MAIN'] }),
        FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_MAIN'], familyAsSpouseIds: ['F_FOCUS'] }),
        SPOUSE: person('SPOUSE', 'Spouse', { familyAsSpouseIds: ['F_FOCUS'] }),
        SIB_A: person('SIB_A', 'Sibling A', { familyAsChildIds: ['F_MAIN'] }),
        SIB_B: person('SIB_B', 'Sibling B', { familyAsChildIds: ['F_MAIN'] }),
      },
      families: {
        F_MAIN: family('F_MAIN', { husbandId: 'P1', wifeId: 'P2', childIds: ['FOCUS', 'SIB_A', 'SIB_B'] }),
        F_FOCUS: family('F_FOCUS', { husbandId: 'FOCUS', wifeId: 'SPOUSE' }),
      },
    }

    const graphA = buildFocusGraph(model, 'FOCUS')
    const graphB = buildFocusGraph(model, 'FOCUS')

    const focusY = graphA?.nodes.find((node) => node.id === 'FOCUS')?.y
    expect(focusY).toBeDefined()

    const rowA = (graphA?.nodes ?? [])
      .filter((node) => node.y === focusY && node.selectable !== false)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)
    const rowB = (graphB?.nodes ?? [])
      .filter((node) => node.y === focusY && node.selectable !== false)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)

    expect(rowA).toEqual(rowB)
  })

  it('centers children under the midpoint of the parent couple block', () => {
    const model: GedcomModel = {
      persons: {
        FOCUS: person('FOCUS', 'Focus', { familyAsSpouseIds: ['F_MAIN'] }),
        SPOUSE: person('SPOUSE', 'Spouse', { familyAsSpouseIds: ['F_MAIN'] }),
        CHILD_1: person('CHILD_1', 'Child One', { familyAsChildIds: ['F_MAIN'] }),
        CHILD_2: person('CHILD_2', 'Child Two', { familyAsChildIds: ['F_MAIN'] }),
        CHILD_3: person('CHILD_3', 'Child Three', { familyAsChildIds: ['F_MAIN'] }),
      },
      families: {
        F_MAIN: family('F_MAIN', { husbandId: 'FOCUS', wifeId: 'SPOUSE', childIds: ['CHILD_1', 'CHILD_2', 'CHILD_3'] }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const byId = new Map((graph?.nodes ?? []).map((node) => [node.id, node]))
    const focus = byId.get('FOCUS')
    const spouse = byId.get('SPOUSE')
    const children = ['CHILD_1', 'CHILD_2', 'CHILD_3']
      .map((id) => byId.get(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node))

    expect(focus).toBeDefined()
    expect(spouse).toBeDefined()
    expect(children.length).toBe(3)

    const parentMidpoint = ((focus?.x ?? 0) + (spouse?.x ?? 0)) / 2
    const childCentroid = children.reduce((sum, child) => sum + child.x, 0) / children.length

    expect(Math.abs(parentMidpoint - childCentroid)).toBeLessThanOrEqual(30)
  })

  it('keeps sibling block coherent and not interleaved with cousin branch nodes', () => {
    const model: GedcomModel = {
      persons: {
        GP_A: person('GP_A', 'Grandparent A', { familyAsSpouseIds: ['F_GP_A'] }),
        GP_B: person('GP_B', 'Grandparent B', { familyAsSpouseIds: ['F_GP_A'] }),
        PARENT_1: person('PARENT_1', 'Parent One', { familyAsChildIds: ['F_GP_A'], familyAsSpouseIds: ['F_MAIN'] }),
        PARENT_2: person('PARENT_2', 'Parent Two', { familyAsSpouseIds: ['F_MAIN'] }),
        AUNT_A: person('AUNT_A', 'Aunt A', { familyAsChildIds: ['F_GP_A'], familyAsSpouseIds: ['F_AUNT_A'] }),
        AUNT_B: person('AUNT_B', 'Aunt B', { familyAsChildIds: ['F_GP_A'], familyAsSpouseIds: ['F_AUNT_B'] }),
        FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_MAIN'] }),
        SIB_1: person('SIB_1', 'Sibling One', { familyAsChildIds: ['F_MAIN'] }),
        SIB_2: person('SIB_2', 'Sibling Two', { familyAsChildIds: ['F_MAIN'] }),
        COUSIN_A1: person('COUSIN_A1', 'Cousin A1', { familyAsChildIds: ['F_AUNT_A'] }),
        COUSIN_A2: person('COUSIN_A2', 'Cousin A2', { familyAsChildIds: ['F_AUNT_A'] }),
        COUSIN_B1: person('COUSIN_B1', 'Cousin B1', { familyAsChildIds: ['F_AUNT_B'] }),
      },
      families: {
        F_GP_A: family('F_GP_A', { husbandId: 'GP_A', wifeId: 'GP_B', childIds: ['PARENT_1', 'AUNT_A', 'AUNT_B'] }),
        F_MAIN: family('F_MAIN', { husbandId: 'PARENT_1', wifeId: 'PARENT_2', childIds: ['FOCUS', 'SIB_1', 'SIB_2'] }),
        F_AUNT_A: family('F_AUNT_A', { wifeId: 'AUNT_A', childIds: ['COUSIN_A1', 'COUSIN_A2'] }),
        F_AUNT_B: family('F_AUNT_B', { wifeId: 'AUNT_B', childIds: ['COUSIN_B1'] }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const focusY = graph?.nodes.find((node) => node.id === 'FOCUS')?.y
    const row = (graph?.nodes ?? [])
      .filter((node) => node.y === focusY && node.selectable !== false)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)

    const siblingIndexes = ['FOCUS', 'SIB_1', 'SIB_2'].map((id) => row.indexOf(id)).sort((a, b) => a - b)
    const cousinIndexes = ['COUSIN_A1', 'COUSIN_A2', 'COUSIN_B1'].map((id) => row.indexOf(id)).sort((a, b) => a - b)

    expect(siblingIndexes.every((index) => index >= 0)).toBe(true)
    expect(cousinIndexes.every((index) => index >= 0)).toBe(true)
    expect(siblingIndexes[2] - siblingIndexes[0]).toBe(2)
    expect(cousinIndexes[0]).toBeGreaterThan(siblingIndexes[2])
  })

  it('keeps the parent couple adjacent and ahead of parent siblings on level -1', () => {
    const model: GedcomModel = {
      persons: {
        GP_H1: person('GP_H1', 'Grandpa H', { familyAsSpouseIds: ['F_GRAND_H'] }),
        GP_H2: person('GP_H2', 'Grandma H', { familyAsSpouseIds: ['F_GRAND_H'] }),
        GP_W1: person('GP_W1', 'Grandpa W', { familyAsSpouseIds: ['F_GRAND_W'] }),
        GP_W2: person('GP_W2', 'Grandma W', { familyAsSpouseIds: ['F_GRAND_W'] }),

        FATHER: person('FATHER', 'Father', { familyAsChildIds: ['F_GRAND_H'], familyAsSpouseIds: ['F_MAIN'] }),
        MOTHER: person('MOTHER', 'Mother', { familyAsChildIds: ['F_GRAND_W'], familyAsSpouseIds: ['F_MAIN'] }),
        UNCLE_H: person('UNCLE_H', 'Uncle H', { familyAsChildIds: ['F_GRAND_H'] }),
        AUNT_W: person('AUNT_W', 'Aunt W', { familyAsChildIds: ['F_GRAND_W'] }),

        FOCUS: person('FOCUS', 'Focus', { familyAsChildIds: ['F_MAIN'] }),
      },
      families: {
        F_GRAND_H: family('F_GRAND_H', { husbandId: 'GP_H1', wifeId: 'GP_H2', childIds: ['FATHER', 'UNCLE_H'] }),
        F_GRAND_W: family('F_GRAND_W', { husbandId: 'GP_W1', wifeId: 'GP_W2', childIds: ['MOTHER', 'AUNT_W'] }),
        F_MAIN: family('F_MAIN', { husbandId: 'FATHER', wifeId: 'MOTHER', childIds: ['FOCUS'] }),
      },
    }

    const graph = buildFocusGraph(model, 'FOCUS')
    expect(graph).toBeDefined()

    const parentY = graph?.nodes.find((node) => node.id === 'FATHER')?.y
    const row = (graph?.nodes ?? [])
      .filter((node) => node.y === parentY && node.selectable !== false)
      .sort((a, b) => a.x - b.x)
      .map((node) => node.id)

    const fatherIndex = row.indexOf('FATHER')
    const motherIndex = row.indexOf('MOTHER')
    const uncleIndex = row.indexOf('UNCLE_H')
    const auntIndex = row.indexOf('AUNT_W')

    expect(Math.abs(fatherIndex - motherIndex)).toBe(1)
    expect(Math.max(fatherIndex, motherIndex)).toBeLessThan(Math.min(uncleIndex, auntIndex))
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
