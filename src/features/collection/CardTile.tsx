import type { Pull, Town } from '../../domain/types'
import { RarityBadge } from '../../ui/RarityBadge'

export function CardTile({
  pull,
  town,
  onSelect,
}: {
  pull: Pull
  town: Town
  onSelect: () => void
}) {
  const done = pull.missions.filter((m) => m.done).length
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-start gap-1 rounded-lg border border-stone-200 p-3 text-left"
    >
      <RarityBadge rarity={town.rarity} />
      <span className="font-bold">{town.name}</span>
      <span className="text-xs text-stone-500">{town.prefecture}</span>
      <span className="text-xs text-stone-400">
        ミッション {done}/{pull.missions.length}
      </span>
    </button>
  )
}
