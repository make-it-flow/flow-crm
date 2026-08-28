export function isMockResearchMode(): boolean {
  return (process.env.RESEARCH_MODE ?? 'mock').trim().toLowerCase() !== 'live'
}
