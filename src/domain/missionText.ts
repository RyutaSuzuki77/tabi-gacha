import type { GenericMission, PulledMission, Town } from './types'

/** ミッションの表示文面を解決する。固有は町から、汎用はプールから引く */
export function resolveMissionText(
  mission: PulledMission,
  town: Town,
  generics: GenericMission[],
): string {
  if (mission.kind === 'unique') return town.uniqueMission
  const found = generics.find((g) => g.id === mission.genericMissionId)
  return found?.text ?? '（このミッションは読み込めませんでした）'
}
