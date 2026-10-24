import type { Rarity } from '../../domain/types'
import { RARITY_COLOR } from '../../ui/RarityBadge'

/**
 * ガチャのカプセル。上半分がレア度の色、下半分が半透明の殻。
 * `cracking` で上下の殻が左右に飛ぶ。
 */
export function Capsule({
  rarity,
  size,
  cracking,
}: {
  rarity: Rarity
  size: number
  cracking: boolean
}) {
  const color = RARITY_COLOR[rarity]
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className={`absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-full ${
          cracking ? 'anim-shell-l' : ''
        }`}
        style={{ background: color, boxShadow: 'inset 0 6px 10px rgba(255,255,255,0.5)' }}
      />
      <div
        className={`absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-full border-t-2 border-black/15 ${
          cracking ? 'anim-shell-r' : ''
        }`}
        style={{
          background: 'rgba(255,255,255,0.82)',
          boxShadow: 'inset 0 -6px 10px rgba(0,0,0,0.12)',
        }}
      />
    </div>
  )
}
