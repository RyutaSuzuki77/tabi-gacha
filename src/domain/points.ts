import { RARITY_POINTS } from './rarity'
import type { Pull, PulledMission, Rarity, Town } from './types'

/** 1回分の獲得ポイント＝レア度 × 達成したミッション数（仕様 7.1） */
export function pointsForPull(rarity: Rarity, missions: PulledMission[]): number {
  const done = missions.filter((m) => m.done).length
  return RARITY_POINTS[rarity] * done
}

/**
 * 累計ポイント。pulls から毎回導出する（保存しない）。
 * 真実の源を1か所にすることで、達成チェックを外したときの整合ずれが起きない。
 */
export function totalPoints(pulls: Pull[], townById: (id: string) => Town | undefined): number {
  return pulls.reduce((sum, pull) => {
    const town = townById(pull.townId)
    if (!town) return sum
    return sum + pointsForPull(town.rarity, pull.missions)
  }, 0)
}
