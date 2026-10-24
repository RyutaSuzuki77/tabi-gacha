import type { Rarity } from '../domain/types'

const STYLE: Record<Rarity, string> = {
  SSR: 'bg-amber-400 text-amber-950',
  SR: 'bg-violet-400 text-violet-950',
  R: 'bg-sky-400 text-sky-950',
  N: 'bg-stone-300 text-stone-700',
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold ${STYLE[rarity]}`}>{rarity}</span>
  )
}
