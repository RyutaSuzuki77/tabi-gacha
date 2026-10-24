import type { ReactNode } from 'react'
import { RANKS, rankFor } from '../../domain/rank'
import { AI_DISCLAIMER, DATA_SOURCES } from '../../data/sources'
import { isStorageAvailable } from '../../storage/schema'

export function ProfileScreen({
  total,
  pullCount,
  demoPanel,
}: {
  total: number
  pullCount: number
  demoPanel: ReactNode
}) {
  const rank = rankFor(total)
  const next = RANKS.find((r) => r.threshold > total)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <section>
        <p className="text-xs text-stone-500">称号</p>
        <p className="text-2xl font-bold">{rank.title}</p>
        <p className="mt-1 text-sm text-stone-500">
          累計 {total}pt ／ カード {pullCount}枚
        </p>
        {next && (
          <p className="mt-1 text-xs text-stone-400">
            次の称号「{next.title}」まであと {next.threshold - total}pt
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold">称号の一覧</h3>
        <ul className="space-y-1 text-sm">
          {RANKS.map((r) => (
            <li
              key={r.threshold}
              className={r.title === rank.title ? 'font-bold' : 'text-stone-400'}
            >
              {r.threshold}pt — {r.title}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-lg bg-stone-50 p-4 text-xs leading-relaxed text-stone-600">
        <p>
          カードと写真は、この端末の中にだけ保存されます。ブラウザのデータを消すとすべて失われ、別の端末に引き継ぐこともできません。
        </p>
        <p>
          現在地は、行き方を調べるときの「出発地」として使います。このアプリにサーバーはないので、現在地がどこかに保存されることはありません。経路を開く操作をしたときだけ、出発地としてGoogleマップに渡されます。
        </p>
        {!isStorageAvailable() && (
          <p className="font-bold text-amber-700">
            このブラウザでは保存ができません。閉じると引いたカードは失われます。
          </p>
        )}
      </section>

      {/* 出典表記。オープンデータの利用規約上の義務なので省略しない（仕様 11.5） */}
      <section className="text-xs leading-relaxed text-stone-500">
        <h3 className="mb-1 font-bold text-stone-600">データの出典</h3>
        <p>町名・人口のデータは、次の統計を加工して作成しています。</p>
        <ul className="mt-1 space-y-0.5">
          {DATA_SOURCES.map((source) => (
            <li key={source.label}>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                  {source.label}
                </a>
              ) : (
                source.label
              )}
              （{source.publisher}）
              {source.noteModified && 'をもとに作成'}
            </li>
          ))}
        </ul>
        <p className="mt-2">{AI_DISCLAIMER}</p>
      </section>

      {demoPanel}
    </div>
  )
}
