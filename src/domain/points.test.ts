import { describe, expect, it } from 'vitest'
import { pointsForPull, totalPoints } from './points'
import type { Pull, PulledMission, Town } from './types'

function missions(doneFlags: boolean[]): PulledMission[] {
  return doneFlags.map((done, i) => ({
    kind: i === 0 ? 'unique' : 'generic',
    genericMissionId: i === 0 ? null : `g${i}`,
    done,
  }))
}

function town(id: string, rarity: Town['rarity']): Town {
  return {
    id, name: `${id}町`, prefecture: '島根県', region: '中国',
    population: 5000, rarity,
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
  }
}

describe('pointsForPull', () => {
  it('レア度 × 達成数', () => {
    expect(pointsForPull('SSR', missions([true, true, true]))).toBe(300)
    expect(pointsForPull('SSR', missions([true, false, false]))).toBe(100)
    expect(pointsForPull('SR', missions([true, true, false]))).toBe(100)
    expect(pointsForPull('R', missions([true, true, true]))).toBe(75)
    expect(pointsForPull('N', missions([true, true, true]))).toBe(30)
  })

  it('未達成なら0', () => {
    expect(pointsForPull('SSR', missions([false, false, false]))).toBe(0)
  })
})

describe('totalPoints', () => {
  const towns = [town('a', 'SSR'), town('b', 'N')]
  const byId = (id: string) => towns.find((t) => t.id === id)

  it('全 pull の合計', () => {
    const pulls: Pull[] = [
      { id: 'p1', memberId: 'm', townId: 'a', pulledAt: '2026-10-24T00:00:00Z', missions: missions([true, true, false]) },
      { id: 'p2', memberId: 'm', townId: 'b', pulledAt: '2026-10-25T00:00:00Z', missions: missions([true, false, false]) },
    ]
    expect(totalPoints(pulls, byId)).toBe(200 + 10)
  })

  it('町が見つからない pull は0として無視する', () => {
    const pulls: Pull[] = [
      { id: 'p1', memberId: 'm', townId: 'missing', pulledAt: '2026-10-24T00:00:00Z', missions: missions([true, true, true]) },
    ]
    expect(totalPoints(pulls, byId)).toBe(0)
  })

  it('pull が無ければ0', () => {
    expect(totalPoints([], byId)).toBe(0)
  })
})
