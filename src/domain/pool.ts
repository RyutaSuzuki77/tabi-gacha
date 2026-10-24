import type { Region, Town } from './types'

export type DrawMode = { kind: 'nationwide' } | { kind: 'region'; region: Region }

/**
 * 抽選対象の町を絞り込む。
 * 人口10万人以上はデータ生成の段階で除外済みのため、ここでは扱わない。
 */
export function poolFor(towns: Town[], mode: DrawMode): Town[] {
  const enriched = towns.filter((t) => t.enriched)
  if (mode.kind === 'nationwide') return enriched
  return enriched.filter((t) => t.region === mode.region)
}
