import { describe, expect, it } from 'vitest'
import { drawRarity, drawTown } from './draw'
import type { Rng } from './draw'
import type { Rarity, Town } from './types'

/** 渡した値を順番に返す乱数。尽きたら最後の値を返す */
function seq(values: number[]): Rng {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

function town(id: string, rarity: Rarity): Town {
  return {
    id, name: `${id}町`, prefecture: '島根県', region: '中国',
    population: 5000, rarity,
    tags: [], uniqueMission: 'm', accessTips: 'a', enriched: true,
  }
}

describe('drawRarity', () => {
  const all: Rarity[] = ['SSR', 'SR', 'R', 'N']

  it('重みの境界で正しいレア度を返す（SSR=8, SR=22, R=35, N=35）', () => {
    expect(drawRarity(all, seq([0]))).toBe('SSR')
    expect(drawRarity(all, seq([0.0799]))).toBe('SSR')
    expect(drawRarity(all, seq([0.08]))).toBe('SR')
    expect(drawRarity(all, seq([0.2999]))).toBe('SR')
    expect(drawRarity(all, seq([0.3]))).toBe('R')
    expect(drawRarity(all, seq([0.6499]))).toBe('R')
    expect(drawRarity(all, seq([0.65]))).toBe('N')
    expect(drawRarity(all, seq([0.9999]))).toBe('N')
  })

  it('候補を絞ると、その中で重みが再配分される', () => {
    // SSR(8) と N(35) だけなら、境界は 8/43 ≒ 0.186
    expect(drawRarity(['SSR', 'N'], seq([0.18]))).toBe('SSR')
    expect(drawRarity(['SSR', 'N'], seq([0.19]))).toBe('N')
  })

  it('候補が空なら null', () => {
    expect(drawRarity([], seq([0.5]))).toBeNull()
  })
})

describe('drawTown', () => {
  it('引いたレア度の町から一様に選ぶ', () => {
    const pool = [town('a', 'N'), town('b', 'N'), town('c', 'N')]
    // レア度抽選で N を引き、続く乱数で3件目を選ぶ
    expect(drawTown(pool, seq([0.9, 0.9]))?.id).toBe('c')
    expect(drawTown(pool, seq([0.9, 0.0]))?.id).toBe('a')
  })

  it('プールに存在しないレア度は抽選候補に入らない（空レア度で再抽選しない）', () => {
    // プールは SSR のみ。乱数が N の帯を指しても SSR が返る
    const pool = [town('only', 'SSR')]
    expect(drawTown(pool, seq([0.99, 0]))?.id).toBe('only')
  })

  it('プールが空なら null', () => {
    expect(drawTown([], seq([0.5]))).toBeNull()
  })

  it('forcedRarity を渡すとレア度抽選を飛ばす', () => {
    const pool = [town('a', 'SSR'), town('b', 'N')]
    expect(drawTown(pool, seq([0]), 'N')?.id).toBe('b')
  })

  it('forcedRarity の町がプールに無ければ null', () => {
    expect(drawTown([town('a', 'N')], seq([0]), 'SSR')).toBeNull()
  })
})
