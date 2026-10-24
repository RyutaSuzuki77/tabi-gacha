export type Rarity = 'SSR' | 'SR' | 'R' | 'N'

export type Region =
  | '北海道' | '東北' | '関東' | '中部' | '近畿' | '中国' | '四国' | '九州沖縄'

export const REGIONS: readonly Region[] = [
  '北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州沖縄',
] as const

export interface Town {
  id: string
  name: string
  prefecture: string
  region: Region
  population: number
  rarity: Rarity
  tags: string[]
  uniqueMission: string
  accessTips: string
  /** 固有ミッションと行き方のコツが生成済みか。false の町は抽選対象外（仕様 11.3） */
  enriched: boolean
}

export interface GenericMission {
  id: string
  text: string
  /** 空配列なら無条件に成立する（仕様 5.2） */
  requiredTags: string[]
}

export interface PulledMission {
  kind: 'unique' | 'generic'
  /** kind === 'unique' のときは null。固有ミッションは townId から引けるため文面を持たない */
  genericMissionId: string | null
  done: boolean
}

export interface Pull {
  id: string
  memberId: string
  townId: string
  pulledAt: string
  missions: PulledMission[]
}

export interface Photo {
  id: string
  pullId: string
  blob: Blob
  takenAt: string
}

export interface Profile {
  memberId: string
  lastDrawnAt: string | null
  schemaVersion: number
}
