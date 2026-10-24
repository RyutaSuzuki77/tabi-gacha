import type { Rarity } from '../../domain/types'
import { RARITY_COLOR } from '../../ui/RarityBadge'
import { Capsule } from './Capsule'

/** ドームに詰まって見えるカプセル。位置と色は固定（毎描画で動くと安っぽい） */
const PACKED: { x: number; y: number; s: number; c: Rarity }[] = [
  { x: 18, y: 58, s: 22, c: 'R' },
  { x: 42, y: 66, s: 25, c: 'N' },
  { x: 66, y: 60, s: 21, c: 'SR' },
  { x: 30, y: 40, s: 20, c: 'N' },
  { x: 55, y: 42, s: 23, c: 'R' },
  { x: 76, y: 38, s: 18, c: 'N' },
  { x: 14, y: 36, s: 17, c: 'SSR' },
  { x: 44, y: 24, s: 19, c: 'R' },
  { x: 66, y: 20, s: 16, c: 'N' },
  { x: 26, y: 18, s: 15, c: 'SR' },
]

export type MachinePhase = 'idle' | 'turning' | 'dropping' | 'waiting' | 'cracking'

export function GachaMachine({
  phase,
  rarity,
  disabled,
  onTurn,
  onOpen,
}: {
  phase: MachinePhase
  rarity: Rarity | null
  disabled: boolean
  onTurn: () => void
  onOpen: () => void
}) {
  const shaking = phase === 'turning'
  const inTray = phase === 'dropping' || phase === 'waiting' || phase === 'cracking'

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* アクリルドーム */}
      <div
        className={`relative mx-auto aspect-square w-[86%] rounded-full border-[6px] border-kinari/90 ${
          shaking ? 'anim-dome' : ''
        }`}
        style={{ background: 'rgba(255,255,255,0.14)' }}
      >
        {PACKED.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.s}%`,
              aspectRatio: '1',
              background: RARITY_COLOR[p.c],
              boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.5)',
            }}
          />
        ))}
        <div className="dome-gloss pointer-events-none absolute inset-0 rounded-full" />
      </div>

      {/* 機体 */}
      <div className="-mt-6 rounded-[28px] bg-beni px-5 pb-5 pt-10 shadow-[0_16px_0_0_var(--color-beni-dark)]">
        {/* ノブ */}
        <button
          onClick={onTurn}
          disabled={disabled || phase !== 'idle'}
          aria-label="ガチャを引く"
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-kinari
                     shadow-[inset_0_-5px_0_0_var(--color-kinari-dim)]
                     transition-transform active:scale-95 disabled:opacity-45"
        >
          <span
            className={`block h-[72px] w-[14px] rounded-full bg-sumi/85 ${
              phase === 'turning' ? 'anim-knob' : ''
            }`}
            style={phase !== 'idle' && phase !== 'turning' ? { transform: 'rotate(90deg)' } : undefined}
          />
        </button>

        <p className="mt-4 text-center font-display text-lg text-white">
          {phase === 'idle' ? 'まわす' : phase === 'turning' ? 'ごとん…' : ''}
        </p>

        {/* 取出口 */}
        <div
          className="relative mt-3 flex h-28 items-end justify-center overflow-hidden rounded-2xl
                     bg-ai-deep/80 shadow-[inset_0_6px_14px_rgba(0,0,0,0.55)]"
        >
          {inTray && rarity && (
            <div className="relative mb-4 flex items-center justify-center">
              {phase === 'cracking' && (
                <span
                  className="burst-lines anim-burst pointer-events-none absolute h-56 w-56 rounded-full"
                  style={{ color: RARITY_COLOR[rarity] }}
                />
              )}
              <button
                onClick={onOpen}
                disabled={phase !== 'waiting'}
                aria-label="カプセルをあける"
                className={`relative ${phase === 'dropping' ? 'anim-drop' : ''} ${
                  phase === 'waiting' ? 'anim-breathe' : ''
                }`}
              >
                <Capsule rarity={rarity} size={72} cracking={phase === 'cracking'} />
              </button>
            </div>
          )}
        </div>

        {phase === 'waiting' && (
          <p className="mt-3 animate-pulse text-center font-display text-sm text-white">
            カプセルをタップ
          </p>
        )}
      </div>
    </div>
  )
}
