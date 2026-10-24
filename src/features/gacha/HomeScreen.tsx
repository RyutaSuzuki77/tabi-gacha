import { useState } from 'react'
import type { DrawMode } from '../../domain/pool'
import { REGIONS, type Region } from '../../domain/types'
import { PoolNotice } from './PoolNotice'

export function HomeScreen({
  canDraw,
  rankTitle,
  total,
  onDraw,
}: {
  canDraw: boolean
  rankTitle: string
  total: number
  onDraw: (mode: DrawMode) => void
}) {
  const [region, setRegion] = useState<Region | 'all'>('all')
  const mode: DrawMode = region === 'all' ? { kind: 'nationwide' } : { kind: 'region', region }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <label className="mb-6 block">
        <span className="mb-1 block text-xs text-stone-500">どこから引く</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region | 'all')}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2"
        >
          <option value="all">全国</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <button
        onClick={() => onDraw(mode)}
        disabled={!canDraw}
        className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-stone-900 text-xl font-bold text-white disabled:bg-stone-300"
      >
        引く
      </button>

      <p className="mt-6 text-center text-sm text-stone-500">
        {canDraw ? '今日はまだ引けます' : '今日はもう引きました'}
        <span className="mx-2">·</span>
        {rankTitle}（{total}pt）
      </p>

      <PoolNotice />
    </div>
  )
}
