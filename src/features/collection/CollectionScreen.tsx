import { useState } from 'react'
import { sortPulls, type SortKey } from '../../domain/sort'
import type { Pull, Town } from '../../domain/types'
import { CardTile } from './CardTile'

const LABELS: Record<SortKey, string> = {
  date: 'ひいた順',
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
      <div className="mt-12 text-center">
        <p className="font-display text-xl">まだ からっぽ</p>
        <p className="mt-2 text-sm text-kinari/60">ガチャを引くと、ここにカプセルが並びます。</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        {(Object.keys(LABELS) as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`rounded-full px-4 py-3 text-xs font-bold transition-colors ${
              key === k ? 'bg-kinari text-sumi' : 'bg-ai-mid text-kinari/60'
            }`}
          >
            {LABELS[k]}
          </button>
        ))}
        <span className="ml-auto font-display text-sm text-kinari/70">{pulls.length}</span>
      </div>

      {/* 幅に応じて列数を増やす（仕様 9.1） */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {sortPulls(pulls, key, townById).map((pull) => {
          const town = townById(pull.townId)
          if (!town) return null
          return <CardTile key={pull.id} pull={pull} town={town} onSelect={() => onSelect(pull)} />
        })}
      </div>
    </div>
  )
}
