import { MAX_POPULATION, rarityForPopulation } from '../src/domain/rarity'
import { REGIONS, TOWN_TAGS, type GenericMission, type Region, type Town } from '../src/domain/types'
import { MIN_POPULATION } from './skeleton.logic'

export type ValidationError = { townId: string; field: string; message: string }

/**
 * 出発地に依存する表現。事前生成の文面に混ざってはならない（仕様 6.2）。
 *
 * 部分一致の語を並べる形では「東京駅から」が「東京から」を含まないため抜ける。
 * 駅・空港・港・方面を挟んでも効くパターンにしてある。
 *
 * ここに 那覇・福岡・博多・鹿児島 を**入れていない**のは、島の町では
 * これらが誰にとっても通る唯一の玄関口であり（久米島なら那覇、対馬なら福岡）、
 * 「那覇から飛行機で渡る」は出発地に依存しない正しい記述だから。
 * そうした町で有害になるのは所要時間の方なので、下の DURATION で捕まえる。
 */
const ORIGIN_DEPENDENT = [
  /(?:東京|大阪|名古屋|新宿|品川|渋谷|羽田|成田|伊丹|関空|都心|都内|首都圏|関東|関西|本州|県外)(?:駅|空港|港|方面)?(?:から|より|発)/,
]

/**
 * 出発地を書かずに所要時間だけ書く形も、どこから来るかで嘘になる（仕様 6.2）。
 * 「車で3時間」「飛行機で2時間」「約90分」はいずれも出発地が決まらないと定まらない。
 */
const DURATION = [/\d+\s*時間/, /約\s*\d+\s*分/, /\d+\s*分(?:ほど|程度|ばかり)/]

/** 固有ミッションに現れてはならない汎用的な言い回し */
const TOO_GENERIC = [
  '地元の人に話しかけ',
  '名前を知らない店',
  '商店街を歩く',
  'おすすめを聞く',
]

export function validateTowns(towns: unknown, genericMissions: GenericMission[]): ValidationError[] {
  if (!Array.isArray(towns)) {
    return [{ townId: '-', field: 'root', message: 'towns.json の中身が配列ではない' }]
  }

  const errors: ValidationError[] = []
  const seenIds = new Set<string>()

  for (const raw of towns) {
    const town = raw as Town
    const id = typeof town?.id === 'string' && town.id !== '' ? town.id : '(id不明)'
    const push = (field: string, message: string) => errors.push({ townId: id, field, message })

    if (typeof town?.id !== 'string' || town.id === '') push('id', 'id が空')
    else if (seenIds.has(town.id)) push('id', `id が重複している: ${town.id}`)
    else seenIds.add(town.id)

    if (typeof town?.name !== 'string' || town.name === '') push('name', '町名が空')
    else if (town.name.endsWith('区')) push('name', `特別区・行政区は出題対象外: ${town.name}`)
    else if (town.name.endsWith('郡')) push('name', `郡の集計行は自治体ではない: ${town.name}`)
    // 市町村の名前は必ず市・町・村で終わる。満たさない行は「島しょ」のような集計行
    else if (!/[市町村]$/.test(town.name)) push('name', `自治体名ではない: ${town.name}`)
    if (typeof town?.prefecture !== 'string' || town.prefecture === '') push('prefecture', '都道府県が空')
    if (!REGIONS.includes(town?.region as Region)) push('region', `地方が不正: ${String(town?.region)}`)

    if (typeof town?.population !== 'number' || !Number.isFinite(town.population)) {
      push('population', '人口が数値でない')
    } else if (town.population >= MAX_POPULATION) {
      push('population', `人口10万人以上は出題対象外: ${town.population}`)
    } else if (town.population < MIN_POPULATION) {
      push('population', `人口が小さすぎる（実在しない自治体の可能性）: ${town.population}`)
    } else if (rarityForPopulation(town.population) !== town.rarity) {
      push('rarity', `人口 ${town.population} に対してレア度 ${town.rarity} が不整合`)
    }

    if (!Array.isArray(town?.tags)) {
      push('tags', 'tags が配列でない')
    } else {
      for (const tag of town.tags) {
        if (!TOWN_TAGS.includes(tag as never)) push('tags', `語彙にないタグ: ${tag}`)
      }
      if (new Set(town.tags).size !== town.tags.length) push('tags', 'tags が重複している')
    }

    if (town?.enriched !== true) {
      // 未生成の町は文面が空で構わない
      continue
    }

    const mission = typeof town.uniqueMission === 'string' ? town.uniqueMission.trim() : ''
    if (mission.length < 12 || mission.length > 80) {
      push('uniqueMission', `固有ミッションの長さが範囲外(12〜80): ${mission.length}文字`)
    }
    if (genericMissions.some((g) => g.text.trim() === mission)) {
      push('uniqueMission', '固有ミッションが汎用プールと同一の文面')
    }
    for (const phrase of TOO_GENERIC) {
      if (mission.includes(phrase)) {
        push('uniqueMission', `固有ミッションが汎用的すぎる表現を含む: ${phrase}`)
      }
    }

    const tips = typeof town.accessTips === 'string' ? town.accessTips.trim() : ''
    if (tips.length < 20 || tips.length > 200) {
      push('accessTips', `行き方のコツの長さが範囲外(20〜200): ${tips.length}文字`)
    }
    for (const pattern of ORIGIN_DEPENDENT) {
      const hit = tips.match(pattern)
      if (hit) push('accessTips', `出発地に依存する表現を含む（仕様6.2違反）: ${hit[0]}`)
    }
    for (const pattern of DURATION) {
      const hit = tips.match(pattern)
      if (hit) push('accessTips', `出発地によって変わる所要時間を含む（仕様6.2違反）: ${hit[0]}`)
    }
  }

  return errors
}

