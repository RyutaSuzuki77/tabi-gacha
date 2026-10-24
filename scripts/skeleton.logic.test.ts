import { describe, expect, it } from 'vitest'
import {
  buildSkeletonTown,
  curate,
  parseCsv,
  parsePopulation,
  regionForPrefecture,
} from './skeleton.logic'
import type { Rarity, Town } from '../src/domain/types'

describe('regionForPrefecture', () => {
  it.each([
    ['北海道', '北海道'],
    ['青森県', '東北'],
    ['福島県', '東北'],
    ['東京都', '関東'],
    ['神奈川県', '関東'],
    ['新潟県', '中部'],
    ['愛知県', '中部'],
    ['三重県', '近畿'],
    ['大阪府', '近畿'],
    ['島根県', '中国'],
    ['高知県', '四国'],
    ['沖縄県', '九州沖縄'],
  ])('%s は %s', (prefecture, region) => {
    expect(regionForPrefecture(prefecture)).toBe(region)
  })

  it('47都道府県すべてが地方に割り当てられる', () => {
    const prefectures = [
      '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
      '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
      '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
      '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
      '鳥取県', '島根県', '岡山県', '広島県', '山口県',
      '徳島県', '香川県', '愛媛県', '高知県',
      '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
    ]
    expect(prefectures).toHaveLength(47)
    for (const p of prefectures) {
      expect(regionForPrefecture(p), p).not.toBeNull()
    }
  })

  it('知らない表記は null', () => {
    expect(regionForPrefecture('架空県')).toBeNull()
  })
})

describe('parsePopulation', () => {
  it('桁区切りのカンマを除いて数値にする', () => {
    expect(parsePopulation('2,840')).toBe(2840)
    expect(parsePopulation('123456')).toBe(123456)
  })

  it('前後の空白を無視する', () => {
    expect(parsePopulation('  5000 ')).toBe(5000)
  })

  it('数値でなければ null', () => {
    expect(parsePopulation('')).toBeNull()
    expect(parsePopulation('-')).toBeNull()
    expect(parsePopulation('不明')).toBeNull()
  })
})

describe('parseCsv', () => {
  it('ヘッダを使ってレコードの配列にする', () => {
    const text = 'code,name\n01101,札幌市\n32386,奥出雲町\n'
    expect(parseCsv(text)).toEqual([
      { code: '01101', name: '札幌市' },
      { code: '32386', name: '奥出雲町' },
    ])
  })

  it('空行を飛ばす', () => {
    expect(parseCsv('a,b\n1,2\n\n3,4\n')).toHaveLength(2)
  })

  it('CRLF の改行でも壊れない', () => {
    expect(parseCsv('code,name\r\n01101,札幌市\r\n')).toEqual([
      { code: '01101', name: '札幌市' },
    ])
  })
})

describe('buildSkeletonTown', () => {
  const row = {
    code: '32386', prefecture: '島根県', name: '奥出雲町',
    population: '11,500',
  }

  it('骨格を組み立てる。未生成なので enriched は false', () => {
    const town = buildSkeletonTown(row)
    expect(town).toEqual({
      id: '32386',
      name: '奥出雲町',
      prefecture: '島根県',
      region: '中国',
      population: 11500,
      rarity: 'R',
      tags: [],
      uniqueMission: '',
      accessTips: '',
      enriched: false,
    })
  })

  it('人口10万人以上は対象外なので null', () => {
    expect(buildSkeletonTown({ ...row, population: '100000' })).toBeNull()
    expect(buildSkeletonTown({ ...row, population: '1,973,000' })).toBeNull()
  })

  it('特別区・行政区は人口が10万人未満でも除外する', () => {
    // 千代田区は人口10万人未満だが、都心の一区画なので出してはならない
    expect(buildSkeletonTown({
      ...row, prefecture: '東京都', name: '千代田区', population: '66,000',
    })).toBeNull()
    expect(buildSkeletonTown({
      ...row, prefecture: '大阪府', name: '浪速区', population: '74,000',
    })).toBeNull()
  })

  it('「区」で終わらない町村は除外しない', () => {
    expect(buildSkeletonTown({ ...row, name: '奥出雲町' })).not.toBeNull()
  })

  it('人口100人未満は除外する（人口0の村が一覧に含まれることがある）', () => {
    expect(buildSkeletonTown({ ...row, population: '0' })).toBeNull()
    expect(buildSkeletonTown({ ...row, population: '99' })).toBeNull()
    expect(buildSkeletonTown({ ...row, population: '100' })).not.toBeNull()
  })

  it('人口・都道府県が読めない行は null', () => {
    expect(buildSkeletonTown({ ...row, population: '不明' })).toBeNull()
    expect(buildSkeletonTown({ ...row, prefecture: '架空県' })).toBeNull()
  })
})

describe('curate', () => {
  function town(id: string, region: Town['region'], rarity: Rarity): Town {
    return {
      id, name: `${id}町`, prefecture: 'X県', region,
      population: 5000, rarity,
      tags: [], uniqueMission: '', accessTips: '', enriched: false,
    }
  }
  const rng = () => 0

  it('地方×レア度ごとに上限件数まで取る', () => {
    const towns = [
      town('a1', '中国', 'SSR'), town('a2', '中国', 'SSR'), town('a3', '中国', 'SSR'),
      town('b1', '東北', 'SSR'),
    ]
    const got = curate(towns, 2, rng)
    expect(got.filter((t) => t.region === '中国')).toHaveLength(2)
    expect(got.filter((t) => t.region === '東北')).toHaveLength(1)
  })

  it('候補が上限より少なければあるだけ取る', () => {
    expect(curate([town('x', '四国', 'N')], 5, rng)).toHaveLength(1)
  })

  it('全レア度・全地方から取る（偏らない）', () => {
    const towns = [
      town('s', '九州沖縄', 'SSR'), town('r', '九州沖縄', 'SR'),
      town('c', '九州沖縄', 'R'), town('n', '九州沖縄', 'N'),
    ]
    const got = curate(towns, 1, rng)
    expect(new Set(got.map((t) => t.rarity))).toEqual(new Set(['SSR', 'SR', 'R', 'N']))
  })
})
