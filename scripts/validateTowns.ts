import { MAX_POPULATION, rarityForPopulation } from '../src/domain/rarity'
import { REGIONS, TOWN_TAGS, type GenericMission, type Region, type Town } from '../src/domain/types'
import { MIN_POPULATION } from './skeleton.logic'

export type ValidationError = { townId: string; field: string; message: string }

/** 出発地に依存する表現。事前生成の文面に混ざってはならない（仕様 6.2） */
const ORIGIN_DEPENDENT = [
  '東京から', '東京より', '都心から', '大阪から', '名古屋から', '新宿から',
  '羽田から', '首都圏から', '関西から',
]

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
    for (const phrase of ORIGIN_DEPENDENT) {
      if (tips.includes(phrase)) {
        push('accessTips', `出発地に依存する表現を含む（仕様6.2違反）: ${phrase}`)
      }
    }
  }

  return errors
}
