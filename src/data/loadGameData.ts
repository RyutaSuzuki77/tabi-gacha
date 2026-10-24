import type { GenericMission, Town } from '../domain/types'

export async function loadGameData(): Promise<{ towns: Town[]; genericMissions: GenericMission[] }> {
  const [townsRes, missionsRes] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/towns.json`),
    fetch(`${import.meta.env.BASE_URL}data/generic-missions.json`),
  ])
  if (!townsRes.ok || !missionsRes.ok) throw new Error('町データの読み込みに失敗しました')
  return {
    towns: (await townsRes.json()) as Town[],
    genericMissions: (await missionsRes.json()) as GenericMission[],
  }
}
