import { useState } from 'react'
import { RARITY_WEIGHTS } from '../../domain/rarity'
import type { Rarity } from '../../domain/types'

const POPULATION_LABEL: Record<Rarity, string> = {
  SSR: '3,000人未満',
  SR: '3,000〜1万人',
  R: '1万〜3万人',
  N: '3万〜10万人',
}

export function PoolNotice() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mt-6 border-t border-stone-200 pt-4 text-xs text-stone-500">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <span>有名な街は入っていません ― 出るのは人口10万人未満の市町村だけ</span>
        <span className="shrink-0">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 leading-relaxed">
          <p>
            旅ガチャには、人口10万人未満の市町村だけが入っています。知名度の高い街をあらかじめ外すことで、何を引いても「行ったことのない町」になるようにしました。
          </p>
          <p>
            そして、人口が少ない町ほどレアに出ます。このガチャでは<strong className="text-stone-700">無名であることが価値</strong>です。
          </p>
          <table className="w-full text-left">
            <thead className="text-stone-400">
              <tr><th className="py-1">レア度</th><th className="py-1">人口</th><th className="py-1">排出率</th></tr>
            </thead>
            <tbody>
              {(['SSR', 'SR', 'R', 'N'] as Rarity[]).map((r) => (
                <tr key={r} className="border-t border-stone-100">
                  <td className="py-1 font-bold text-stone-700">{r}</td>
                  <td className="py-1">{POPULATION_LABEL[r]}</td>
                  <td className="py-1">{RARITY_WEIGHTS[r]}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
