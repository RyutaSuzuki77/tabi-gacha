import { describe, expect, it } from 'vitest'
import { poolFor } from './pool'
import type { Town } from './types'

function town(over: Partial<Town>): Town {
  return {
    id: 't', name: '某町', prefecture: '島根県', region: '中国',
    population: 5000, rarity: 'SR',
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
    ...over,
  }
}

describe('poolFor', () => {
  it('全国モードは生成済みの町をすべて返す', () => {
    const towns = [town({ id: 'a' }), town({ id: 'b', region: '東北' })]
    expect(poolFor(towns, { kind: 'nationwide' }).map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('地方モードは指定した地方の町だけを返す', () => {
    const towns = [
      town({ id: 'a', region: '中国' }),
      town({ id: 'b', region: '東北' }),
      town({ id: 'c', region: '中国' }),
    ]
    const got = poolFor(towns, { kind: 'region', region: '中国' })
    expect(got.map((t) => t.id)).toEqual(['a', 'c'])
  })

  it('未生成の町（enriched: false）は除外する', () => {
    const towns = [town({ id: 'a' }), town({ id: 'b', enriched: false })]
    expect(poolFor(towns, { kind: 'nationwide' }).map((t) => t.id)).toEqual(['a'])
  })

  it('未生成の町は地方モードでも除外する', () => {
    const towns = [
      town({ id: 'a', region: '四国', enriched: false }),
      town({ id: 'b', region: '四国' }),
    ]
    const got = poolFor(towns, { kind: 'region', region: '四国' })
    expect(got.map((t) => t.id)).toEqual(['b'])
  })

  it('該当が無ければ空配列', () => {
    expect(poolFor([town({ region: '中国' })], { kind: 'region', region: '北海道' })).toEqual([])
  })
})
