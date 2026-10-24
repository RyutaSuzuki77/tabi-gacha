import { beforeEach, describe, expect, it } from 'vitest'
import { addPull, loadPulls, setMissionDone } from './pullStore'
import type { Pull } from '../domain/types'

function pull(id: string, townId: string): Pull {
  return {
    id,
    memberId: 'member-1',
    townId,
    pulledAt: '2026-10-24T00:00:00.000Z',
    missions: [
      { kind: 'unique', genericMissionId: null, done: false },
      { kind: 'generic', genericMissionId: 'g1', done: false },
      { kind: 'generic', genericMissionId: 'g2', done: false },
    ],
  }
}

beforeEach(() => localStorage.clear())

describe('pullStore', () => {
  it('初回は空配列', () => {
    expect(loadPulls()).toEqual([])
  })

  it('追加した pull を読み戻せる', () => {
    addPull(pull('p1', 'town-a'))
    expect(loadPulls().map((p) => p.id)).toEqual(['p1'])
  })

  it('同じ町を2回引いたら pull は2件になる（別の旅として扱う）', () => {
    addPull(pull('p1', 'town-a'))
    addPull(pull('p2', 'town-a'))
    const pulls = loadPulls()
    expect(pulls).toHaveLength(2)
    expect(pulls.map((p) => p.townId)).toEqual(['town-a', 'town-a'])
  })

  it('新しい pull が先頭に来る（新しい順）', () => {
    addPull(pull('p1', 'town-a'))
    addPull(pull('p2', 'town-b'))
    expect(loadPulls().map((p) => p.id)).toEqual(['p2', 'p1'])
  })

  it('ミッションの達成状況を切り替えられる', () => {
    addPull(pull('p1', 'town-a'))
    setMissionDone('p1', 1, true)
    expect(loadPulls()[0].missions[1].done).toBe(true)
    setMissionDone('p1', 1, false)
    expect(loadPulls()[0].missions[1].done).toBe(false)
  })

  it('他のミッションには影響しない', () => {
    addPull(pull('p1', 'town-a'))
    setMissionDone('p1', 0, true)
    const missions = loadPulls()[0].missions
    expect(missions.map((m) => m.done)).toEqual([true, false, false])
  })

  it('存在しない pull や範囲外の index は無視する', () => {
    addPull(pull('p1', 'town-a'))
    expect(() => setMissionDone('missing', 0, true)).not.toThrow()
    expect(() => setMissionDone('p1', 99, true)).not.toThrow()
    expect(loadPulls()[0].missions.every((m) => !m.done)).toBe(true)
  })

  it('壊れたJSONが入っていても空配列を返す', () => {
    localStorage.setItem('tabi-gacha:pulls', 'not json')
    expect(loadPulls()).toEqual([])
  })
})
