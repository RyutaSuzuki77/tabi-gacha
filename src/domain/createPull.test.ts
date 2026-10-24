import { describe, expect, it } from 'vitest'
import { createPull } from './createPull'
import type { GenericMission, Town } from './types'

function town(id: string, rarity: Town['rarity'], tags: string[] = []): Town {
  return {
    id, name: `${id}町`, prefecture: '島根県', region: '中国',
    population: 5000, rarity,
    tags, uniqueMission: '固有ミッション', accessTips: 'コツ', enriched: true,
  }
}

const GENERICS: GenericMission[] = [
  { id: 'g1', text: 'どこでも1', requiredTags: [] },
  { id: 'g2', text: 'どこでも2', requiredTags: [] },
  { id: 'g3', text: '海の町だけ', requiredTags: ['海沿い'] },
]

const base = {
  generics: GENERICS,
  rng: () => 0,
  memberId: 'member-1',
  now: new Date('2026-10-24T06:00:00.000Z'),
  newId: () => 'pull-1',
}

describe('createPull', () => {
  it('ミッション3枚（固有1＋汎用2）の pull を作る', () => {
    const pull = createPull({ ...base, pool: [town('a', 'N')] })
    expect(pull).not.toBeNull()
    expect(pull!.id).toBe('pull-1')
    expect(pull!.memberId).toBe('member-1')
    expect(pull!.townId).toBe('a')
    expect(pull!.pulledAt).toBe('2026-10-24T06:00:00.000Z')
    expect(pull!.missions).toHaveLength(3)
    expect(pull!.missions[0].kind).toBe('unique')
    expect(pull!.missions.slice(1).every((m) => m.kind === 'generic')).toBe(true)
    expect(pull!.missions.every((m) => !m.done)).toBe(true)
  })

  it('町のタグで成立しない汎用ミッションは入らない', () => {
    const pull = createPull({ ...base, pool: [town('a', 'N', [])] })
    const ids = pull!.missions.map((m) => m.genericMissionId)
    expect(ids).not.toContain('g3')
  })

  it('タグを満たせば条件付きの汎用ミッションも候補に入る', () => {
    const pull = createPull({ ...base, pool: [town('a', 'N', ['海沿い'])], rng: () => 0.99 })
    const ids = pull!.missions.map((m) => m.genericMissionId).filter(Boolean)
    expect(ids).toHaveLength(2)
  })

  it('forcedRarity を渡すとそのレア度の町が出る', () => {
    const pool = [town('n', 'N'), town('ssr', 'SSR')]
    expect(createPull({ ...base, pool, forcedRarity: 'SSR' })!.townId).toBe('ssr')
  })

  it('プールが空なら null', () => {
    expect(createPull({ ...base, pool: [] })).toBeNull()
  })
})
