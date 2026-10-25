import { useEffect, useRef, useState } from 'react'
import type { DrawMode } from '../../domain/pool'
import { REGIONS, type Pull, type Rarity, type Region } from '../../domain/types'
import { GachaMachine, type MachinePhase } from './GachaMachine'
import { PoolNotice } from './PoolNotice'

const TURN_MS = 620
const DROP_MS = 900
const CRACK_MS = 560

export function HomeScreen({
  canDraw,
  rankTitle,
  total,
  demoActive,
  onDraw,
  rarityOf,
  onRevealed,
}: {
  canDraw: boolean
  rankTitle: string
  total: number
  demoActive: boolean
  onDraw: (mode: DrawMode) => Pull | null
  rarityOf: (pull: Pull) => Rarity | undefined
  onRevealed: (pull: Pull) => void
}) {
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [phase, setPhase] = useState<MachinePhase>('idle')
  const [pull, setPull] = useState<Pull | null>(null)
  const [noTown, setNoTown] = useState(false)

  // 引けない状態になったら落とす。残すと、翌日に引ける状態へ戻ったとき古い文面が出る
  useEffect(() => {
    if (!canDraw) setNoTown(false)
  }, [canDraw])

  // コールバックは ref で持つ。依存に入れると演出中の再描画でタイマーが振り出しに戻る
  const onRevealedRef = useRef(onRevealed)
  onRevealedRef.current = onRevealed

  useEffect(() => {
    if (phase === 'turning') {
      const t = setTimeout(() => setPhase('dropping'), TURN_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'dropping') {
      const t = setTimeout(() => setPhase('waiting'), DROP_MS)
      return () => clearTimeout(t)
    }
    if (phase === 'cracking') {
      const t = setTimeout(() => {
        if (pull) onRevealedRef.current(pull)
        setPhase('idle')
        setPull(null)
      }, CRACK_MS)
      return () => clearTimeout(t)
    }
  }, [phase, pull])

  function handleTurn() {
    const mode: DrawMode = region === 'all' ? { kind: 'nationwide' } : { kind: 'region', region }
    const drawn = onDraw(mode)
    if (!drawn) {
      // 押せる状態で抽選が空振りしたのは、条件に合う町がなかったとき
      if (canDraw) setNoTown(true)
      return
    }
    setNoTown(false)
    setPull(drawn)
    setPhase('turning')
  }

  const rarity = pull ? rarityOf(pull) ?? null : null
  const busy = phase !== 'idle'

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => {
            setRegion('all')
            setNoTown(false)
          }}
          disabled={busy}
          className={`rounded-full px-5 py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
            region === 'all' ? 'bg-kinari text-sumi' : 'bg-ai-mid text-kinari/70'
          }`}
        >
          全国
        </button>
        <div className="relative flex-1">
          <select
            value={region === 'all' ? '' : region}
            onChange={(e) => {
              setRegion((e.target.value || 'all') as Region | 'all')
              setNoTown(false)
            }}
            disabled={busy}
            className={`w-full appearance-none rounded-full py-3 pl-5 pr-10 text-sm font-bold
                        disabled:opacity-50 ${
                          region === 'all' ? 'bg-ai-mid text-kinari/70' : 'bg-kinari text-sumi'
                        }`}
          >
            <option value="">地方をえらぶ</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs">▾</span>
        </div>
      </div>

      <GachaMachine
        phase={phase}
        rarity={rarity}
        disabled={!canDraw}
        onTurn={handleTurn}
        onOpen={() => setPhase('cracking')}
      />

      <div className="mt-6 text-center">
        <p className="font-display text-base">
          {canDraw ? '' : '今日は引けません'}
        </p>
        <p className="mt-1 text-xs text-kinari/60">
          {rankTitle}　{total}pt
        </p>
        {noTown && canDraw && (
          <p role="status" className="mt-3 text-xs leading-relaxed text-ssr">
            この条件では引ける町がありませんでした。モードを変えて試してください。
          </p>
        )}
        {demoActive && (
          <p className="mt-2 inline-block rounded-full bg-ssr px-3 py-1 text-xs font-bold text-sumi">
            デモモードが有効
          </p>
        )}
      </div>

      <PoolNotice />
    </div>
  )
}
