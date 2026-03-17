import sampleFamilyGed from './data/sample-family.ged?raw'
import simpleExtendedFamilyGed from './data/simple-extended-family.ged?raw'
import ukRoyalSimpleGed from './data/uk-royal-simple.ged?raw'

export interface DemoDataset {
  id: string
  name: string
  description: string
  fileName: string
  content: string
}

export const demoDatasets: DemoDataset[] = [
  {
    id: 'sample-family',
    name: 'Sample Family',
    description: 'Small synthetic household with parent/child relationships.',
    fileName: 'demo-sample-family.ged',
    content: sampleFamilyGed,
  },
  {
    id: 'simple-extended-family',
    name: 'Extended Family',
    description: 'Larger synthetic tree including grandparents and siblings.',
    fileName: 'demo-simple-extended-family.ged',
    content: simpleExtendedFamilyGed,
  },
  {
    id: 'uk-royal-simple',
    name: 'UK Royal (Simple)',
    description: 'Compact historical example with well-known people.',
    fileName: 'demo-uk-royal-simple.ged',
    content: ukRoyalSimpleGed,
  },
]

export function getDemoDatasetById(id: string): DemoDataset | undefined {
  return demoDatasets.find((dataset) => dataset.id === id)
}
