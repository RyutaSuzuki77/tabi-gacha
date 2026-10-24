import { drawTown, type Rng } from './draw'
import { buildPulledMissions, drawGenericMissions } from './missions'
import type { GenericMission, Pull, Rarity, Town } from './types'

/** 町を1つ引き、ミッション3枚（固有1＋汎用2）を組み立てて pull にする */
export function createPull(args: {
  pool: Town[]
  generics: GenericMission[]
  rng: Rng
  memberId: string
  now: Date
  newId: () => string
  forcedRarity?: Rarity
}): Pull | null {
  const town = drawTown(args.pool, args.rng, args.forcedRarity)
  if (!town) return null

  const generics = drawGenericMissions(args.generics, town.tags, args.rng)

  return {
    id: args.newId(),
    memberId: args.memberId,
    townId: town.id,
    pulledAt: args.now.toISOString(),
    missions: buildPulledMissions(generics),
  }
}
