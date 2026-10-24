import type { Rng } from './draw'
import type { GenericMission, PulledMission } from './types'

/** 町のタグで成立する汎用ミッションだけを残す（仕様 5.2） */
export function eligibleMissions(pool: GenericMission[], townTags: string[]): GenericMission[] {
  return pool.filter((m) => m.requiredTags.every((tag) => townTags.includes(tag)))
}

/**
 * 汎用ミッションを重複なく引く。
 * 成立する候補が足りない場合は、条件なしのミッション（requiredTags が空）で補う。
 * それでも足りなければ、あるだけ返す（同じミッションを2枚並べない）。
 */
export function drawGenericMissions(
  pool: GenericMission[],
  townTags: string[],
  rng: Rng,
  count = 2,
): GenericMission[] {
  const candidates = [...eligibleMissions(pool, townTags)]
  const unconditional = pool.filter((m) => m.requiredTags.length === 0)
  for (const m of unconditional) {
    if (!candidates.some((c) => c.id === m.id)) candidates.push(m)
  }

  const picked: GenericMission[] = []
  while (picked.length < count && candidates.length > 0) {
    const index = Math.min(Math.floor(rng() * candidates.length), candidates.length - 1)
    picked.push(candidates.splice(index, 1)[0])
  }
  return picked
}

/** 固有1枚を固定枠として先頭に置き、汎用を続ける（仕様 5.1） */
export function buildPulledMissions(generics: GenericMission[]): PulledMission[] {
  return [
    { kind: 'unique', genericMissionId: null, done: false },
    ...generics.map((m) => ({
      kind: 'generic' as const,
      genericMissionId: m.id,
      done: false,
    })),
  ]
}
