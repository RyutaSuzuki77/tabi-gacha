import type { Pull } from '../domain/types'
import { KEYS, readJson, writeJson } from './schema'

/** 新しい順に並んだ pulls を返す */
export function loadPulls(): Pull[] {
  const stored = readJson<unknown>(KEYS.pulls, [])
  return Array.isArray(stored) ? (stored as Pull[]) : []
}

function save(pulls: Pull[]): Pull[] {
  writeJson(KEYS.pulls, pulls)
  return pulls
}

/** 先頭に追加する（同じ町でも別レコードとして積む） */
export function addPull(pull: Pull): Pull[] {
  return save([pull, ...loadPulls()])
}

/** ミッションの達成状況を切り替える。存在しない指定は黙って無視する */
export function setMissionDone(pullId: string, index: number, done: boolean): Pull[] {
  const pulls = loadPulls().map((pull) => {
    if (pull.id !== pullId) return pull
    if (index < 0 || index >= pull.missions.length) return pull
    const missions = pull.missions.map((m, i) => (i === index ? { ...m, done } : m))
    return { ...pull, missions }
  })
  return save(pulls)
}
