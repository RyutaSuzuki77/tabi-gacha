import { describe, expect, it } from 'vitest'
import { sortPulls } from './sort'
import type { Pull, Rarity, Region, Town } from './types'

function town(id: string, rarity: Rarity, region: Region): Town {
  return {
    id, name: `${id}町`, prefecture: 'X県', region,
    population: 5000, rarity,
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
  }
}

function pull(id: string, townId: string, pulledAt: string): Pull {
  return { id, memberId: 'm', townId, pulledAt, missions: [] }
}

const towns = [
  town('n', 'N', '九州沖縄'),
  town('ssr', 'SSR', '東北'),
  town('r', 'R', '北海道'),
]
const byId = (id: string) => towns.find((t) => t.id === id)

describe('sortPulls', () => {
  const pulls = [
    pull('p1', 'n', '2026-10-20T00:00:00.000Z'),
    pull('p2', 'ssr', '2026-10-22T00:00:00.000Z'),
    pull('p3', 'r', '2026-10-21T00:00:00.000Z'),
  ]

  it('日付は新しい順', () => {
    expect(sortPulls(pulls, 'date', byId).map((p) => p.id)).toEqual(['p2', 'p3', 'p1'])
  })

  it('レア度は SSR → SR → R → N の順', () => {
    expect(sortPulls(pulls, 'rarity', byId).map((p) => p.id)).toEqual(['p2', 'p3', 'p1'])
  })

  it('地方は仕様の並び順（北海道が先、九州沖縄が後）', () => {
    expect(sortPulls(pulls, 'region', byId).map((p) => p.id)).toEqual(['p3', 'p2', 'p1'])
  })

  it('元の配列を書き換えない', () => {
    const original = [...pulls]
    sortPulls(pulls, 'rarity', byId)
    expect(pulls).toEqual(original)
  })

  it('町が見つからない pull は最後に置く', () => {
    const withOrphan = [pull('orphan', 'missing', '2026-10-23T00:00:00.000Z'), ...pulls]
    expect(sortPulls(withOrphan, 'rarity', byId).at(-1)!.id).toBe('orphan')
    expect(sortPulls(withOrphan, 'region', byId).at(-1)!.id).toBe('orphan')
  })
})