/**
 * 汎用ミッションプールの検証（仕様 5.2 / 11.2）。
 *
 * `requiredTags` の打ち間違いは症状が出ない種類の壊れ方をする。「海沿」と書いても
 * エラーにならず、どの町にも成立しないのでプールが黙って縮むだけで、
 * そのミッションが一度も出ないことに誰も気づかない。
 */
export function validateGenericMissions(missions: unknown): ValidationError[] {
  if (!Array.isArray(missions)) {
    return [{ townId: '-', field: 'root', message: 'generic-missions.json の中身が配列ではない' }]
  }

  const errors: ValidationError[] = []
  const seenIds = new Set<string>()

  for (const raw of missions) {
    const mission = raw as GenericMission
    const id = typeof mission?.id === 'string' && mission.id !== '' ? mission.id : '(id不明)'
    const push = (field: string, message: string) => errors.push({ townId: id, field, message })

    if (typeof mission?.id !== 'string' || mission.id === '') push('id', 'id が空')
    else if (seenIds.has(mission.id)) push('id', `id が重複している: ${mission.id}`)
    else seenIds.add(mission.id)

    const text = typeof mission?.text === 'string' ? mission.text.trim() : ''
    if (text.length < 8 || text.length > 60) {
      push('text', `文面の長さが範囲外(8〜60): ${text.length}文字`)
    }

    if (!Array.isArray(mission?.requiredTags)) {
      push('requiredTags', 'requiredTags が配列でない')
    } else {
      for (const tag of mission.requiredTags) {
        if (!TOWN_TAGS.includes(tag as never)) push('requiredTags', `語彙にないタグ: ${tag}`)
      }
      if (new Set(mission.requiredTags).size !== mission.requiredTags.length) {
        push('requiredTags', 'requiredTags が重複している')
      }
    }
  }

  // 条件なしのミッションは、町のタグで候補が枯れたときの補充に使う（仕様 5.2）。
  // 2枚引く仕様なので最低3つは要る
  const unconditional = (missions as GenericMission[]).filter(
    (m) => Array.isArray(m?.requiredTags) && m.requiredTags.length === 0,
  )
  if (unconditional.length < 3) {
    errors.push({
      townId: '-',
      field: 'pool',
      message: `条件なしのミッションが3つ未満: ${unconditional.length}件`,
    })
  }

  return errors
}
