export const features = [
  { id: 'research.view', title: 'View research profiles', module: 'research' },
  {
    id: 'research.run',
    title: 'Run company research',
    module: 'research',
    dependsOn: ['research.view'],
  },
]

export default features
