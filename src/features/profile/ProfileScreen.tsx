import type { ReactNode } from 'react'
import { RANKS, rankFor } from '../../domain/rank'
import { AI_DISCLAIMER, DATA_SOURCES } from '../../data/sources'

export function ProfileScreen({
  total,
  pullCount,
  storageWritable,
  demoPanel,
}: {
  total: number
  pullCount: number
  storageWritable: boolean
  demoPanel: ReactNode
}) {
  const rank = rankFor(total)
  const next = RANKS.find((r) => r.threshold > total)
  const progress = next
    ? Math.round(((total - rank.threshold) / (next.threshold - rank.threshold)) * 100)
    : 100

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <section className="rounded-2xl bg-kinari p-6 text-sumi">
        <p className="font-display text-3xl leading-tight sm:text-4xl">{rank.title}</p>
        <div className="mt-3 flex items-end gap-4">
          <p>
            <span className="font-display text-2xl">{total}</span>
            <span className="ml-1 text-xs text-sumi/60">pt</span>
          </p>
          <p>
            <span className="font-display text-2xl">{pullCount}</span>
            <span className="ml-1 text-xs text-sumi/60">枚</span>
          </p>
        </div>
        {next && (
          <>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sumi/10">
              <div className="h-full rounded-full bg-beni" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-sumi/60">
              「{next.title}」まであと {next.threshold - total}pt
            </p>
          </>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg">称号</h3>
        <ul className="space-y-2">
          {RANKS.map((r) => {
            const reached = total >= r.threshold
            const now = r.title === rank.title
            return (
              <li
                key={r.threshold}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  now ? 'bg-beni text-white' : reached ? 'bg-ai-mid/60' : 'bg-ai-mid/25'
                }`}
              >
                <span className={`font-display text-sm ${reached ? '' : 'text-kinari/35'}`}>
                  {r.threshold}
                </span>
                <span className={`text-sm font-bold ${reached ? '' : 'text-kinari/35'}`}>
                  {r.title}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl bg-ai-deep/60 p-4 text-xs leading-relaxed text-kinari/65">
        <p>
          カードと写真は、この端末の中にだけ保存されます。ブラウザのデータを消すとすべて失われ、別の端末に引き継ぐこともできません。
        </p>
        <p>
          このアプリは位置情報を取得しません。「Googleマップで経路をひらく」を押すと、出発地にはGoogleマップ側が現在地を使います。その扱いはGoogleマップの設定に従います。
        </p>
        {!storageWritable && (
          <p className="rounded-lg bg-ssr/20 px-3 py-2 font-bold text-ssr">
            いま保存ができません。プライベートブラウズか、端末の空き容量が足りない可能性があります。閉じると引いたカードは失われます。
          </p>
        )}
      </section>

      {/* 出典表記。オープンデータの利用規約上の義務なので省略しない（仕様 11.5） */}
      <section className="text-xs leading-relaxed text-kinari/55">
        <h3 className="mb-1 font-display text-sm text-kinari/80">データの出典</h3>
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
