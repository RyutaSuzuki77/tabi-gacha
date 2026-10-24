import { describe, expect, it } from 'vitest'
import { validateGenericMissions, validateTowns } from './validateTowns'
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

  it('出発地に依存する表現を駅名・空港名つきでも検出する', () => {
    // 「東京駅から」は「東京から」を含まないため、部分一致のリストでは抜ける
    const cases = [
      '東京駅から3時間ほど。最寄りは木次駅で、駅から先はバスが少ない。車が無難である。',
      '羽田空港から飛んで入る。最寄りは木次駅で、駅から先はバスの本数が少ない。',
      '都内からだと遠い。最寄りは木次駅で、駅から先はバスの本数が少ない。',
      '関東から向かう場合は余裕をみたい。最寄りは木次駅でバスは少ない。',
    ]
    for (const accessTips of cases) {
      expect(fieldsOf(validateTowns([town({ accessTips })], GENERICS)), accessTips).toContain('accessTips')
    }
  })

  it('出発地に依存する所要時間を検出する', () => {
    // 出発地を書かずに所要時間だけ書くのも、どこから来るかで嘘になる
    const cases = [
      '車で3時間ほどかかる。最寄りは木次駅で、駅から先はバスの本数が少ない。',
      '飛行機で2時間。最寄りは木次駅で、駅から先はバスの本数が少ない。車が無難。',
      '約90分の道のりである。最寄りは木次駅で、駅から先はバスの本数が少ない。',
    ]
    for (const accessTips of cases) {
      expect(fieldsOf(validateTowns([town({ accessTips })], GENERICS)), accessTips).toContain('accessTips')
    }
  })

  it('自治体でない集計行（市町村で終わらない名前）を検出する', () => {
    // e-Stat には「島しょ」のような広域の集計行がある。区でも郡でもないため
    // 名前の末尾が市町村であることを要求しないと通ってしまう
    expect(fieldsOf(validateTowns([town({ name: '島しょ' })], GENERICS))).toContain('name')
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

describe('validateGenericMissions', () => {
  const VALID_POOL = [
    { id: 'a', text: '地元の人に話しかけて、おすすめを一つ聞く', requiredTags: [] },
    { id: 'b', text: '名前を知らない店に入って、何か一つ買う', requiredTags: [] },
    { id: 'c', text: 'その土地のもので昼食をとる', requiredTags: [] },
    { id: 'd', text: '海が見える場所まで行って、黄昏る', requiredTags: ['海沿い'] },
  ]

  it('正しいプールならエラーなし', () => {
    expect(validateGenericMissions(VALID_POOL)).toEqual([])
  })

  it('配列でなければエラー', () => {
    expect(validateGenericMissions({})).toHaveLength(1)
  })

  it('語彙にない必要タグを検出する', () => {
    // 「海沿」のような打ち間違いはどの町にも成立せず、黙ってプールが縮むだけで症状が出ない
    const pool = [...VALID_POOL, { id: 'x', text: '海の町で何かする', requiredTags: ['海沿'] }]
    expect(validateGenericMissions(pool).map((e) => e.field)).toContain('requiredTags')
  })

  it('idの重複を検出する', () => {
    const pool = [...VALID_POOL, { ...VALID_POOL[0], text: '別の文面だが同じid' }]
    expect(validateGenericMissions(pool).map((e) => e.field)).toContain('id')
  })

  it('文面が空なら検出する', () => {
    const pool = [...VALID_POOL, { id: 'empty', text: '', requiredTags: [] }]
    expect(validateGenericMissions(pool).map((e) => e.field)).toContain('text')
  })

  it('条件なしのミッションが3つ未満なら検出する', () => {
    // 汎用は2枚引くので、候補が枯れたときの補充に最低3つ必要（仕様 5.2）
    const pool = VALID_POOL.slice(0, 2).concat(VALID_POOL[3])
    expect(validateGenericMissions(pool).map((e) => e.field)).toContain('pool')
  })
})
