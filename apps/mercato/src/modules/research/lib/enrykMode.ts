export function isMockEnrykMode(): boolean {
  return (process.env.ENRYK_MODE ?? 'mock').trim().toLowerCase() !== 'live'
}
