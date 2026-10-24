import { RARITY_WEIGHTS } from './rarity'
import type { Rarity, Town } from './types'

export type Rng = () => number

/**
 * 候補のレア度から重み付きで1つ引く。
 * 候補を絞った場合は、その中で重みを再配分する（候補外の確率は捨てない）。
 */
export function drawRarity(available: Rarity[], rng: Rng): Rarity | null {
  if (available.length === 0) return null
  const total = available.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0)
  let threshold = rng() * total
  for (const rarity of available) {
    threshold -= RARITY_WEIGHTS[rarity]
    if (threshold < 0) return rarity
  }
  return available[available.length - 1]
}

/**
 * 二段階抽選：①プールに存在するレア度の中から重み付きで1つ引く
 *             ②そのレア度の町から一様に1つ選ぶ
 * プールに存在しないレア度は候補に入れないため、「空レア度を引いて再抽選」は起きない。
 */
export function drawTown(pool: Town[], rng: Rng, forcedRarity?: Rarity): Town | null {
  if (pool.length === 0) return null

  let rarity: Rarity | null
  if (forcedRarity) {
    rarity = forcedRarity
  } else {
    const available = (['SSR', 'SR', 'R', 'N'] as Rarity[]).filter((r) =>
      pool.some((t) => t.rarity === r),
    )
    rarity = drawRarity(available, rng)
  }
  if (!rarity) return null

  const candidates = pool.filter((t) => t.rarity === rarity)
  if (candidates.length === 0) return null
  const index = Math.min(Math.floor(rng() * candidates.length), candidates.length - 1)
  return candidates[index]
}
