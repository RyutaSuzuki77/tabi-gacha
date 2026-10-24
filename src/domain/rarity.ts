import type { Rarity } from './types'

export const MAX_POPULATION = 100000

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  SSR: 8,
  SR: 22,
  R: 35,
  N: 35,
}

export const RARITY_POINTS: Record<Rarity, number> = {
  SSR: 100,
  SR: 50,
  R: 25,
  N: 10,
}

/** 人口からレア度を決める。出題対象外（10万人以上）は null */
export function rarityForPopulation(population: number): Rarity | null {
  if (population >= MAX_POPULATION) return null
  if (population >= 30000) return 'N'
  if (population >= 10000) return 'R'
  if (population >= 3000) return 'SR'
  return 'SSR'
}
