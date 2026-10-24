import { describe, expect, it } from 'vitest'
import { buildPulledMissions, drawGenericMissions, eligibleMissions } from './missions'
import type { Rng } from './draw'
import type { GenericMission } from './types'

function seq(values: number[]): Rng {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

const POOL: GenericMission[] = [
  { id: 'g1', text: '地元の人に話しかける', requiredTags: [] },
  { id: 'g2', text: '名前を知らない店に入る', requiredTags: [] },
  { id: 'g3', text: '漁港で朝市をのぞく', requiredTags: ['海沿い'] },
  { id: 'g4', text: '温泉で一服する', requiredTags: ['温泉あり'] },
]

describe('eligibleMissions', () => {
  it('条件なしのミッションは常に成立する', () => {
    expect(eligibleMissions(POOL, []).map((m) => m.id)).toEqual(['g1', 'g2'])
  })

  it('タグを満たすミッションが候補に加わる', () => {
    expect(eligibleMissions(POOL, ['海沿い']).map((m) => m.id)).toEqual(['g1', 'g2', 'g3'])
  })

  it('必要タグをすべて持っていないと成立しない', () => {
    const pool: GenericMission[] = [
      { id: 'x', text: '海沿いの温泉', requiredTags: ['海沿い', '温泉あり'] },
    ]
    expect(eligibleMissions(pool, ['海沿い'])).toEqual([])
    expect(eligibleMissions(pool, ['海沿い', '温泉あり']).map((m) => m.id)).toEqual(['x'])
  })
})

describe('drawGenericMissions', () => {
  it('2枚を重複なく引く', () => {
    const got = drawGenericMissions(POOL, ['海沿い', '温泉あり'], seq([0, 0]))
    expect(got).toHaveLength(2)
    expect(new Set(got.map((m) => m.id)).size).toBe(2)
  })

  it('成立する候補が2つ未満なら、条件なしのミッションで補う', () => {
    const pool: GenericMission[] = [
      { id: 'sea', text: '漁港', requiredTags: ['海沿い'] },
      { id: 'any1', text: 'どこでも1', requiredTags: [] },
      { id: 'any2', text: 'どこでも2', requiredTags: [] },
    ]
    // タグなしの町：'sea' は成立しないので、条件なしから2枚
    const got = drawGenericMissions(pool, [], seq([0, 0]))
    expect(got.map((m) => m.id).sort()).toEqual(['any1', 'any2'])
  })

  it('候補が1件しかなければ1枚だけ返す（水増ししない）', () => {
    const pool: GenericMission[] = [{ id: 'only', text: 'ひとつ', requiredTags: [] }]
    expect(drawGenericMissions(pool, [], seq([0, 0])).map((m) => m.id)).toEqual(['only'])
  })

  it('候補が空なら空配列', () => {
    expect(drawGenericMissions([], [], seq([0]))).toEqual([])
  })
})

describe('buildPulledMissions', () => {
  it('固有1枚を先頭に置き、汎用を続ける。すべて未達成で始まる', () => {
    const got = buildPulledMissions([POOL[0], POOL[1]])
    expect(got).toEqual([
      { kind: 'unique', genericMissionId: null, done: false },
      { kind: 'generic', genericMissionId: 'g1', done: false },
      { kind: 'generic', genericMissionId: 'g2', done: false },
    ])
  })
})
