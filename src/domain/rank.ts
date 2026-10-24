export type Rank = { threshold: number; title: string }

export const RANKS: readonly Rank[] = [
  { threshold: 0, title: '旅の見習い' },
  { threshold: 100, title: '寄り道の人' },
  { threshold: 500, title: '旅人' },
  { threshold: 1500, title: '辺境の開拓者' },
  { threshold: 5000, title: '日本を踏み尽くす者' },
] as const

/** 累計ポイントに対応する称号。閾値を下回らない最大のランクを返す */
export function rankFor(total: number): Rank {
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (total >= rank.threshold) current = rank
  }
  return current
}
