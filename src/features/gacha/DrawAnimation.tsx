import { useEffect, useState } from 'react'
import type { Rarity } from '../../domain/types'
import { RarityBadge } from '../../ui/RarityBadge'

const GLOW: Record<Rarity, string> = {
  SSR: 'shadow-[0_0_60px_rgba(251,191,36,0.9)]',
  SR: 'shadow-[0_0_48px_rgba(167,139,250,0.8)]',
  R: 'shadow-[0_0_36px_rgba(56,189,248,0.7)]',
  N: 'shadow-[0_0_24px_rgba(168,162,158,0.6)]',
}

/** 1.4秒で開封。画面を押せば即座に飛ばせる */
export function DrawAnimation({ rarity, onDone }: { rarity: Rarity; onDone: () => void }) {
  const [phase, setPhase] = useState<'spin' | 'reveal'>('spin')

  useEffect(() => {
    const toReveal = setTimeout(() => setPhase('reveal'), 900)
    const toDone = setTimeout(onDone, 1400)
    return () => {
      clearTimeout(toReveal)
      clearTimeout(toDone)
    }
  }, [onDone])

  return (
    <button
      onClick={onDone}
      className="flex flex-1 flex-col items-center justify-center gap-6"
      aria-label="演出を飛ばす"
    >
      <div
        className={`flex h-40 w-40 items-center justify-center rounded-full bg-stone-900 transition-all duration-500 ${
          phase === 'spin' ? 'animate-spin-slow' : `scale-110 ${GLOW[rarity]}`
        }`}
      >
        {phase === 'reveal' && <RarityBadge rarity={rarity} />}
      </div>
      <p className="text-sm text-stone-400">
        {phase === 'spin' ? '行き先を選んでいます…' : '決まりました'}
      </p>
    </button>
  )
}
