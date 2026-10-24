import { useState } from 'react'
import { sortPulls, type SortKey } from '../../domain/sort'
import type { Pull, Town } from '../../domain/types'
import { CardTile } from './CardTile'

const LABELS: Record<SortKey, string> = {
  date: '引いた順',
  rarity: 'レア度',
  region: '地方',
}

export function CollectionScreen({
  pulls,
  townById,
  onSelect,
}: {
  pulls: Pull[]
  townById: (id: string) => Town | undefined
  onSelect: (pull: Pull) => void
}) {
  const [key, setKey] = useState<SortKey>('date')

  if (pulls.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-stone-400">
        まだカードがありません。ガチャを引いてみてください。
      </p>
    )
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(Object.keys(LABELS) as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`rounded-full px-4 py-3 text-xs ${
              key === k ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-500'
            }`}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>

      {/* 幅に応じて列数を増やす（仕様 9.1） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {sortPulls(pulls, key, townById).map((pull) => {
          const town = townById(pull.townId)
          if (!town) return null
          return (
            <CardTile key={pull.id} pull={pull} town={town} onSelect={() => onSelect(pull)} />
          )
        })}
      </div>
    </div>
  )
}
