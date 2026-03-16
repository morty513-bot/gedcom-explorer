import type { Family, GedcomModel } from './types'

export type SiblingRelationshipType = 'full' | 'half' | 'unknown'

export interface InferredSibling {
  id: string
  sharedParentIds: string[]
  relationship: SiblingRelationshipType
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

function parentsInFamily(family: Family): string[] {
  return [family.husbandId, family.wifeId].filter((id): id is string => Boolean(id))
}

export function parentIdsOf(personId: string, model: GedcomModel): string[] {
  const person = model.persons[personId]
  if (!person) return []

  return uniqueStrings(
    person.familyAsChildIds.flatMap((familyId) => {
      const family = model.families[familyId]
      return family ? parentsInFamily(family) : []
    }),
  )
}

/**
 * GEDCOM-consistent sibling inference:
 * - Start from the person's FAMC families (same parent-family context => sibling candidates).
 * - Expand through each known parent's FAMS families to include children from other unions.
 *   This captures half siblings even when they are not in the same FAMC as the focus person.
 * - Classify relationship by count of shared known parents (2+ full, 1 half, 0 unknown).
 */
export function inferredSiblingsOf(personId: string, model: GedcomModel): InferredSibling[] {
  const person = model.persons[personId]
  if (!person) return []

  const personParentFamilyIds = uniqueStrings(person.familyAsChildIds)
  const personParentIds = parentIdsOf(personId, model)
  const siblingIds = new Set<string>()

  personParentFamilyIds.forEach((familyId) => {
    const family = model.families[familyId]
    if (!family) return
    family.childIds.forEach((childId) => {
      if (childId !== personId) siblingIds.add(childId)
    })
  })

  personParentIds.forEach((parentId) => {
    const parent = model.persons[parentId]
    if (!parent) return

    parent.familyAsSpouseIds.forEach((familyId) => {
      const family = model.families[familyId]
      if (!family) return
      family.childIds.forEach((childId) => {
        if (childId !== personId) siblingIds.add(childId)
      })
    })
  })

  return Array.from(siblingIds).map((id) => {
    const siblingParentIds = parentIdsOf(id, model)
    const sharedParentIds = siblingParentIds.filter((parentId) => personParentIds.includes(parentId))

    let relationship: SiblingRelationshipType = 'unknown'
    if (sharedParentIds.length >= 2) relationship = 'full'
    else if (sharedParentIds.length === 1) relationship = 'half'

    return {
      id,
      sharedParentIds,
      relationship,
    }
  })
}
