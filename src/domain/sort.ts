import { REGIONS, type Pull, type Rarity, type Town } from './types'

export type SortKey = 'date' | 'rarity' | 'region'

const RARITY_ORDER: Record<Rarity, number> = { SSR: 0, SR: 1, R: 2, N: 3 }

/** 町が見つからない pull を最後に送るための大きな値 */
const LAST = Number.MAX_SAFE_INTEGER

export function sortPulls(
  pulls: Pull[],
  key: SortKey,
  townById: (id: string) => Town | undefined,
): Pull[] {
  const sorted = [...pulls]

  if (key === 'date') {
    return sorted.sort((a, b) => b.pulledAt.localeCompare(a.pulledAt))
  }

  return sorted.sort((a, b) => rankOf(a) - rankOf(b))

  function rankOf(pull: Pull): number {
    const town = townById(pull.townId)
    if (!town) return LAST
    return key === 'rarity' ? RARITY_ORDER[town.rarity] : REGIONS.indexOf(town.region)
  }
}
