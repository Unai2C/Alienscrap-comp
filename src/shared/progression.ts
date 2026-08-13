export const LEVEL_THRESHOLDS = [
  0,
  500,
  1000,
  1500,
  2500,
  4000,
  6500,
  10500,
  17000,
  27500,
  44500,
  72000,
  116500,
  188500,
  305000
] as const

export const SCRAPER_TITLES = [
  'Scrap Rookie',
  'Rust Picker',
  'Junk Scout',
  'Yard Runner',
  'Scrap Hunter',
  'Alloy Collector',
  'Wreck Specialist',
  'Alien Salvager',
  'Master Scraper',
  'Relic Tracker',
  'Tech Reclaimer',
  'Scrap Vanguard',
  'Yard Commander',
  'Wasteland Architect',
  'Legend of the Yard'
] as const

export interface LevelProgress {
  level: number
  pointsToNext: number
  isMaxLevel: boolean
}

export function getLevelProgress(totalPoints: number): LevelProgress {
  const points = Math.max(0, Math.floor(totalPoints))
  let levelIndex = 0

  while (
    levelIndex + 1 < LEVEL_THRESHOLDS.length &&
    points >= LEVEL_THRESHOLDS[levelIndex + 1]
  ) {
    levelIndex++
  }

  const isMaxLevel = levelIndex === LEVEL_THRESHOLDS.length - 1
  return {
    level: levelIndex + 1,
    pointsToNext: isMaxLevel ? 0 : LEVEL_THRESHOLDS[levelIndex + 1] - points,
    isMaxLevel
  }
}

export function getScraperTitle(level: number): string {
  const index = Math.min(SCRAPER_TITLES.length - 1, Math.max(0, Math.floor(level) - 1))
  return SCRAPER_TITLES[index]
}
