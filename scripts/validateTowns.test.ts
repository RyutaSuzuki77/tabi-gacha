import { describe, expect, it } from 'vitest'
import { validateTowns } from './validateTowns'
import type { GenericMission, Town } from '../src/domain/types'

const GENERICS: GenericMission[] = [
  { id: 'g1', text: '地元の人に話しかけて、おすすめを一つ聞く', requiredTags: [] },
]

function town(over: Partial<Town> = {}): Town {
  return {
    id: '32386',
    name: '奥出雲町',
    prefecture: '島根県',
    region: '中国',
    population: 11500,
    rarity: 'R',
    tags: ['山間'],
    uniqueMission: 'たたら製鉄の跡をひとつ訪ねて、鉄と水の関係を確かめる',
    accessTips: '最寄りは木次駅だが町域は広く、駅から先はバスの本数が少ない。車での移動が無難で、冬は積雪に備えたい。',
    enriched: true,
    ...over,
  }
}

function fieldsOf(errors: { field: string }[]) {
  return errors.map((e) => e.field)
}

describe('validateTowns', () => {
  it('正しいデータならエラーなし', () => {
    expect(validateTowns([town()], GENERICS)).toEqual([])
  })

  it('配列でなければエラー', () => {
    expect(validateTowns({}, GENERICS)).toHaveLength(1)
  })

  it('必須フィールドの欠落を検出する', () => {
    const broken = { ...town(), name: '' }
    expect(fieldsOf(validateTowns([broken], GENERICS))).toContain('name')
  })

  it('idの重複を検出する', () => {
    expect(fieldsOf(validateTowns([town(), town()], GENERICS))).toContain('id')
  })

  it('語彙にないタグを検出する', () => {
    expect(fieldsOf(validateTowns([town({ tags: ['絶景'] })], GENERICS))).toContain('tags')
  })

  it('タグの重複を検出する', () => {
    expect(fieldsOf(validateTowns([town({ tags: ['山間', '山間'] })], GENERICS))).toContain('tags')
  })

  it('人口10万人以上を検出する', () => {
    expect(fieldsOf(validateTowns([town({ population: 100000 })], GENERICS))).toContain('population')
  })

  it('特別区・行政区を検出する', () => {
    expect(fieldsOf(validateTowns([town({ name: '千代田区' })], GENERICS))).toContain('name')
  })

  it('郡の集計行を検出する', () => {
    expect(fieldsOf(validateTowns([town({ name: '鹿角郡' })], GENERICS))).toContain('name')
  })

  it('人口が小さすぎる行を検出する', () => {
    expect(fieldsOf(validateTowns([town({ population: 0, rarity: 'SSR' })], GENERICS))).toContain('population')
  })

  it('人口とレア度の不整合を検出する', () => {
    expect(fieldsOf(validateTowns([town({ population: 2000 })], GENERICS))).toContain('rarity')
  })

  it('固有ミッションが短すぎる／長すぎる場合を検出する', () => {
    expect(fieldsOf(validateTowns([town({ uniqueMission: '歩く' })], GENERICS))).toContain('uniqueMission')
    expect(fieldsOf(validateTowns([town({ uniqueMission: 'あ'.repeat(81) })], GENERICS))).toContain('uniqueMission')
  })

  it('固有ミッションが汎用プールと同じ文面なら検出する', () => {
    const same = town({ uniqueMission: GENERICS[0].text })
    expect(fieldsOf(validateTowns([same], GENERICS))).toContain('uniqueMission')
  })

  it('固有ミッションが汎用的な言い回しなら検出する', () => {
    const generic = town({ uniqueMission: '地元の人に話しかけて、何かおすすめを聞いてみる' })
    expect(fieldsOf(validateTowns([generic], GENERICS))).toContain('uniqueMission')
  })

  it('行き方のコツが出発地に依存していたら検出する（仕様 6.2）', () => {
    const cases = [
      '東京から約3時間。最寄りは木次駅で、駅から先はバスが少ない。車が無難である。',
      '都心からは半日みておきたい。最寄りは木次駅で、駅から先はバスが少ない。',
      '大阪から高速バスで向かうのが早い。最寄りは木次駅で、バスの本数は少ない。',
    ]
    for (const accessTips of cases) {
      expect(fieldsOf(validateTowns([town({ accessTips })], GENERICS)), accessTips).toContain('accessTips')
    }
  })

  it('行き方のコツが短すぎる場合を検出する', () => {
    expect(fieldsOf(validateTowns([town({ accessTips: '駅から遠い' })], GENERICS))).toContain('accessTips')
  })

  it('enriched: false の町は文面が空でも許す（未生成なので）', () => {
    const skeleton = town({ enriched: false, uniqueMission: '', accessTips: '', tags: [] })
    expect(validateTowns([skeleton], GENERICS)).toEqual([])
  })

  it('enriched: true なのに文面が空なら検出する', () => {
    const half = town({ uniqueMission: '', accessTips: '' })
    const fields = fieldsOf(validateTowns([half], GENERICS))
    expect(fields).toContain('uniqueMission')
    expect(fields).toContain('accessTips')
  })
})
