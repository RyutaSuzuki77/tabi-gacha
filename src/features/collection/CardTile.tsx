import { splitTownName } from '../../domain/townName'
import type { Pull, Town } from '../../domain/types'
import { RARITY_COLOR } from '../../ui/RarityBadge'

/** 集めたカプセルを並べる。四角いカードではなく殻そのものを見せる */
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
  const all = pull.missions.length
  const { town: name } = splitTownName(town.name)
  const complete = done === all && all > 0

  return (
    <button onClick={onSelect} className="flex flex-col items-center gap-2 py-2 text-center">
      <span className="relative block aspect-square w-full max-w-[96px]">
        <span
          className="absolute inset-x-0 top-0 block h-1/2 rounded-t-full"
          style={{
            background: RARITY_COLOR[town.rarity],
            boxShadow: 'inset 0 6px 9px rgba(255,255,255,0.45)',
          }}
        />
        <span
          className="absolute inset-x-0 bottom-0 block h-1/2 rounded-b-full border-t-2 border-black/15"
          style={{ background: 'rgba(255,255,255,0.8)', boxShadow: 'inset 0 -6px 9px rgba(0,0,0,0.1)' }}
        />
        <span className="absolute inset-0 grid place-items-center font-display text-[11px] text-sumi">
          {town.rarity}
        </span>
        {complete && (
          <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-beni text-[11px] text-white">
            ✓
          </span>
        )}
      </span>
      <span className="w-full truncate font-display text-xs">{name}</span>
      <span className="text-[10px] text-kinari/50">
        {town.prefecture.replace(/[都府県]$/, '')}　{done}/{all}
      </span>
    </button>
  )
}
