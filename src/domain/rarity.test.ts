import { describe, expect, it } from 'vitest'
import { RARITY_POINTS, RARITY_WEIGHTS, rarityForPopulation } from './rarity'
import { REGIONS } from './types'

describe('rarityForPopulation', () => {
  it.each([
    [0, 'SSR'],
    [2999, 'SSR'],
    [3000, 'SR'],
    [9999, 'SR'],
    [10000, 'R'],
    [29999, 'R'],
    [30000, 'N'],
    [99999, 'N'],
  ] as const)('人口 %i は %s', (population, expected) => {
    expect(rarityForPopulation(population)).toBe(expected)
  })

  it('10万人以上は出題対象外なので null', () => {
    expect(rarityForPopulation(100000)).toBeNull()
    expect(rarityForPopulation(3_000_000)).toBeNull()
  })
})

describe('定数', () => {
  it('排出率の合計は100', () => {
    const sum = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBe(100)
  })

  it('排出率は仕様どおり', () => {
    expect(RARITY_WEIGHTS).toEqual({ SSR: 8, SR: 22, R: 35, N: 35 })
  })

  it('ポイントは仕様どおり', () => {
    expect(RARITY_POINTS).toEqual({ SSR: 100, SR: 50, R: 25, N: 10 })
  })

  it('地方は8つで仕様の順', () => {
    expect(REGIONS).toEqual([
      '北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州沖縄',
    ])
  })
})
