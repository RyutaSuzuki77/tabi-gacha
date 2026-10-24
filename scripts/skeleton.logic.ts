import type { Rng } from '../src/domain/draw'
import { rarityForPopulation } from '../src/domain/rarity'
import { REGIONS, type Rarity, type Region, type Town } from '../src/domain/types'

const PREFECTURE_TO_REGION: Record<string, Region> = {
  北海道: '北海道',
  青森県: '東北', 岩手県: '東北', 宮城県: '東北', 秋田県: '東北', 山形県: '東北', 福島県: '東北',
  茨城県: '関東', 栃木県: '関東', 群馬県: '関東', 埼玉県: '関東', 千葉県: '関東',
  東京都: '関東', 神奈川県: '関東',
  新潟県: '中部', 富山県: '中部', 石川県: '中部', 福井県: '中部', 山梨県: '中部',
  長野県: '中部', 岐阜県: '中部', 静岡県: '中部', 愛知県: '中部',
  三重県: '近畿', 滋賀県: '近畿', 京都府: '近畿', 大阪府: '近畿', 兵庫県: '近畿',
  奈良県: '近畿', 和歌山県: '近畿',
  鳥取県: '中国', 島根県: '中国', 岡山県: '中国', 広島県: '中国', 山口県: '中国',
  徳島県: '四国', 香川県: '四国', 愛媛県: '四国', 高知県: '四国',
  福岡県: '九州沖縄', 佐賀県: '九州沖縄', 長崎県: '九州沖縄', 熊本県: '九州沖縄',
  大分県: '九州沖縄', 宮崎県: '九州沖縄', 鹿児島県: '九州沖縄', 沖縄県: '九州沖縄',
}

/** 三重県は近畿に入れる（仕様4.4の8区分に合わせた割り振り） */
export function regionForPrefecture(prefecture: string): Region | null {
  return PREFECTURE_TO_REGION[prefecture.trim()] ?? null
}

/** 人口0のまま一覧に残る自治体（北方領土の村など）を落とすための下限 */
export const MIN_POPULATION = 100

/**
 * 出題対象から外す名称か（仕様 4.1）。
 *
 * - 「区」で終わる: 特別区（東京23区）と政令市の行政区。市町村で「区」で終わるのは
 *   この2種類だけなので、この条件で両方を確実に落とせる
 * - 「郡」で終わる: e-Stat のデータに含まれる**郡ごとの集計行**。自治体ではない
 *   （例: 秋田県鹿角郡 4,297人 = 構成町村の合計）。実在の自治体名が「郡」で
 *   終わることはなく、郡を含む自治体は「紋別郡西興部村」のように町村名で終わる
 */
export function isExcludedName(name: string): boolean {
  const trimmed = name.trim()
  return trimmed.endsWith('区') || trimmed.endsWith('郡')
}

export function parsePopulation(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '')
  if (!/^\d+$/.test(normalized)) return null
  return Number(normalized)
}

/** 引用符を含まない単純なCSVを前提にしたパーサ */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? '').trim()
    })
    return row
  })
}

export function buildSkeletonTown(row: {
  code: string
  prefecture: string
  name: string
  population: string
}): Town | null {
  const region = regionForPrefecture(row.prefecture)
  if (!region) return null

  if (isExcludedName(row.name)) return null // 特別区・行政区

  const population = parsePopulation(row.population)
  if (population === null) return null
  if (population < MIN_POPULATION) return null // 人口0のまま残る自治体

  const rarity = rarityForPopulation(population)
  if (!rarity) return null // 人口10万人以上は出題対象外

  return {
    id: row.code.trim(),
    name: row.name.trim(),
    prefecture: row.prefecture.trim(),
    region,
    population,
    rarity,
    tags: [],
    uniqueMission: '',
    accessTips: '',
    enriched: false,
  }
}

const ALL_RARITIES: Rarity[] = ['SSR', 'SR', 'R', 'N']

/**
 * 地方×レア度ごとに上限件数まで抽出する（仕様 11.3）。
 * 均等に取るのは、地方モードで候補が少なく同じ町ばかり出るのを防ぐため。
 */
export function curate(towns: Town[], perRegionPerRarity: number, rng: Rng): Town[] {
  const picked: Town[] = []
  for (const region of REGIONS) {
    for (const rarity of ALL_RARITIES) {
      const candidates = towns.filter((t) => t.region === region && t.rarity === rarity)
      const shuffled = shuffle(candidates, rng)
      picked.push(...shuffled.slice(0, perRegionPerRarity))
    }
  }
  return picked
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
