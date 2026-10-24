import { describe, expect, it } from 'vitest'
import { RANKS, rankFor } from './rank'

describe('rankFor', () => {
  it.each([
    [0, '旅の見習い'],
    [99, '旅の見習い'],
    [100, '寄り道の人'],
    [499, '寄り道の人'],
    [500, '旅人'],
    [1499, '旅人'],
    [1500, '辺境の開拓者'],
    [4999, '辺境の開拓者'],
    [5000, '日本を踏み尽くす者'],
    [999999, '日本を踏み尽くす者'],
  ])('累計 %i は %s', (total, title) => {
    expect(rankFor(total).title).toBe(title)
  })

  it('ランクは5段階で、閾値は昇順', () => {
    expect(RANKS).toHaveLength(5)
    const thresholds = RANKS.map((r) => r.threshold)
    expect(thresholds).toEqual([0, 100, 500, 1500, 5000])
  })
})
