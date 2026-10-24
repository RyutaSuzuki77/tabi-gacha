import { describe, expect, it } from 'vitest'
import { resolveMissionText } from './missionText'
import type { GenericMission, PulledMission, Town } from './types'

const town: Town = {
  id: 'a', name: '奥出雲町', prefecture: '島根県', region: '中国',
  population: 11500, rarity: 'R',
  tags: [], uniqueMission: 'たたら製鉄の跡をひとつ訪ねる', accessTips: 'コツ', enriched: true,
}

const generics: GenericMission[] = [{ id: 'g1', text: '地元の人に話しかける', requiredTags: [] }]

describe('resolveMissionText', () => {
  it('固有ミッションは町の文面を返す', () => {
    const m: PulledMission = { kind: 'unique', genericMissionId: null, done: false }
    expect(resolveMissionText(m, town, generics)).toBe('たたら製鉄の跡をひとつ訪ねる')
  })

  it('汎用ミッションはプールから文面を引く', () => {
    const m: PulledMission = { kind: 'generic', genericMissionId: 'g1', done: false }
    expect(resolveMissionText(m, town, generics)).toBe('地元の人に話しかける')
  })

  it('プールに無いIDでも落ちず、代わりの文面を返す', () => {
    const m: PulledMission = { kind: 'generic', genericMissionId: 'gone', done: false }
    expect(resolveMissionText(m, town, generics)).toBe('（このミッションは読み込めませんでした）')
  })
})
