import { useState } from 'react'
import { RARITY_WEIGHTS } from '../../domain/rarity'
import type { Rarity } from '../../domain/types'
import { RARITY_COLOR } from '../../ui/RarityBadge'

const POPULATION_LABEL: Record<Rarity, string> = {
  SSR: '3,000人未満',
  SR: '3,000〜10,000人未満',
  R: '10,000〜30,000人未満',
  N: '30,000〜100,000人未満',
}

export function PoolNotice() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mt-8 rounded-2xl bg-ai-deep/60 px-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 py-4 text-left text-xs text-kinari/70"
      >
        <span>有名な街は入っていません ― 出るのは人口10万人未満の市町村だけ</span>
        <span className="shrink-0 pt-0.5">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="space-y-3 pb-5 text-xs leading-relaxed text-kinari/70">
          <p>
            旅ガチャには、人口10万人未満の市町村だけが入っています。知名度の高い街をあらかじめ外すことで、何を引いても「行ったことのない町」になるようにしました。
          </p>
          <p>
            そして、人口が少ない町ほどレアに出ます。このガチャでは
            <strong className="font-display text-kinari">無名であることが価値</strong>です。
          </p>
          <ul className="space-y-1.5 pt-1">
            {(['SSR', 'SR', 'R', 'N'] as Rarity[]).map((r) => (
              <li key={r} className="flex items-center gap-3">
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[10px] text-sumi"
                  style={{ background: RARITY_COLOR[r] }}
                >
                  {r}
                </span>
                <span className="flex-1">{POPULATION_LABEL[r]}</span>
                <span className="font-display text-sm text-kinari">{RARITY_WEIGHTS[r]}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
