import type { Rarity } from '../domain/types'

/** レア度の色はカプセルの殻の色。バッジ・演出・コレクションで同じ値を使う */
export const RARITY_COLOR: Record<Rarity, string> = {
  SSR: 'var(--color-ssr)',
  SR: 'var(--color-sr)',
  R: 'var(--color-r)',
  N: 'var(--color-n)',
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className="inline-block rounded-full px-3 py-1 font-display text-xs leading-none text-sumi"
      style={{ background: RARITY_COLOR[rarity] }}
    >
      {rarity}
    </span>
  )
}
